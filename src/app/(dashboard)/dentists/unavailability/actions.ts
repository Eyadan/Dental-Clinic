"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { ReassignmentService } from "@/lib/services/reassignment-service";
import { DentistService } from "@/lib/services/dentist-service";
import { sendNotification } from "@/lib/services/notification-service";
import { notifyAffectedPatients } from "@/lib/services/booking-parser";
import type { ServiceResult } from "@/lib/services/base-service";
import type { AffectedAppointment, AlternateDentist } from "@/lib/services/reassignment-service";

export interface DentistOption {
  id: string;
  name: string;
  specialization: string | null;
}

export async function getDentistsAction(): Promise<ServiceResult<DentistOption[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const dentistService = new DentistService(supabase);
    const dentists = await dentistService.getAllDentists();

    const dentistOptions: DentistOption[] = [];
    for (const dentist of dentists) {
      const { data: userData } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", dentist.user_id)
        .single();

      dentistOptions.push({
        id: dentist.id,
        name: userData
          ? `${userData.first_name} ${userData.last_name}`
          : "Unknown",
        specialization: dentist.specialization,
      });
    }

    return { success: true, data: dentistOptions };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch dentists",
    };
  }
}

export async function getAffectedAppointmentsAction(
  dentistId: string,
  startDate: string,
  endDate: string,
): Promise<ServiceResult<AffectedAppointment[]>> {
  try {
    const service = new ReassignmentService();
    const appointments = await service.getAffectedAppointments(dentistId, startDate, endDate);
    return { success: true, data: appointments };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch affected appointments",
    };
  }
}

export async function findAlternateDentistsAction(
  originalDentistId: string,
  date: string,
  durationMinutes: number,
): Promise<ServiceResult<AlternateDentist[]>> {
  try {
    const service = new ReassignmentService();
    const alternates = await service.findAlternateDentists(
      originalDentistId,
      date,
      durationMinutes,
    );
    return { success: true, data: alternates };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to find alternate dentists",
    };
  }
}

export async function declareUnavailabilityAction(
  dentistId: string,
  startDate: string,
  endDate: string,
  blockType: string,
  reason: string,
  staffId: string,
): Promise<ServiceResult<{ affectedCount: number }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const dentistService = new DentistService(supabase);

    const startDatetime = `${startDate}T00:00:00`;
    const endDatetime = `${endDate}T23:59:59`;

    await dentistService.createBlock({
      dentist_id: dentistId,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      block_type: blockType,
      recurrence_rule: "none",
      reason,
    });

    const reassignmentService = new ReassignmentService();
    const affectedCount = await reassignmentService.markAppointmentsRescheduleRequired(
      dentistId,
      startDate,
      endDate,
      staffId,
    );

    if (affectedCount > 0) {
      await notifyAffectedPatients(dentistId, startDate, endDate, reason || blockType);
    }

    return { success: true, data: { affectedCount } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to declare unavailability",
    };
  }
}

export async function reassignAppointmentAction(
  appointmentId: string,
  newDentistId: string,
  newDate: string,
  newTime: string,
  reason: string,
  staffId: string,
): Promise<ServiceResult<void>> {
  try {
    const service = new ReassignmentService();
    const result = await service.reassignAppointment(
      appointmentId,
      newDentistId,
      newDate,
      newTime,
      reason,
      staffId,
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const supabase = await createServerSupabaseClient();

    const { data: appointment } = await supabase
      .from("appointments")
      .select("patient_id, reference_no")
      .eq("id", appointmentId)
      .single();

    if (appointment) {
      const { data: patient } = await supabase
        .from("patients")
        .select("messenger_psid, first_name, last_name")
        .eq("id", appointment.patient_id)
        .single();

      if (patient?.messenger_psid) {
        const { data: newDentistUser } = await supabase
          .from("dentists")
          .select("user_id")
          .eq("id", newDentistId)
          .single();

        let dentistName: string | undefined;
        if (newDentistUser) {
          const { data: userData } = await supabase
            .from("users")
            .select("first_name, last_name")
            .eq("id", newDentistUser.user_id)
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
          reason,
        });
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reassign appointment",
    };
  }
}

export async function getCurrentStaffIdAction(): Promise<ServiceResult<string>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    return { success: true, data: user.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get staff ID",
    };
  }
}
