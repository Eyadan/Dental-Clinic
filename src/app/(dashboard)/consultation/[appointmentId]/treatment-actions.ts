"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import type { ServiceResult } from "@/lib/services/base-service";
import type { ToothData } from "@/components/dental-chart/dental-chart";

export async function saveTreatmentRecordAction(
  appointmentId: string,
  data: {
    diagnosis: string;
    procedures: string;
    clinical_notes: string;
    prescriptions: string;
    treatment_plan: string;
    tooth_chart: ToothData[];
  },
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: existing } = await supabase
      .from("treatment_records")
      .select("id")
      .eq("appointment_id", appointmentId)
      .limit(1)
      .maybeSingle();

    const toothChartJson = JSON.stringify(data.tooth_chart);

    if (existing) {
      const { error: updateError } = await supabase
        .from("treatment_records")
        .update({
          diagnosis: data.diagnosis || null,
          procedures: data.procedures || null,
          clinical_notes: data.clinical_notes || null,
          prescriptions: data.prescriptions || null,
          treatment_plan: data.treatment_plan || null,
        })
        .eq("id", existing.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      revalidatePath(`/consultation/${appointmentId}`);
      return { success: true, data: { id: existing.id } };
    }

    const { data: record, error } = await supabase
      .from("treatment_records")
      .insert({
        appointment_id: appointmentId,
        diagnosis: data.diagnosis || null,
        procedures: data.procedures || null,
        clinical_notes: data.clinical_notes || null,
        prescriptions: data.prescriptions || null,
        treatment_plan: data.treatment_plan || null,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/consultation/${appointmentId}`);
    return { success: true, data: { id: record.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save treatment record",
    };
  }
}

export async function getTreatmentRecordAction(
  appointmentId: string,
): Promise<ServiceResult<{
  id: string;
  diagnosis: string | null;
  procedures: string | null;
  clinical_notes: string | null;
  prescriptions: string | null;
  treatment_plan: string | null;
  pause_reason: string | null;
  paused_at: string | null;
  resumed_at: string | null;
} | null>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("treatment_records")
      .select("*")
      .eq("appointment_id", appointmentId)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) return { success: true, data: null };

    return {
      success: true,
      data: {
        id: data.id,
        diagnosis: data.diagnosis,
        procedures: data.procedures,
        clinical_notes: data.clinical_notes,
        prescriptions: data.prescriptions,
        treatment_plan: data.treatment_plan,
        pause_reason: data.pause_reason,
        paused_at: data.paused_at,
        resumed_at: data.resumed_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch treatment record",
    };
  }
}

export async function pauseTreatmentAction(
  appointmentId: string,
  reason: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error: apptError } = await supabase
      .from("appointments")
      .update({ visit_status: "treatment_paused" })
      .eq("id", appointmentId);

    if (apptError) {
      return { success: false, error: "Failed to pause treatment" };
    }

    const { error: recordError } = await supabase
      .from("treatment_records")
      .update({
        pause_reason: reason,
        paused_at: new Date().toISOString(),
        resumed_at: null,
      })
      .eq("appointment_id", appointmentId);

    if (recordError) {
      return { success: false, error: "Failed to update treatment record" };
    }

    revalidatePath(`/consultation/${appointmentId}`);
    revalidatePath("/queue");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to pause treatment",
    };
  }
}

export async function resumeTreatmentAction(
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error: apptError } = await supabase
      .from("appointments")
      .update({ visit_status: "treatment_ongoing" })
      .eq("id", appointmentId);

    if (apptError) {
      return { success: false, error: "Failed to resume treatment" };
    }

    const { error: recordError } = await supabase
      .from("treatment_records")
      .update({ resumed_at: new Date().toISOString() })
      .eq("appointment_id", appointmentId);

    if (recordError) {
      return { success: false, error: "Failed to update treatment record" };
    }

    revalidatePath(`/consultation/${appointmentId}`);
    revalidatePath("/queue");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resume treatment",
    };
  }
}

export async function completeTreatmentAction(
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error: apptError } = await supabase
      .from("appointments")
      .update({ visit_status: "completed" })
      .eq("id", appointmentId);

    if (apptError) {
      return { success: false, error: "Failed to complete treatment" };
    }

    revalidatePath(`/consultation/${appointmentId}`);
    revalidatePath("/queue");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete treatment",
    };
  }
}
