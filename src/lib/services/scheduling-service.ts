import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseService } from "./base-service";

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason: string | null;
}

export class SchedulingService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async checkConflict(
    dentistId: string,
    date: string,
    startTime: string,
    durationMinutes: number,
    excludeAppointmentId?: string,
  ): Promise<ConflictCheckResult> {
    const dayOfWeek = new Date(date + "T00:00:00").getDay();

    const schedule = await this.getWorkingSchedule(dentistId, dayOfWeek);
    if (!schedule) {
      return { hasConflict: true, reason: "Dentist does not work on this day" };
    }

    const endTime = this.addMinutes(startTime, durationMinutes);
    if (startTime < schedule.start_time || endTime > schedule.end_time) {
      return {
        hasConflict: true,
        reason: `Outside working hours (${schedule.start_time}–${schedule.end_time})`,
      };
    }

    const holiday = await this.checkHoliday(date);
    if (holiday) {
      return { hasConflict: true, reason: `Clinic holiday: ${holiday}` };
    }

    const blockConflict = await this.checkBlocks(dentistId, date, startTime, endTime);
    if (blockConflict) {
      return { hasConflict: true, reason: blockConflict };
    }

    const appointmentConflict = await this.checkExistingAppointments(
      dentistId,
      date,
      startTime,
      endTime,
      excludeAppointmentId,
    );
    if (appointmentConflict) {
      return { hasConflict: true, reason: appointmentConflict };
    }

    return { hasConflict: false, reason: null };
  }

  async getAvailableSlots(
    dentistId: string,
    date: string,
    durationMinutes: number,
    slotIntervalMinutes: number = 30,
  ): Promise<TimeSlot[]> {
    const dayOfWeek = new Date(date + "T00:00:00").getDay();

    const schedule = await this.getWorkingSchedule(dentistId, dayOfWeek);
    if (!schedule) return [];

    const holiday = await this.checkHoliday(date);
    if (holiday) return [];

    const slots: TimeSlot[] = [];
    let currentTime = schedule.start_time;

    while (this.addMinutes(currentTime, durationMinutes) <= schedule.end_time) {
      const endTime = this.addMinutes(currentTime, durationMinutes);

      const blockConflict = await this.checkBlocks(dentistId, date, currentTime, endTime);
      const appointmentConflict = await this.checkExistingAppointments(
        dentistId,
        date,
        currentTime,
        endTime,
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

  private async getWorkingSchedule(
    dentistId: string,
    dayOfWeek: number,
  ): Promise<{ start_time: string; end_time: string } | null> {
    const { data, error } = await this.supabase
      .from("dentist_schedules")
      .select("start_time, end_time")
      .eq("dentist_id", dentistId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data;
  }

  private async checkHoliday(date: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("clinic_holidays")
      .select("description, is_half_day")
      .eq("date", date)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    if (!data) return null;
    return data.description ?? "Clinic holiday";
  }

  private async checkBlocks(
    dentistId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<string | null> {
    const startDatetime = `${date}T${startTime}:00`;
    const endDatetime = `${date}T${endTime}:00`;

    const { data, error } = await this.supabase
      .from("dentist_blocks")
      .select("reason, block_type")
      .eq("dentist_id", dentistId)
      .or(`and(start_datetime.lte.${endDatetime},end_datetime.gte.${startDatetime})`)
      .limit(1);

    if (error) this.handleError(error);

    if (data && data.length > 0) {
      return data[0].reason ?? `Dentist blocked (${data[0].block_type})`;
    }

    return null;
  }

  private async checkExistingAppointments(
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

    const { data, error } = await query;

    if (error) this.handleError(error);

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
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + minutes;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }
}
