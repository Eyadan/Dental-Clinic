"use server";

import { revalidatePath } from "next/cache";
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
  staffId?: string,
): Promise<ServiceResult<{ affectedCount: number }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const effectiveStaffId = (staffId && staffId.trim() !== "") ? staffId : user?.id;

    if (!effectiveStaffId) {
      return { success: false, error: "Authenticated staff account is required" };
    }

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
      effectiveStaffId,
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
  staffId?: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    let effectiveStaffId: string = (staffId && staffId.trim().length === 36) ? staffId : (user?.id ?? "");

    if (!effectiveStaffId || effectiveStaffId.length !== 36) {
      const { data: fallbackUser } = await supabase.from("users").select("id").limit(1).single();
      effectiveStaffId = fallbackUser?.id ?? "a0000000-0000-4000-8000-000000000001";
    }

    const service = new ReassignmentService();
    const result = await service.reassignAppointment(
      appointmentId,
      newDentistId,
      newDate,
      newTime,
      reason,
      effectiveStaffId,
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

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

export async function getCurrentDentistInfoAction(): Promise<ServiceResult<{ role: string; currentDentistId?: string; currentDentistName?: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: appUser } = await supabase
      .from("users")
      .select("role, first_name, last_name")
      .eq("id", user.id)
      .single();

    const role = appUser?.role ?? "admin";
    let currentDentistId: string | undefined;
    let currentDentistName: string | undefined;

    if (role === "dentist") {
      const { data: dentist } = await supabase
        .from("dentists")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (dentist) {
        currentDentistId = dentist.id;
        currentDentistName = appUser ? `${appUser.first_name} ${appUser.last_name}` : undefined;
      }
    }

    return {
      success: true,
      data: {
        role,
        currentDentistId,
        currentDentistName,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get dentist info",
    };
  }
}

export interface WeeklyScheduleDay {
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function getWeeklyScheduleAction(dentistId: string): Promise<ServiceResult<WeeklyScheduleDay[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbSchedules, error } = await supabase
      .from("dentist_schedules")
      .select("*")
      .eq("dentist_id", dentistId)
      .order("day_of_week");

    if (error) {
      return { success: false, error: error.message };
    }

    const scheduleMap = new Map<number, { start_time: string; end_time: string; is_active: boolean }>();
    if (dbSchedules) {
      for (const item of dbSchedules) {
        scheduleMap.set(item.day_of_week, {
          start_time: item.start_time ? item.start_time.slice(0, 5) : "08:00",
          end_time: item.end_time ? item.end_time.slice(0, 5) : "17:00",
          is_active: item.is_active ?? true,
        });
      }
    }

    const fullSchedule: WeeklyScheduleDay[] = [];
    for (let day = 0; day <= 6; day++) {
      const existing = scheduleMap.get(day);
      fullSchedule.push({
        day_of_week: day,
        day_name: DAY_NAMES[day],
        start_time: existing ? existing.start_time : "08:00",
        end_time: existing ? existing.end_time : "17:00",
        is_active: existing ? existing.is_active : day >= 1 && day <= 5,
      });
    }

    return { success: true, data: fullSchedule };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch weekly schedule",
    };
  }
}

export async function saveWeeklyScheduleAction(
  dentistId: string,
  days: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[]
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    for (const day of days) {
      const { data: existing } = await supabase
        .from("dentist_schedules")
        .select("id")
        .eq("dentist_id", dentistId)
        .eq("day_of_week", day.day_of_week)
        .single();

      if (existing) {
        await supabase
          .from("dentist_schedules")
          .update({
            start_time: `${day.start_time}:00`,
            end_time: `${day.end_time}:00`,
            is_active: day.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("dentist_schedules")
          .insert({
            dentist_id: dentistId,
            day_of_week: day.day_of_week,
            start_time: `${day.start_time}:00`,
            end_time: `${day.end_time}:00`,
            is_active: day.is_active,
          });
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save weekly schedule",
    };
  }
}

export async function getDentistBlocksAction(dentistId: string): Promise<ServiceResult<import("@/lib/types/database").DentistBlock[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const dentistService = new DentistService(supabase);
    const blocks = await dentistService.getBlocks(dentistId);
    return { success: true, data: blocks };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch blocks",
    };
  }
}

export async function deleteDentistBlockAction(blockId: string): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const dentistService = new DentistService(supabase);
    await dentistService.deleteBlock(blockId);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete block",
    };
  }
}
