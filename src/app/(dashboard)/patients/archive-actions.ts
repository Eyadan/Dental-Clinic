"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import type { ServiceResult } from "@/lib/services/base-service";

export async function archivePatientAction(patientId: string): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("patients")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", patientId);

    if (error) return { success: false, error: error.message };

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "patient_archived",
      entity_type: "patient",
      entity_id: patientId,
    });

    revalidatePath("/patients");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive patient",
    };
  }
}

export async function unarchivePatientAction(patientId: string): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("patients")
      .update({ is_archived: false, updated_at: new Date().toISOString() })
      .eq("id", patientId);

    if (error) return { success: false, error: error.message };

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "patient_unarchived",
      entity_type: "patient",
      entity_id: patientId,
    });

    revalidatePath("/patients");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unarchive patient",
    };
  }
}

export async function archiveAppointmentAction(appointmentId: string): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("appointments")
      .update({ is_archived: true })
      .eq("id", appointmentId);

    if (error) return { success: false, error: error.message };

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "appointment_archived",
      entity_type: "appointment",
      entity_id: appointmentId,
    });

    revalidatePath("/appointments");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive appointment",
    };
  }
}

export async function getArchivedPatientsAction(): Promise<ServiceResult<Array<{
  id: string;
  first_name: string;
  last_name: string;
  contact_no: string;
  archived_at: string;
}>>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("patients")
      .select("id, first_name, last_name, contact_no, updated_at")
      .eq("is_archived", true)
      .order("updated_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: (data ?? []).map((p) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        contact_no: p.contact_no,
        archived_at: p.updated_at,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch archived patients",
    };
  }
}
