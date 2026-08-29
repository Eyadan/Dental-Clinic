"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { DentistService } from "@/lib/services/dentist-service";
import { dentistScheduleSchema } from "@/lib/validations";
import type { ServiceResult } from "@/lib/services/base-service";

export async function createScheduleAction(
  dentistId: string,
  formData: FormData,
): Promise<ServiceResult<{ id: string }>> {
  const raw = {
    dentist_id: dentistId,
    day_of_week: Number(formData.get("day_of_week")),
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
  };

  const parsed = dentistScheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const service = new DentistService(supabase);
    const created = await service.createSchedule(parsed.data);
    revalidatePath(`/dentists/${dentistId}/schedule`);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create schedule",
    };
  }
}

export async function deleteScheduleAction(
  scheduleId: string,
  dentistId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const service = new DentistService(supabase);
    await service.deleteSchedule(scheduleId);
    revalidatePath(`/dentists/${dentistId}/schedule`);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete schedule",
    };
  }
}

export async function createBlockAction(
  dentistId: string,
  formData: FormData,
): Promise<ServiceResult<{ id: string }>> {
  const raw = {
    dentist_id: dentistId,
    start_datetime: formData.get("start_datetime") as string,
    end_datetime: formData.get("end_datetime") as string,
    block_type: formData.get("block_type") as string,
    recurrence_rule: formData.get("recurrence_rule") as string,
    reason: (formData.get("reason") as string) || undefined,
  };

  if (!raw.start_datetime || !raw.end_datetime) {
    return { success: false, error: "Start and end datetime are required" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const service = new DentistService(supabase);
    const created = await service.createBlock(raw);
    revalidatePath(`/dentists/${dentistId}/schedule`);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create block",
    };
  }
}

export async function deleteBlockAction(
  blockId: string,
  dentistId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const service = new DentistService(supabase);
    await service.deleteBlock(blockId);
    revalidatePath(`/dentists/${dentistId}/schedule`);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete block",
    };
  }
}
