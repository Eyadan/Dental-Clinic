"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import type { ServiceResult } from "@/lib/services/base-service";

export async function startConsultationAction(
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("visit_status")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    const validStatuses = ["waiting", "checked_in"];
    if (!validStatuses.includes(appointment.visit_status)) {
      return {
        success: false,
        error: `Cannot start consultation: visit status is "${appointment.visit_status}"`,
      };
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ visit_status: "in_consultation" })
      .eq("id", appointmentId);

    if (updateError) {
      return { success: false, error: "Failed to start consultation" };
    }

    revalidatePath("/queue");
    revalidatePath(`/consultation/${appointmentId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start consultation",
    };
  }
}

export async function generateConsentAction(
  appointmentId: string,
  treatmentInfo: string,
  clauseIds: string[],
): Promise<ServiceResult<{ id: string }>> {
  try {
    if (clauseIds.length === 0) {
      return { success: false, error: "Select at least one applicable consent clause" };
    }

    const supabase = await createServerSupabaseClient();

    const { data: existing } = await supabase
      .from("consent_forms")
      .select("id")
      .eq("appointment_id", appointmentId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Consent form already exists for this appointment" };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("consent_forms")
      .insert({
        appointment_id: appointmentId,
        treatment_info: treatmentInfo,
        consent_version: "1.0",
        staff_id: user.id,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const { error: clauseError } = await supabase
      .from("consent_form_clauses")
      .insert(clauseIds.map((clauseId) => ({ consent_form_id: data.id, clause_id: clauseId })));

    if (clauseError) {
      return { success: false, error: `Failed to attach consent clauses: ${clauseError.message}` };
    }

    revalidatePath(`/consultation/${appointmentId}`);
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate consent",
    };
  }
}
