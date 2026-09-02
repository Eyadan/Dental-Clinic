"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { DentalChartService, type FullDentalChart } from "@/lib/services/dental-chart-service";
import {
  dentalChartMetaSchema,
  toothFindingInputSchema,
  toothPresenceInputSchema,
} from "@/lib/validations/dental-chart.schema";
import type { ServiceResult } from "@/lib/services/base-service";
import type { DentalChart, ToothPresence, ToothFinding, DentalChartHistory, DentalChartSnapshot } from "@/lib/types/database";
import type { ToothFindingInput } from "@/lib/validations/dental-chart.schema";

export async function getDentalChartAction(
  patientId: string,
): Promise<ServiceResult<FullDentalChart>> {
  try {
    const supabase = await createServerSupabaseClient();
    const service = new DentalChartService(supabase);
    const result = await service.getFullChart(patientId);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load dental chart",
    };
  }
}

export async function updateDentalChartMetaAction(
  patientId: string,
  data: unknown,
): Promise<ServiceResult<DentalChart>> {
  const parsed = dentalChartMetaSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const service = new DentalChartService(supabase);
    const chart = await service.updateChartMeta(patientId, parsed.data, user.id);

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: chart };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update dental chart",
    };
  }
}

export async function upsertPresenceAction(
  patientId: string,
  input: unknown,
): Promise<ServiceResult<ToothPresence>> {
  const parsed = toothPresenceInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const service = new DentalChartService(supabase);
    const chart = await service.ensureChart(patientId);
    const presence = await service.upsertPresence(chart.id, parsed.data, user.id);

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: presence };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update tooth presence",
    };
  }
}

export async function addFindingAction(
  patientId: string,
  input: unknown,
): Promise<ServiceResult<ToothFinding>> {
  const parsed = toothFindingInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const service = new DentalChartService(supabase);
    const chart = await service.ensureChart(patientId);
    const finding = await service.addFinding(chart.id, parsed.data, user.id);

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: finding };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add finding",
    };
  }
}

export async function updateFindingSurfacesAction(
  patientId: string,
  findingId: string,
  surfaces: string[],
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const service = new DentalChartService(supabase);
    await service.updateFindingSurfaces(findingId, surfaces as ToothFindingInput["surfaces"]);

    revalidatePath(`/patients/${patientId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update finding surfaces",
    };
  }
}

export async function deleteFindingAction(
  patientId: string,
  findingId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const service = new DentalChartService(supabase);
    await service.deleteFinding(findingId);

    revalidatePath(`/patients/${patientId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete finding",
    };
  }
}

export async function clearToothAction(
  patientId: string,
  toothNumber: number,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const service = new DentalChartService(supabase);
    const chart = await service.ensureChart(patientId);
    await service.deleteAllFindingsForTooth(chart.id, toothNumber);

    revalidatePath(`/patients/${patientId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear tooth",
    };
  }
}

// ── Snapshot & History Actions ──

export async function createSnapshotAction(
  patientId: string,
  appointmentId: string,
): Promise<ServiceResult<DentalChartSnapshot>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const service = new DentalChartService(supabase);
    const chart = await service.ensureChart(patientId);
    const snapshot = await service.createSnapshot(chart.id, appointmentId, user.id);

    return { success: true, data: snapshot };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create snapshot",
    };
  }
}

export async function getSnapshotsAction(
  patientId: string,
): Promise<ServiceResult<DentalChartSnapshot[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const service = new DentalChartService(supabase);
    const chart = await service.ensureChart(patientId);
    const snapshots = await service.getSnapshots(chart.id);

    return { success: true, data: snapshots };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load snapshots",
    };
  }
}

export async function getChartHistoryAction(
  patientId: string,
): Promise<ServiceResult<DentalChartHistory[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const service = new DentalChartService(supabase);
    const chart = await service.ensureChart(patientId);
    const history = await service.getChartHistory(chart.id);

    return { success: true, data: history };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load chart history",
    };
  }
}
