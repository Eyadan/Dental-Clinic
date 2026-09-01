import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ReassignmentLog } from "@/lib/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface AffectedAppointment {
  id: string;
  reference_no: string;
  patient_id: string;
  patient_name: string;
  scheduled_date: string;
  scheduled_time: string;
  total_duration: number;
  booking_status: string;
}

export interface AlternateDentist {
  id: string;
  user_id: string;
  specialization: string | null;
  dentist_name: string;
  available_slots: { startTime: string; endTime: string }[];
}

export interface ReassignmentResult {
  success: boolean;
  reassignmentLogId?: string;
  error?: string;
}

function getServiceClient(): SupabaseClient {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for reassignment service");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export class ReassignmentService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getServiceClient();
  }

  async getAffectedAppointments(
    dentistId: string,
    startDate: string,
    endDate: string,
  ): Promise<AffectedAppointment[]> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select(
        "id, reference_no, patient_id, scheduled_date, scheduled_time, total_duration, booking_status",
      )
      .eq("dentist_id", dentistId)
      .eq("is_archived", false)
      .in("booking_status", ["pending", "approved", "confirmed", "rescheduled", "reschedule_required"])
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) return [];

    const patientIds = [...new Set(data.map((a) => a.patient_id))];
    const { data: patients } = await this.supabase
      .from("patients")
      .select("id, first_name, last_name")
      .in("id", patientIds);

    const patientMap = new Map(patients?.map((p) => [p.id, p]) ?? []);

    return data.map((appt) => {
      const patient = patientMap.get(appt.patient_id);
      return {
        ...appt,
        patient_name: patient
          ? `${patient.first_name} ${patient.last_name}`
          : "Unknown",
      };
    });
  }

  async findAlternateDentists(
    originalDentistId: string,
    date: string,
    durationMinutes: number,
    slotIntervalMinutes: number = 30,
  ): Promise<AlternateDentist[]> {
    const { data: dentists, error } = await this.supabase
      .from("dentists")
      .select("id, user_id, specialization, is_active")
      .eq("is_active", true)
      .neq("id", originalDentistId);

    if (error) throw new Error(error.message);
    if (!dentists || dentists.length === 0) return [];

    const results: AlternateDentist[] = [];

    for (const dentist of dentists) {
      const { data: userData } = await this.supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", dentist.user_id)
        .single();

      let slots = await this.getAvailableSlotsForDentist(dentist.id, date, durationMinutes, slotIntervalMinutes);

      let availableSlots = slots
        .filter((s) => s.available)
        .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));

      // Fallback to 30-min slot intervals if full duration calculation yielded 0 slots
      if (availableSlots.length === 0 && durationMinutes > 30) {
        const fallbackSlots = await this.getAvailableSlotsForDentist(dentist.id, date, 30, slotIntervalMinutes);
        availableSlots = fallbackSlots
          .filter((s) => s.available)
          .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
      }

      results.push({
        id: dentist.id,
        user_id: dentist.user_id,
        specialization: dentist.specialization,
        dentist_name: userData
          ? `${userData.first_name} ${userData.last_name}`
          : "Unknown",
        available_slots: availableSlots,
      });
    }

    return results;
  }

  async reassignAppointment(
    appointmentId: string,
    newDentistId: string,
    newDate: string,
    newTime: string,
    reason: string,
    staffId: string,
  ): Promise<ReassignmentResult> {
    const { data: appointment, error: apptError } = await this.supabase
      .from("appointments")
      .select("id, dentist_id, scheduled_date, scheduled_time, total_duration, reference_no")
      .eq("id", appointmentId)
      .single();

    if (apptError || !appointment) {
      return { success: false, error: "Appointment not found" };
    }

    const conflict = await this.checkSlotConflict(
      newDentistId,
      newDate,
      newTime,
      appointment.total_duration,
      appointmentId,
    );

    if (conflict.hasConflict) {
      return { success: false, error: conflict.reason ?? "Slot conflict" };
    }

    const originalSchedule = `${appointment.scheduled_date} ${appointment.scheduled_time}`;
    const newSchedule = `${newDate} ${newTime}`;

    const { data: newDentist, error: dentistError } = await this.supabase
      .from("dentists")
      .select("id")
      .eq("id", newDentistId)
      .single();

    if (dentistError || !newDentist) {
      return { success: false, error: "New dentist not found" };
    }

    const { error: updateError } = await this.supabase
      .from("appointments")
      .update({
        dentist_id: newDentistId,
        scheduled_date: newDate,
        scheduled_time: newTime,
        booking_status: "rescheduled",
      })
      .eq("id", appointmentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const { data: logEntry, error: logError } = await this.supabase
      .from("reassignment_logs")
      .insert({
        appointment_id: appointmentId,
        original_dentist_id: appointment.dentist_id,
        new_dentist_id: newDentistId,
        original_schedule: originalSchedule,
        new_schedule: newSchedule,
        reason,
        staff_id: staffId,
      })
      .select("id")
      .single();

    if (logError) {
      console.error("[Reassignment] Failed to create reassignment log:", logError.message);
    }

    await this.supabase.from("appointment_history").insert({
      appointment_id: appointmentId,
      changed_by: staffId,
      field: "dentist_id",
      old_value: appointment.dentist_id,
      new_value: newDentistId,
    });

    await this.supabase.from("appointment_history").insert({
      appointment_id: appointmentId,
      changed_by: staffId,
      field: "scheduled_date",
      old_value: appointment.scheduled_date,
      new_value: newDate,
    });

    await this.supabase.from("appointment_history").insert({
      appointment_id: appointmentId,
      changed_by: staffId,
      field: "scheduled_time",
      old_value: appointment.scheduled_time,
      new_value: newTime,
    });

    await this.supabase.from("audit_logs").insert({
      user_id: staffId,
      action: "appointment_reassigned",
      entity_type: "appointment",
      entity_id: appointmentId,
      metadata: {
        reference_no: appointment.reference_no,
        original_dentist_id: appointment.dentist_id,
        new_dentist_id: newDentistId,
        original_schedule: originalSchedule,
        new_schedule: newSchedule,
        reason,
      },
    });

    return {
      success: true,
      reassignmentLogId: logEntry?.id,
    };
  }

  async markAppointmentsRescheduleRequired(
    dentistId: string,
    startDate: string,
    endDate: string,
    staffId: string,
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from("appointments")
      .update({ booking_status: "reschedule_required" })
      .eq("dentist_id", dentistId)
      .eq("is_archived", false)
      .in("booking_status", ["pending", "approved", "confirmed", "rescheduled", "reschedule_required"])
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .select("id, reference_no");

    if (error) throw new Error(error.message);

    if (data && data.length > 0) {
      const historyEntries = data.map((appt) => ({
        appointment_id: appt.id,
        changed_by: staffId,
        field: "booking_status",
        old_value: "approved",
        new_value: "reschedule_required",
      }));
      await this.supabase.from("appointment_history").insert(historyEntries);

      await this.supabase.from("audit_logs").insert({
        user_id: staffId,
        action: "dentist_unavailability_declared",
        entity_type: "dentist",
        entity_id: dentistId,
        metadata: {
          start_date: startDate,
          end_date: endDate,
          affected_count: data.length,
          appointment_ids: data.map((a) => a.id),
        },
      });
    }

    return data?.length ?? 0;
  }

  async getReassignmentLogs(appointmentId: string): Promise<ReassignmentLog[]> {
    const { data, error } = await this.supabase
      .from("reassignment_logs")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return data ?? [];
  }

  private async getAvailableSlotsForDentist(
    dentistId: string,
    date: string,
    durationMinutes: number,
    slotIntervalMinutes: number,
  ): Promise<{ startTime: string; endTime: string; available: boolean }[]> {
    const dayOfWeek = new Date(date + "T00:00:00").getDay();

    const { data: schedule } = await this.supabase
      .from("dentist_schedules")
      .select("start_time, end_time")
      .eq("dentist_id", dentistId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .maybeSingle();

    const workStartTime = schedule?.start_time ?? "08:00:00";
    const workEndTime = schedule?.end_time ?? "17:00:00";

    const { data: holiday } = await this.supabase
      .from("clinic_holidays")
      .select("description")
      .eq("date", date)
      .single();

    if (holiday) return [];

    const slots: { startTime: string; endTime: string; available: boolean }[] = [];
    let currentTime = workStartTime;

    while (this.addMinutes(currentTime, durationMinutes) <= workEndTime) {
      const endTime = this.addMinutes(currentTime, durationMinutes);

      const blockConflict = await this.checkBlocksConflict(dentistId, date, currentTime, endTime);
      const appointmentConflict = await this.checkAppointmentConflict(
        dentistId, date, currentTime, endTime,
      );

      slots.push({
        startTime: currentTime,
        endTime,
        available: !blockConflict && !appointmentConflict,
      });

      currentTime = this.addMinutes(currentTime, slotIntervalMinutes);
    }

    return slots;
  }

  private async checkSlotConflict(
    dentistId: string,
    date: string,
    startTime: string,
    durationMinutes: number,
    excludeAppointmentId?: string,
  ): Promise<{ hasConflict: boolean; reason: string | null }> {
    const dayOfWeek = new Date(date + "T00:00:00").getDay();

    const { data: schedule } = await this.supabase
      .from("dentist_schedules")
      .select("start_time, end_time")
      .eq("dentist_id", dentistId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .maybeSingle();

    const workStartTime = schedule?.start_time ?? "08:00:00";
    const workEndTime = schedule?.end_time ?? "17:00:00";

    const normStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    const checkDuration = Math.min(durationMinutes, 60);
    const endTime = this.addMinutes(normStartTime, checkDuration);

    if (normStartTime < workStartTime || normStartTime > workEndTime) {
      return {
        hasConflict: true,
        reason: `Outside working hours (${workStartTime}–${workEndTime})`,
      };
    }

    const { data: holiday } = await this.supabase
      .from("clinic_holidays")
      .select("description")
      .eq("date", date)
      .single();

    if (holiday) {
      return { hasConflict: true, reason: `Clinic holiday: ${holiday.description ?? "Holiday"}` };
    }

    const blockConflict = await this.checkBlocksConflict(dentistId, date, startTime, endTime);
    if (blockConflict) {
      return { hasConflict: true, reason: blockConflict };
    }

    const appointmentConflict = await this.checkAppointmentConflict(
      dentistId, date, startTime, endTime, excludeAppointmentId,
    );
    if (appointmentConflict) {
      return { hasConflict: true, reason: appointmentConflict };
    }

    return { hasConflict: false, reason: null };
  }

  private async checkBlocksConflict(
    dentistId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<string | null> {
    const startDatetime = `${date}T${startTime}:00`;
    const endDatetime = `${date}T${endTime}:00`;

    const { data } = await this.supabase
      .from("dentist_blocks")
      .select("reason, block_type")
      .eq("dentist_id", dentistId)
      .or(`and(start_datetime.lte.${endDatetime},end_datetime.gte.${startDatetime})`)
      .limit(1);

    if (data && data.length > 0) {
      return data[0].reason ?? `Dentist blocked (${data[0].block_type})`;
    }

    return null;
  }

  private async checkAppointmentConflict(
    dentistId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ): Promise<string | null> {
    let query = this.supabase
      .from("appointments")
      .select("reference_no, scheduled_time, total_duration")
      .eq("dentist_id", dentistId)
      .eq("scheduled_date", date)
      .eq("is_archived", false)
      .in("booking_status", ["pending", "approved", "confirmed", "reschedule_required"]);

    if (excludeAppointmentId) {
      query = query.neq("id", excludeAppointmentId);
    }

    const { data } = await query;

    if (!data || data.length === 0) return null;

    for (const appt of data) {
      const apptStart = appt.scheduled_time;
      const apptEnd = this.addMinutes(appt.scheduled_time, appt.total_duration);

      if (startTime < apptEnd && endTime > apptStart) {
        return `Overlaps with appointment ${appt.reference_no}`;
      }
    }

    return null;
  }

  private addMinutes(time: string, minutes: number): string {
    const parts = time.split(":");
    const h = Number(parts[0] ?? 0);
    const m = Number(parts[1] ?? 0);
    const total = h * 60 + m + minutes;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
  }
}
