"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { todayLocal } from "@/lib/utils/date-utils";
import type { ServiceResult } from "@/lib/services/base-service";

export async function callNextAction(): Promise<ServiceResult<{ id: string; patientName: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const today = todayLocal();

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        scheduled_time,
        visit_status,
        patients(first_name, last_name)
      `)
      .eq("scheduled_date", today)
      .eq("is_archived", false)
      .eq("visit_status", "checked_in")
      .order("scheduled_time", { ascending: true })
      .limit(1);

    if (error) {
      return { success: false, error: "Failed to fetch queue" };
    }

    if (!appointments || appointments.length === 0) {
      return { success: false, error: "No patients waiting in queue" };
    }

    const next = appointments[0];
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ visit_status: "waiting" })
      .eq("id", next.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const patient = next.patients as unknown as { first_name: string; last_name: string };
    revalidatePath("/queue");
    return {
      success: true,
      data: { id: next.id, patientName: `${patient.first_name} ${patient.last_name}` },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to call next patient",
    };
  }
}

export async function callSpecificAction(
  appointmentId: string,
): Promise<ServiceResult<{ patientName: string }>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("visit_status, patients(first_name, last_name)")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    const validStatuses = ["checked_in", "waiting", "delayed"];
    if (!validStatuses.includes(appointment.visit_status)) {
      return { success: false, error: "Patient is not in queue" };
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ visit_status: "waiting" })
      .eq("id", appointmentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const patient = appointment.patients as unknown as { first_name: string; last_name: string };
    revalidatePath("/queue");
    return {
      success: true,
      data: { patientName: `${patient.first_name} ${patient.last_name}` },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to call patient",
    };
  }
}

export async function markDelayedAction(
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("visit_status, reference_no")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    const validStatuses = ["checked_in", "waiting"];
    if (!validStatuses.includes(appointment.visit_status)) {
      return { success: false, error: "Patient cannot be marked as delayed from current status" };
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ visit_status: "delayed" })
      .eq("id", appointmentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "patient_marked_delayed",
        entity_type: "appointment",
        entity_id: appointmentId,
        metadata: { reference_no: appointment.reference_no },
      });
    }

    revalidatePath("/queue");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark as delayed",
    };
  }
}

export async function moveToLaterSlotAction(
  appointmentId: string,
  newTime: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("scheduled_date, scheduled_time, total_duration, dentist_id, reference_no, visit_status")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    if (!["checked_in", "waiting", "delayed"].includes(appointment.visit_status)) {
      return { success: false, error: "Patient cannot be moved from current status" };
    }

    const { data: conflicts } = await supabase
      .from("appointments")
      .select("id, reference_no, scheduled_time, total_duration")
      .eq("dentist_id", appointment.dentist_id)
      .eq("scheduled_date", appointment.scheduled_date)
      .eq("is_archived", false)
      .neq("id", appointmentId)
      .in("booking_status", ["pending", "approved", "confirmed", "reschedule_required"]);

    if (conflicts) {
      const newEnd = addMinutes(newTime, appointment.total_duration);
      for (const c of conflicts) {
        const cEnd = addMinutes(c.scheduled_time, c.total_duration);
        if (newTime < cEnd && newEnd > c.scheduled_time) {
          return { success: false, error: `Time slot conflicts with ${c.reference_no}` };
        }
      }
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        scheduled_time: newTime,
        visit_status: "checked_in",
      })
      .eq("id", appointmentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("appointment_history").insert({
        appointment_id: appointmentId,
        changed_by: user.id,
        field: "scheduled_time",
        old_value: appointment.scheduled_time,
        new_value: newTime,
      });

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "appointment_moved_to_later_slot",
        entity_type: "appointment",
        entity_id: appointmentId,
        metadata: {
          reference_no: appointment.reference_no,
          old_time: appointment.scheduled_time,
          new_time: newTime,
        },
      });
    }

    revalidatePath("/queue");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move to later slot",
    };
  }
}

export async function markNoShowAction(
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("visit_status, booking_status, reference_no")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    const validVisitStatuses = ["checked_in", "waiting", "delayed"];
    if (!validVisitStatuses.includes(appointment.visit_status ?? "")) {
      return { success: false, error: "Patient cannot be marked as no-show from current status" };
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        booking_status: "no_show",
        visit_status: null,
      })
      .eq("id", appointmentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("appointment_history").insert([
        {
          appointment_id: appointmentId,
          changed_by: user.id,
          field: "booking_status",
          old_value: appointment.booking_status,
          new_value: "no_show",
        },
        {
          appointment_id: appointmentId,
          changed_by: user.id,
          field: "visit_status",
          old_value: appointment.visit_status ?? "",
          new_value: "",
        },
      ]);

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "patient_marked_no_show",
        entity_type: "appointment",
        entity_id: appointmentId,
        metadata: { reference_no: appointment.reference_no },
      });
    }

    revalidatePath("/queue");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark as no-show",
    };
  }
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
