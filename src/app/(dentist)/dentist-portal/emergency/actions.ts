"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { ReassignmentService } from "@/lib/services/reassignment-service";
import { DentistService } from "@/lib/services/dentist-service";
import { notifyAffectedPatients } from "@/lib/services/booking-parser";
import type { ServiceResult } from "@/lib/services/base-service";

export async function declareEmergencyAction(
  dentistId: string,
  reason: string,
): Promise<ServiceResult<{ affectedCount: number }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const today = new Date().toISOString().split("T")[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split("T")[0];

    const dentistService = new DentistService(supabase);
    await dentistService.createBlock({
      dentist_id: dentistId,
      start_datetime: `${today}T${new Date().toTimeString().split(" ")[0]}`,
      end_datetime: `${endDateStr}T23:59:59`,
      block_type: "sick_leave",
      recurrence_rule: "none",
      reason: `EMERGENCY: ${reason}`,
    });

    const reassignmentService = new ReassignmentService();
    const affectedCount = await reassignmentService.markAppointmentsRescheduleRequired(
      dentistId,
      today,
      endDateStr,
      user.id,
    );

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "emergency_declared",
      entity_type: "dentist",
      entity_id: dentistId,
      metadata: {
        reason,
        affected_count: affectedCount,
        date: today,
      },
    });

    if (affectedCount > 0) {
      await notifyAffectedPatients(dentistId, today, endDateStr, `Emergency: ${reason}`);
    }

    revalidatePath("/dentist-portal/emergency");
    return { success: true, data: { affectedCount } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to declare emergency",
    };
  }
}

export async function getCurrentDentistAction(): Promise<ServiceResult<{ id: string; name: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: dentist } = await supabase
      .from("dentists")
      .select("id, user_id")
      .eq("user_id", user.id)
      .single();

    if (!dentist) {
      return { success: false, error: "Dentist record not found" };
    }

    const { data: userData } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", dentist.user_id)
      .single();

    return {
      success: true,
      data: {
        id: dentist.id,
        name: userData ? `${userData.first_name} ${userData.last_name}` : "Unknown",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get dentist info",
    };
  }
}
