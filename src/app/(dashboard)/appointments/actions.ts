"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { AppointmentService } from "@/lib/services/appointment-service";
import { SchedulingService } from "@/lib/services/scheduling-service";
import { sendNotification } from "@/lib/services/notification-service";
import { appointmentCreateSchema } from "@/lib/validations/appointment.schema";
import type { ServiceResult } from "@/lib/services/base-service";

export async function createAppointmentAction(
  formData: FormData,
): Promise<ServiceResult<{ id: string; reference_no: string }>> {
  const isVerballyApproved = formData.get("isVerballyApproved") === "true";
  const raw = {
    patient_id: formData.get("patient_id") as string,
    dentist_id: formData.get("dentist_id") as string,
    scheduled_date: formData.get("scheduled_date") as string,
    scheduled_time: formData.get("scheduled_time") as string,
    total_duration: Number(formData.get("total_duration")),
    service_ids: (formData.getAll("service_ids") as string[]).filter(Boolean),
    isVerballyApproved,
    booking_status: isVerballyApproved ? ("approved" as const) : ("pending" as const),
  };

  const parsed = appointmentCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const schedulingService = new SchedulingService(supabase);

    const conflict = await schedulingService.checkConflict(
      parsed.data.dentist_id,
      parsed.data.scheduled_date,
      parsed.data.scheduled_time,
      parsed.data.total_duration,
    );

    if (conflict.hasConflict) {
      return {
        success: false,
        error: `Scheduling conflict: ${conflict.reason}`,
      };
    }

    const service = new AppointmentService(supabase);
    const created = await service.createAppointment(parsed.data);
    revalidatePath("/appointments");
    return { success: true, data: { id: created.id, reference_no: created.reference_no } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create appointment",
    };
  }
}

export async function getAvailableSlotsAction(
  dentistId: string,
  date: string,
  durationMinutes: number,
): Promise<ServiceResult<{ startTime: string; endTime: string; available: boolean }[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const schedulingService = new SchedulingService(supabase);
    const slots = await schedulingService.getAvailableSlots(dentistId, date, durationMinutes);
    return { success: true, data: slots };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get available slots",
    };
  }
}

export async function approveAppointmentAction(
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "reception") {
      return { success: false, error: "Reception staff cannot approve appointments. Only attending dentists or admins have approval authority." };
    }

    const service = new AppointmentService(supabase);

    const { data: appointment } = await supabase
      .from("appointments")
      .select("reference_no, patient_id, scheduled_date, scheduled_time, dentist_id, total_duration")
      .eq("id", appointmentId)
      .single();

    await service.updateAppointment(appointmentId, { booking_status: "approved" });

    if (user) {
      await supabase.from("appointment_history").insert({
        appointment_id: appointmentId,
        changed_by: user.id,
        field: "booking_status",
        old_value: "pending",
        new_value: "approved",
      });

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "appointment_approved",
        entity_type: "appointment",
        entity_id: appointmentId,
        metadata: { reference_no: appointment?.reference_no },
      });
    }

    if (appointment) {
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

        const { data: apptServices } = await supabase
          .from("appointment_services")
          .select("dental_services(name)")
          .eq("appointment_id", appointmentId);

        const serviceNames = (apptServices ?? [])
          .map((as: { dental_services: { name: string }[] }) => as.dental_services[0]?.name)
          .filter((n): n is string => Boolean(n));

        await sendNotification({
          type: "approval",
          patientPsid: patient.messenger_psid,
          appointmentReference: appointment.reference_no,
          date: appointment.scheduled_date,
          time: appointment.scheduled_time,
          dentistName,
          serviceNames: serviceNames.length > 0 ? serviceNames : undefined,
          totalDuration: appointment.total_duration,
        });
      }
    }

    revalidatePath("/appointments");
    revalidatePath("/bookings");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve appointment",
    };
  }
}

export async function declineAppointmentAction(
  appointmentId: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "reception") {
      return { success: false, error: "Reception staff cannot decline appointments. Only attending dentists or admins have authority." };
    }

    const service = new AppointmentService(supabase);

    const { data: appointment } = await supabase
      .from("appointments")
      .select("reference_no, patient_id")
      .eq("id", appointmentId)
      .single();

    await service.updateAppointment(appointmentId, { booking_status: "declined" });

    if (user) {
      await supabase.from("appointment_history").insert({
        appointment_id: appointmentId,
        changed_by: user.id,
        field: "booking_status",
        old_value: "pending",
        new_value: "declined",
      });

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "appointment_declined",
        entity_type: "appointment",
        entity_id: appointmentId,
        metadata: { reference_no: appointment?.reference_no },
      });
    }

    if (appointment) {
      const { data: patient } = await supabase
        .from("patients")
        .select("messenger_psid")
        .eq("id", appointment.patient_id)
        .single();

      if (patient?.messenger_psid) {
        await sendNotification({
          type: "decline",
          patientPsid: patient.messenger_psid,
          appointmentReference: appointment.reference_no,
        });
      }
    }

    revalidatePath("/appointments");
    revalidatePath("/bookings");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to decline appointment",
    };
  }
}
