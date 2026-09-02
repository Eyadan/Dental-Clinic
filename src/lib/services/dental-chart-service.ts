import type { SupabaseClient } from "@supabase/supabase-js";
import type { DentalChart, ToothPresence, ToothFinding, DentalChartHistory, DentalChartSnapshot, SnapshotData } from "@/lib/types/database";
import type { DentalChartMetaInput, ToothFindingInput, ToothPresenceInput } from "@/lib/validations/dental-chart.schema";
import { BaseService } from "./base-service";

export interface FullDentalChart {
  chart: DentalChart;
  presence: ToothPresence[];
  findings: ToothFinding[];
}

export class DentalChartService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async getChart(patientId: string): Promise<DentalChart | null> {
    const { data, error } = await this.supabase
      .from("dental_charts")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (error) this.handleError(error);

    return data;
  }

  async ensureChart(patientId: string): Promise<DentalChart> {
    const existing = await this.getChart(patientId);
    if (existing) return existing;

    const { data, error } = await this.supabase
      .from("dental_charts")
      .insert({ patient_id: patientId })
      .select()
      .single();

    if (error) this.handleError(error);

    return data;
  }

  async getPresence(dentalChartId: string): Promise<ToothPresence[]> {
    const { data, error } = await this.supabase
      .from("tooth_presence")
      .select("*")
      .eq("dental_chart_id", dentalChartId)
      .order("tooth_number");

    if (error) this.handleError(error);

    return data ?? [];
  }

  async getFindings(dentalChartId: string): Promise<ToothFinding[]> {
    const { data, error } = await this.supabase
      .from("tooth_findings")
      .select("*, finding_surfaces(*)")
      .eq("dental_chart_id", dentalChartId)
      .order("tooth_number");

    if (error) this.handleError(error);

    return data ?? [];
  }

  async getFullChart(patientId: string): Promise<FullDentalChart> {
    const chart = await this.ensureChart(patientId);
    const [presence, findings] = await Promise.all([
      this.getPresence(chart.id),
      this.getFindings(chart.id),
    ]);
    return { chart, presence, findings };
  }

  async updateChartMeta(
    patientId: string,
    data: DentalChartMetaInput,
    updatedBy: string,
  ): Promise<DentalChart> {
    const chart = await this.ensureChart(patientId);

    const { data: result, error } = await this.supabase
      .from("dental_charts")
      .update({ ...data, updated_by: updatedBy })
      .eq("id", chart.id)
      .select()
      .single();

    if (error) this.handleError(error);

    return result;
  }

  async upsertPresence(
    dentalChartId: string,
    input: ToothPresenceInput,
    updatedBy: string,
  ): Promise<ToothPresence> {
    const { data: existing } = await this.supabase
      .from("tooth_presence")
      .select("id")
      .eq("dental_chart_id", dentalChartId)
      .eq("tooth_number", input.tooth_number)
      .maybeSingle();

    const { data, error } = await this.supabase
      .from("tooth_presence")
      .upsert(
        {
          id: existing?.id,
          dental_chart_id: dentalChartId,
          tooth_number: input.tooth_number,
          presence: input.presence,
          updated_by: updatedBy,
        },
        { onConflict: "dental_chart_id,tooth_number" },
      )
      .select()
      .single();

    if (error) this.handleError(error);

    return data;
  }

  async addFinding(
    dentalChartId: string,
    input: ToothFindingInput,
    updatedBy: string,
  ): Promise<ToothFinding> {
    const { data: finding, error: findingError } = await this.supabase
      .from("tooth_findings")
      .insert({
        dental_chart_id: dentalChartId,
        tooth_number: input.tooth_number,
        category: input.category,
        code: input.code,
        notes: input.notes ?? null,
        updated_by: updatedBy,
      })
      .select()
      .single();

    if (findingError) this.handleError(findingError);

    if (input.surfaces.length > 0) {
      const surfaceRows = input.surfaces.map((surface) => ({
        finding_id: finding.id,
        surface,
      }));
      const { error: surfaceError } = await this.supabase
        .from("finding_surfaces")
        .insert(surfaceRows);

      if (surfaceError) this.handleError(surfaceError);
    }

    const { data: fullFinding, error: refetchError } = await this.supabase
      .from("tooth_findings")
      .select("*, finding_surfaces(*)")
      .eq("id", finding.id)
      .single();

    if (refetchError) this.handleError(refetchError);

    return fullFinding;
  }

  async updateFindingSurfaces(
    findingId: string,
    surfaces: ToothFindingInput["surfaces"],
  ): Promise<void> {
    await this.supabase
      .from("finding_surfaces")
      .delete()
      .eq("finding_id", findingId);

    if (surfaces.length > 0) {
      const { error } = await this.supabase
        .from("finding_surfaces")
        .insert(surfaces.map((surface) => ({ finding_id: findingId, surface })));

      if (error) this.handleError(error);
    }
  }

  async deleteFinding(findingId: string): Promise<void> {
    const { error } = await this.supabase
      .from("tooth_findings")
      .delete()
      .eq("id", findingId);

    if (error) this.handleError(error);
  }

  async deleteAllFindingsForTooth(
    dentalChartId: string,
    toothNumber: number,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("tooth_findings")
      .delete()
      .eq("dental_chart_id", dentalChartId)
      .eq("tooth_number", toothNumber);

    if (error) this.handleError(error);
  }

  // ── Snapshot Methods ──

  async createSnapshot(
    dentalChartId: string,
    appointmentId: string,
    createdBy: string,
  ): Promise<DentalChartSnapshot> {
    const { chart, presence, findings } = await this.getFullChartById(dentalChartId);

    const snapshotData: SnapshotData = { chart, presence, findings };

    const { data, error } = await this.supabase
      .from("dental_chart_snapshots")
      .insert({
        dental_chart_id: dentalChartId,
        appointment_id: appointmentId,
        snapshot_data: snapshotData as unknown as Record<string, unknown>,
        created_by: createdBy,
      })
      .select("*")
      .single();

    if (error) this.handleError(error);

    return data;
  }

  async getSnapshots(dentalChartId: string): Promise<DentalChartSnapshot[]> {
    const { data, error } = await this.supabase
      .from("dental_chart_snapshots")
      .select("*")
      .eq("dental_chart_id", dentalChartId)
      .order("created_at", { ascending: false });

    if (error) this.handleError(error);

    return data ?? [];
  }

  async getSnapshotById(snapshotId: string): Promise<DentalChartSnapshot | null> {
    const { data, error } = await this.supabase
      .from("dental_chart_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .maybeSingle();

    if (error) this.handleError(error);

    return data;
  }

  // ── History Methods ──

  async getChartHistory(dentalChartId: string): Promise<DentalChartHistory[]> {
    const { data, error } = await this.supabase
      .from("dental_chart_history")
      .select("*")
      .eq("dental_chart_id", dentalChartId)
      .order("changed_at", { ascending: false });

    if (error) this.handleError(error);

    return data ?? [];
  }

  // ── Private Helpers ──

  private async getFullChartById(dentalChartId: string): Promise<FullDentalChart> {
    const { data: chart, error: chartError } = await this.supabase
      .from("dental_charts")
      .select("*")
      .eq("id", dentalChartId)
      .single();

    if (chartError) this.handleError(chartError);

    const [presence, findings] = await Promise.all([
      this.getPresence(dentalChartId),
      this.getFindings(dentalChartId),
    ]);

    return { chart, presence, findings };
  }
}
