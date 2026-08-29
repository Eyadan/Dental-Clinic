"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { sendNotification } from "@/lib/services/notification-service";
import type { ServiceResult } from "@/lib/services/base-service";

export async function confirmCancellationAction(
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("booking_status, reference_no, patient_id")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    if (appointment.booking_status !== "pending_cancellation") {
      return { success: false, error: "Appointment is not pending cancellation" };
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ booking_status: "cancelled" })
      .eq("id", appointmentId);

    if (updateError) {
      return { success: false, error: "Failed to confirm cancellation" };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("appointment_history").insert({
        appointment_id: appointmentId,
        changed_by: user.id,
        field: "booking_status",
        old_value: appointment.booking_status,
        new_value: "cancelled",
      });

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "cancellation_confirmed",
        entity_type: "appointment",
        entity_id: appointmentId,
        metadata: { reference_no: appointment.reference_no },
      });
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("messenger_psid")
      .eq("id", appointment.patient_id)
      .single();

    if (patient?.messenger_psid) {
      await sendNotification({
        type: "cancellation",
        patientPsid: patient.messenger_psid,
        appointmentReference: appointment.reference_no,
        reason: "Cancellation confirmed by clinic staff",
      });
    }

    revalidatePath("/bookings");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to confirm cancellation",
    };
  }
}

export async function denyCancellationAction(
  appointmentId: string,
  reason: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("booking_status, reference_no, patient_id")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    if (appointment.booking_status !== "pending_cancellation") {
      return { success: false, error: "Appointment is not pending cancellation" };
    }

    const { data: apptData } = await supabase
      .from("appointments")
      .select("booking_status")
      .eq("id", appointmentId)
      .single();

    const previousStatus = apptData?.booking_status ?? "approved";

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ booking_status: previousStatus === "pending_cancellation" ? "approved" : previousStatus })
      .eq("id", appointmentId);

    if (updateError) {
      return { success: false, error: "Failed to deny cancellation" };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("appointment_history").insert({
        appointment_id: appointmentId,
        changed_by: user.id,
        field: "booking_status",
        old_value: "pending_cancellation",
        new_value: "approved",
      });

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "cancellation_denied",
        entity_type: "appointment",
        entity_id: appointmentId,
        metadata: { reference_no: appointment.reference_no, reason },
      });
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("messenger_psid")
      .eq("id", appointment.patient_id)
      .single();

    if (patient?.messenger_psid) {
      await sendNotification({
        type: "custom",
        patientPsid: patient.messenger_psid,
        appointmentReference: appointment.reference_no,
        customMessage: `Your cancellation request for appointment ${appointment.reference_no} has been denied. Reason: ${reason}. Please contact the clinic for more information.`,
      });
    }

    revalidatePath("/bookings");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to deny cancellation",
    };
  }
}

export async function rescheduleAppointmentAction(
  appointmentId: string,
  newDate: string,
  newTime: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("scheduled_date, scheduled_time, total_duration, dentist_id, reference_no, patient_id, booking_status")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    const validStatuses = ["reschedule_required", "pending", "approved", "confirmed"];
    if (!validStatuses.includes(appointment.booking_status)) {
      return { success: false, error: "Appointment cannot be rescheduled from current status" };
    }

    const { data: conflicts } = await supabase
      .from("appointments")
      .select("id, reference_no, scheduled_time, total_duration")
      .eq("dentist_id", appointment.dentist_id)
      .eq("scheduled_date", newDate)
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
        scheduled_date: newDate,
        scheduled_time: newTime,
        booking_status: "rescheduled",
      })
      .eq("id", appointmentId);

    if (updateError) {
      return { success: false, error: "Failed to reschedule" };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("appointment_history").insert([
        {
          appointment_id: appointmentId,
          changed_by: user.id,
          field: "scheduled_date",
          old_value: appointment.scheduled_date,
          new_value: newDate,
        },
        {
          appointment_id: appointmentId,
          changed_by: user.id,
          field: "scheduled_time",
          old_value: appointment.scheduled_time,
          new_value: newTime,
        },
        {
          appointment_id: appointmentId,
          changed_by: user.id,
          field: "booking_status",
          old_value: appointment.booking_status,
          new_value: "rescheduled",
        },
      ]);

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "appointment_rescheduled_by_staff",
        entity_type: "appointment",
        entity_id: appointmentId,
        metadata: {
          reference_no: appointment.reference_no,
          old_date: appointment.scheduled_date,
          old_time: appointment.scheduled_time,
          new_date: newDate,
          new_time: newTime,
        },
      });
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("messenger_psid")
      .eq("id", appointment.patient_id)
      .single();

    if (patient?.messenger_psid) {
      const { data: dentist } = await supabase
        .from("dentists")
        .select("user_id")
        .eq("id", appointment.dentist_id)
        .single();

      let dentistName: string | undefined;
      if (dentist) {
        const { data: userData } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", dentist.user_id)
          .single();
        dentistName = userData ? `${userData.first_name} ${userData.last_name}` : undefined;
      }

      await sendNotification({
        type: "reschedule",
        patientPsid: patient.messenger_psid,
        appointmentReference: appointment.reference_no,
        date: newDate,
        time: newTime,
        dentistName,
        reason: "Rescheduled by clinic staff",
      });
    }

    revalidatePath("/bookings");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reschedule",
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
