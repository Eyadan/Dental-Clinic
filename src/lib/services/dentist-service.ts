import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dentist, DentistSchedule, DentistBlock } from "@/lib/types/database";
import type { DentistScheduleData } from "@/lib/validations";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import { BaseService } from "./base-service";

export class DentistService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async getAllDentists(): Promise<Dentist[]> {
    const { data, error } = await this.supabase
      .from("dentists")
      .select("*, users(first_name, last_name)")
      .eq("is_active", true)
      .order("created_at");

    if (error) this.handleError(error);

    return (data ?? []).map((d: Record<string, unknown>) => {
      const userObj = getSingleJoined<{
        first_name: string;
        last_name: string;
      }>(d.users);
      const fullName = userObj ? `${userObj.first_name} ${userObj.last_name}` : "";
      return { ...d, full_name: fullName } as Dentist;
    });
  }

  async getDentistById(id: string): Promise<Dentist | null> {
    const { data, error } = await this.supabase
      .from("dentists")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data;
  }

  async getSchedules(dentistId: string): Promise<DentistSchedule[]> {
    const { data, error } = await this.supabase
      .from("dentist_schedules")
      .select("*")
      .eq("dentist_id", dentistId)
      .order("day_of_week");

    if (error) this.handleError(error);

    return data ?? [];
  }

  async createSchedule(data: DentistScheduleData): Promise<DentistSchedule> {
    const { data: result, error } = await this.supabase
      .from("dentist_schedules")
      .insert(data)
      .select()
      .single();

    if (error) this.handleError(error);

    return result;
  }

  async updateSchedule(id: string, data: Partial<DentistScheduleData>): Promise<DentistSchedule> {
    const { data: result, error } = await this.supabase
      .from("dentist_schedules")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);

    return result;
  }

  async deleteSchedule(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("dentist_schedules")
      .delete()
      .eq("id", id);

    if (error) this.handleError(error);
  }

  async getBlocks(dentistId: string): Promise<DentistBlock[]> {
    const { data, error } = await this.supabase
      .from("dentist_blocks")
      .select("*")
      .eq("dentist_id", dentistId)
      .order("start_datetime", { ascending: false });

    if (error) this.handleError(error);

    return data ?? [];
  }

  async createBlock(data: {
    dentist_id: string;
    start_datetime: string;
    end_datetime: string;
    block_type: string;
    recurrence_rule: string;
    reason?: string;
  }): Promise<DentistBlock> {
    const { data: result, error } = await this.supabase
      .from("dentist_blocks")
      .insert(data)
      .select()
      .single();

    if (error) this.handleError(error);

    return result;
  }

  async deleteBlock(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("dentist_blocks")
      .delete()
      .eq("id", id);

    if (error) this.handleError(error);
  }
}
