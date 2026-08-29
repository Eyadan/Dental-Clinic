import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { WaitlistEntry } from "@/lib/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface WaitlistEntryWithPatient extends WaitlistEntry {
  patient_name: string;
  patient_contact: string;
  patient_psid: string | null;
}

export interface ReleasedSlot {
  dentist_id: string;
  dentist_name: string;
  date: string;
  time: string;
  duration: number;
}

function getServiceClient(): SupabaseClient {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for waitlist service");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export class WaitlistService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getServiceClient();
  }

  async getWaitlist(date?: string): Promise<WaitlistEntryWithPatient[]> {
    let query = this.supabase
      .from("waitlist_entries")
      .select(`
        *,
        patients(first_name, last_name, contact_no, messenger_psid)
      `)
      .order("joined_at", { ascending: true });

    if (date) {
      query = query.eq("requested_date", date);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data ?? []).map((entry) => {
      const patient = entry.patients as unknown as {
        first_name: string;
        last_name: string;
        contact_no: string;
        messenger_psid: string | null;
      };
      return {
        ...entry,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_contact: patient.contact_no,
        patient_psid: patient.messenger_psid,
      } as WaitlistEntryWithPatient;
    });
  }

  async joinWaitlist(
    patientId: string,
    requestedDate: string,
  ): Promise<WaitlistEntry> {
    const { data, error } = await this.supabase
      .from("waitlist_entries")
      .insert({
        patient_id: patientId,
        requested_date: requestedDate,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return data as WaitlistEntry;
  }

  async leaveWaitlist(entryId: string): Promise<void> {
    const { error } = await this.supabase
      .from("waitlist_entries")
      .delete()
      .eq("id", entryId);

    if (error) throw new Error(error.message);
  }

  async notifyNextInLine(
    dentistId: string,
    date: string,
    time: string,
    duration: number,
  ): Promise<WaitlistEntryWithPatient | null> {
    const { data: entries, error } = await this.supabase
      .from("waitlist_entries")
      .select(`
        *,
        patients(first_name, last_name, contact_no, messenger_psid)
      `)
      .eq("requested_date", date)
      .is("notified_at", null)
      .order("joined_at", { ascending: true })
      .limit(1);

    if (error) throw new Error(error.message);
    if (!entries || entries.length === 0) return null;

    const entry = entries[0];
    const { error: updateError } = await this.supabase
      .from("waitlist_entries")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", entry.id);

    if (updateError) throw new Error(updateError.message);

    const patient = entry.patients as unknown as {
      first_name: string;
      last_name: string;
      contact_no: string;
      messenger_psid: string | null;
    };

    return {
      ...entry,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_contact: patient.contact_no,
      patient_psid: patient.messenger_psid,
    } as WaitlistEntryWithPatient;
  }

  async acceptWaitlistSlot(
    entryId: string,
    dentistId: string,
    date: string,
    time: string,
    serviceId: string,
    staffId: string,
  ): Promise<{ appointmentId: string; referenceNo: string }> {
    const { data: entry, error: entryError } = await this.supabase
      .from("waitlist_entries")
      .select("patient_id")
      .eq("id", entryId)
      .single();

    if (entryError || !entry) throw new Error("Waitlist entry not found");

    const { data: service } = await this.supabase
      .from("dental_services")
      .select("default_duration_minutes, default_price")
      .eq("id", serviceId)
      .single();

    if (!service) throw new Error("Service not found");

    const referenceNo = `WL-${Date.now().toString(36).toUpperCase()}`;

    const { data: appointment, error: apptError } = await this.supabase
      .from("appointments")
      .insert({
        patient_id: entry.patient_id,
        dentist_id: dentistId,
        booking_status: "confirmed",
        scheduled_date: date,
        scheduled_time: time,
        total_duration: service.default_duration_minutes,
        reference_no: referenceNo,
      })
      .select("id, reference_no")
      .single();

    if (apptError) throw new Error(apptError.message);

    await this.supabase.from("appointment_services").insert({
      appointment_id: appointment.id,
      service_id: serviceId,
      price: service.default_price,
    });

    await this.supabase.from("audit_logs").insert({
      user_id: staffId,
      action: "waitlist_accepted",
      entity_type: "appointment",
      entity_id: appointment.id,
      metadata: {
        reference_no: referenceNo,
        waitlist_entry_id: entryId,
        dentist_id: dentistId,
        date,
        time,
      },
    });

    const { error: deleteError } = await this.supabase
      .from("waitlist_entries")
      .delete()
      .eq("id", entryId);

    if (deleteError) {
      console.error("[Waitlist] Failed to remove entry after accept:", deleteError.message);
    }

    return {
      appointmentId: appointment.id,
      referenceNo: appointment.reference_no,
    };
  }

  async declineWaitlistSlot(entryId: string): Promise<void> {
    const { error } = await this.supabase
      .from("waitlist_entries")
      .update({ notified_at: null })
      .eq("id", entryId);

    if (error) throw new Error(error.message);
  }

  async findReleasedSlots(date: string): Promise<ReleasedSlot[]> {
    const { data: dentists, error: dentistError } = await this.supabase
      .from("dentists")
      .select("id, user_id, is_active")
      .eq("is_active", true);

    if (dentistError) throw new Error(dentistError.message);

    const releasedSlots: ReleasedSlot[] = [];

    for (const dentist of dentists ?? []) {
      const { data: userData } = await this.supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", dentist.user_id)
        .single();

      const dentistName = userData
        ? `${userData.first_name} ${userData.last_name}`
        : "Unknown";

      const dayOfWeek = new Date(date + "T00:00:00").getDay();

      const { data: schedule } = await this.supabase
        .from("dentist_schedules")
        .select("start_time, end_time")
        .eq("dentist_id", dentist.id)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .single();

      if (!schedule) continue;

      const { data: appointments } = await this.supabase
        .from("appointments")
        .select("scheduled_time, total_duration, booking_status, visit_status")
        .eq("dentist_id", dentist.id)
        .eq("scheduled_date", date)
        .eq("is_archived", false)
        .in("booking_status", ["pending", "approved", "confirmed", "reschedule_required"]);

      const { data: blocks } = await this.supabase
        .from("dentist_blocks")
        .select("start_datetime, end_datetime")
        .eq("dentist_id", dentist.id);

      const bookedSlots = (appointments ?? []).map((a) => ({
        start: a.scheduled_time,
        end: addMinutes(a.scheduled_time, a.total_duration),
      }));

      const blockSlots = (blocks ?? []).map((b) => ({
        start: b.start_datetime.split("T")[1]?.substring(0, 5) ?? "00:00",
        end: b.end_datetime.split("T")[1]?.substring(0, 5) ?? "23:59",
      }));

      let currentTime = schedule.start_time;
      while (addMinutes(currentTime, 30) <= schedule.end_time) {
        const slotEnd = addMinutes(currentTime, 30);
        const isBooked = bookedSlots.some(
          (s) => currentTime < s.end && slotEnd > s.start,
        );
        const isBlocked = blockSlots.some(
          (s) => currentTime < s.end && slotEnd > s.start,
        );

        if (!isBooked && !isBlocked) {
          releasedSlots.push({
            dentist_id: dentist.id,
            dentist_name: dentistName,
            date,
            time: currentTime,
            duration: 30,
          });
        }

        currentTime = addMinutes(currentTime, 30);
      }
    }

    return releasedSlots;
  }
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
