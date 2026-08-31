import { createClient } from "@supabase/supabase-js";
import { findOrCreateConversation, saveMessage } from "./messenger-service";
import type { MessengerConversation } from "@/lib/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN ?? "";
const GRAPH_API_VERSION = process.env.MESSENGER_API_VERSION ?? "v21.0";

type Intent = "book" | "confirm" | "reschedule" | "cancel" | "help" | "unknown" | "view_bookings";

interface ParsedIntent {
  intent: Intent;
  date?: string;
  time?: string;
  serviceName?: string;
  rawText: string;
}

interface BookingSessionData {
  conversationId: string;
  patientPsid: string;
  step: "awaiting_date" | "awaiting_time" | "awaiting_service" | "awaiting_dentist" | "awaiting_confirmation" | "reschedule_awaiting_date" | "reschedule_awaiting_time" | "reschedule_awaiting_confirmation" | "complete";
  collectedDate?: string;
  collectedTime?: string;
  collectedServiceIds?: string[];
  collectedDentistId?: string;
  rescheduleAppointmentId?: string;
}

const SESSION_EXPIRY_MINUTES = 30;

async function getSession(psid: string): Promise<BookingSessionData | null> {
  const supabase = getServiceClient();
  const cutoff = new Date(Date.now() - SESSION_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("booking_sessions")
    .select("*")
    .eq("patient_psid", psid)
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    conversationId: data.conversation_id,
    patientPsid: data.patient_psid,
    step: data.step as BookingSessionData["step"],
    collectedDate: data.collected_date ?? undefined,
    collectedTime: data.collected_time ?? undefined,
    collectedServiceIds: data.collected_service_ids ?? undefined,
    collectedDentistId: data.collected_dentist_id ?? undefined,
    rescheduleAppointmentId: data.reschedule_appointment_id ?? undefined,
  };
}

async function hasExpiredSession(psid: string): Promise<boolean> {
  const supabase = getServiceClient();
  const cutoff = new Date(Date.now() - SESSION_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("booking_sessions")
    .select("id")
    .eq("patient_psid", psid)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return !!data;
}

async function deleteExpiredSession(psid: string): Promise<void> {
  const supabase = getServiceClient();
  const cutoff = new Date(Date.now() - SESSION_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await supabase
    .from("booking_sessions")
    .delete()
    .eq("patient_psid", psid)
    .lte("created_at", cutoff);
}

async function saveSession(session: BookingSessionData): Promise<void> {
  const supabase = getServiceClient();

  await supabase
    .from("booking_sessions")
    .upsert(
      {
        patient_psid: session.patientPsid,
        conversation_id: session.conversationId,
        step: session.step,
        collected_date: session.collectedDate ?? null,
        collected_time: session.collectedTime ?? null,
        collected_service_ids: session.collectedServiceIds ?? null,
        collected_dentist_id: session.collectedDentistId ?? null,
        reschedule_appointment_id: session.rescheduleAppointmentId ?? null,
      },
      { onConflict: "patient_psid" },
    );
}

async function deleteSession(psid: string): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from("booking_sessions").delete().eq("patient_psid", psid);
}

function getServiceClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for booking parser");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function parseIntent(text: string): ParsedIntent {
  const lower = text.toLowerCase().trim();

  if (lower.includes("reschedule")) {
    return { intent: "reschedule", rawText: text };
  }

  if (lower.includes("cancel") || lower.includes("exit") || lower.includes("stop") || lower.includes("quit")) {
    return { intent: "cancel", rawText: text };
  }

  if (lower.includes("confirm")) {
    return { intent: "confirm", rawText: text };
  }

  if (lower.includes("my bookings") || lower.includes("my appointments") || lower.includes("view booking") || lower.includes("view appointment")) {
    return { intent: "view_bookings", rawText: text };
  }

  if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) {
    return { intent: "book", rawText: text };
  }

  if (lower.includes("change")) {
    return { intent: "reschedule", rawText: text };
  }

  if (lower.includes("help") || lower.includes("hi") || lower.includes("hello") || lower.includes("start")) {
    return { intent: "help", rawText: text };
  }

  return { intent: "unknown", rawText: text };
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(text: string): string | null {
  const lower = text.toLowerCase().trim();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (lower === "today") {
    return formatLocalDate(today);
  }
  if (lower === "tomorrow" || lower === "tmrw") {
    return formatLocalDate(tomorrow);
  }

  const dateMatch = lower.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : today.getFullYear();
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      if (date < today) {
        return null;
      }
      return formatLocalDate(date);
    }
  }

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < dayNames.length; i++) {
    if (lower.includes(dayNames[i])) {
      const targetDay = i;
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const target = new Date(today);
      target.setDate(target.getDate() + daysUntil);
      return formatLocalDate(target);
    }
  }

  return null;
}

function parseTime(text: string): string | null {
  const lower = text.trim().replace(";", ":");

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3]?.toLowerCase();

    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;

    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    }
  }

  return null;
}

function isPastDateTime(date: string, time: string): boolean {
  const now = new Date();
  const dateTime = new Date(`${date}T${time}`);
  return dateTime < now;
}

async function sendMessengerMessage(psid: string, text: string): Promise<void> {
  if (!PAGE_ACCESS_TOKEN) {
    console.warn("[Booking Parser] MESSENGER_PAGE_ACCESS_TOKEN not configured — skipping send");
    return;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        messaging_type: "RESPONSE",
        message: { text },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Booking Parser] Send API error ${response.status}: ${errorBody}`);
    }
  } catch (error) {
    console.error("[Booking Parser] Failed to send message:", error);
  }
}

async function getActiveServices(): Promise<{ id: string; name: string; default_duration_minutes: number; default_price: number | null }[]> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("dental_services")
    .select("id, name, default_duration_minutes, default_price")
    .eq("is_active", true)
    .order("name");

  return data ?? [];
}

async function getActiveDentists(): Promise<{ id: string; name: string }[]> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("dentists")
    .select(`
      id,
      user_id,
      users!inner(first_name, last_name)
    `)
    .eq("is_active", true);

  if (!data) return [];

  return data.map((d) => {
    const user = Array.isArray(d.users) ? d.users[0] : d.users;
    return {
      id: d.id,
      name: `${user.first_name} ${user.last_name}`,
    };
  });
}

async function findPatientByPsid(psid: string): Promise<string | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("patients")
    .select("id")
    .eq("messenger_psid", psid)
    .maybeSingle();

  return data?.id ?? null;
}

async function createPendingAppointment(
  patientId: string,
  dentistId: string,
  date: string,
  time: string,
  serviceIds: string[],
): Promise<{ id: string; referenceNo: string } | null> {
  const supabase = getServiceClient();

  const { data: services } = await supabase
    .from("dental_services")
    .select("id, default_duration_minutes, default_price")
    .in("id", serviceIds);

  const totalDuration = (services ?? []).reduce((sum, s) => sum + (s.default_duration_minutes ?? 30), 0);

  const referenceNo = `MB-${Date.now().toString(36).toUpperCase()}`;

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: patientId,
      dentist_id: dentistId,
      scheduled_date: date,
      scheduled_time: time,
      total_duration: totalDuration,
      booking_status: "pending",
      payment_status: "pending_payment",
      reference_no: referenceNo,
      is_archived: false,
    })
    .select("id, reference_no")
    .single();

  if (error || !appointment) {
    console.error("[Booking Parser] Failed to create appointment:", error?.message);
    return null;
  }

  const serviceRows = (services ?? []).map((s) => ({
    appointment_id: appointment.id,
    service_id: s.id,
    price: s.default_price ?? 0,
  }));
  await supabase.from("appointment_services").insert(serviceRows);

  return { id: appointment.id, referenceNo: appointment.reference_no };
}

async function checkBookingConflict(
  dentistId: string,
  date: string,
  time: string,
  durationMinutes: number,
  excludeAppointmentId?: string,
): Promise<{ hasConflict: boolean; reason?: string }> {
  const supabase = getServiceClient();

  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  const { data: schedule } = await supabase
    .from("dentist_schedules")
    .select("start_time, end_time")
    .eq("dentist_id", dentistId)
    .eq("day_of_week", dayOfWeek)
    .limit(1)
    .maybeSingle();

  if (!schedule) {
    return { hasConflict: true, reason: "The selected dentist is not available on that day." };
  }

  const reqStart = new Date(`2000-01-01T${time}`);
  const reqEnd = new Date(reqStart.getTime() + durationMinutes * 60000);
  const schedStart = new Date(`2000-01-01T${schedule.start_time}`);
  const schedEnd = new Date(`2000-01-01T${schedule.end_time}`);

  if (reqStart < schedStart || reqEnd > schedEnd) {
    return { hasConflict: true, reason: `The dentist is available from ${schedule.start_time.slice(0, 5)} to ${schedule.end_time.slice(0, 5)} on that day.` };
  }

  const { data: holiday } = await supabase
    .from("clinic_holidays")
    .select("date")
    .eq("date", date)
    .maybeSingle();

  if (holiday) {
    return { hasConflict: true, reason: "The clinic is closed on that date (holiday)." };
  }

  const { data: blocks } = await supabase
    .from("dentist_blocks")
    .select("start_datetime, end_datetime")
    .eq("dentist_id", dentistId)
    .or(`start_datetime.lte.${date}T23:59:59,end_datetime.gte.${date}T00:00:00`);

  const reqStartISO = new Date(`${date}T${time}`);
  const reqEndISO = new Date(reqStartISO.getTime() + durationMinutes * 60000);
  for (const block of blocks ?? []) {
    const blockStart = new Date(block.start_datetime);
    const blockEnd = new Date(block.end_datetime);
    if (reqStartISO < blockEnd && reqEndISO > blockStart) {
      return { hasConflict: true, reason: "The dentist has a time block (leave/emergency) during that period." };
    }
  }

  let existingQuery = supabase
    .from("appointments")
    .select("scheduled_time, total_duration")
    .eq("dentist_id", dentistId)
    .eq("scheduled_date", date)
    .in("booking_status", ["pending", "approved", "confirmed", "rescheduled"]);

  if (excludeAppointmentId) {
    existingQuery = existingQuery.neq("id", excludeAppointmentId);
  }

  const { data: existing } = await existingQuery;

  for (const appt of existing ?? []) {
    const apptStart = new Date(`2000-01-01T${appt.scheduled_time}`);
    const apptEnd = new Date(apptStart.getTime() + (appt.total_duration ?? 30) * 60000);
    if (reqStart < apptEnd && reqEnd > apptStart) {
      return { hasConflict: true, reason: "The dentist already has an appointment at that time. Please choose a different time." };
    }
  }

  return { hasConflict: false };
}

async function getAvailableDentistsForDate(date: string): Promise<{ id: string; name: string; startTime: string; endTime: string }[]> {
  const supabase = getServiceClient();
  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  const { data: holiday } = await supabase
    .from("clinic_holidays")
    .select("date")
    .eq("date", date)
    .maybeSingle();

  if (holiday) return [];

  const { data: schedules } = await supabase
    .from("dentist_schedules")
    .select(`
      dentist_id,
      start_time,
      end_time,
      dentists!inner(id, is_active, users!inner(first_name, last_name))
    `)
    .eq("day_of_week", dayOfWeek)
    .eq("dentists.is_active", true);

  if (!schedules) return [];

  const seen = new Set<string>();
  return schedules
    .filter((s) => {
      if (seen.has(s.dentist_id)) return false;
      seen.add(s.dentist_id);
      return true;
    })
    .map((s) => {
      const dentist = Array.isArray(s.dentists) ? s.dentists[0] : s.dentists;
      const user = Array.isArray(dentist.users) ? dentist.users[0] : dentist.users;
      return {
        id: s.dentist_id,
        name: `${user.first_name} ${user.last_name}`,
        startTime: s.start_time,
        endTime: s.end_time,
      };
    });
}

interface SplitBookingResult {
  fitsNow: { id: string; name: string; duration: number }[];
  remaining: { id: string; name: string; duration: number }[];
  availableUntil: string | null;
  nextSlotForRemaining: string | null;
}

async function trySplitServices(
  dentistId: string,
  date: string,
  startTime: string,
  services: { id: string; name: string; duration: number }[],
): Promise<SplitBookingResult> {
  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("appointments")
    .select("scheduled_time, total_duration")
    .eq("dentist_id", dentistId)
    .eq("scheduled_date", date)
    .in("booking_status", ["pending", "approved", "confirmed", "rescheduled"])
    .order("scheduled_time");

  const reqStart = new Date(`2000-01-01T${startTime}`);

  const nextConflict = (existing ?? [])
    .map((a) => {
      const apptStart = new Date(`2000-01-01T${a.scheduled_time}`);
      const apptEnd = new Date(apptStart.getTime() + (a.total_duration ?? 30) * 60000);
      return { apptStart, apptEnd };
    })
    .filter((a) => a.apptStart >= reqStart)
    .sort((a, b) => a.apptStart.getTime() - b.apptStart.getTime())[0];

  if (!nextConflict) {
    return { fitsNow: services.map((s) => ({ ...s })), remaining: [], availableUntil: null, nextSlotForRemaining: null };
  }

  const availableMs = nextConflict.apptStart.getTime() - reqStart.getTime();
  const availableMinutes = Math.floor(availableMs / 60000);

  const fitsNow: { id: string; name: string; duration: number }[] = [];
  const remaining: { id: string; name: string; duration: number }[] = [];
  let usedMinutes = 0;

  for (const svc of services) {
    if (usedMinutes + svc.duration <= availableMinutes) {
      fitsNow.push({ ...svc });
      usedMinutes += svc.duration;
    } else {
      remaining.push({ ...svc });
    }
  }

  const availableUntil = nextConflict.apptStart.toTimeString().slice(0, 8);

  let nextSlotForRemaining: string | null = null;
  if (remaining.length > 0) {
    const remainingDuration = remaining.reduce((sum, s) => sum + s.duration, 0);
    const slots = await getAvailableTimeSlots(dentistId, date, remainingDuration);
    nextSlotForRemaining = slots.length > 0 ? slots[0] : null;
  }

  return { fitsNow, remaining, availableUntil, nextSlotForRemaining };
}

async function getAvailableTimeSlots(
  dentistId: string,
  date: string,
  durationMinutes: number,
): Promise<string[]> {
  const supabase = getServiceClient();
  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  const { data: schedule } = await supabase
    .from("dentist_schedules")
    .select("start_time, end_time")
    .eq("dentist_id", dentistId)
    .eq("day_of_week", dayOfWeek)
    .limit(1)
    .maybeSingle();

  if (!schedule) return [];

  const { data: holiday } = await supabase
    .from("clinic_holidays")
    .select("date")
    .eq("date", date)
    .maybeSingle();

  if (holiday) return [];

  const { data: blocks } = await supabase
    .from("dentist_blocks")
    .select("start_datetime, end_datetime")
    .eq("dentist_id", dentistId)
    .or(`start_datetime.lte.${date}T23:59:59,end_datetime.gte.${date}T00:00:00`);

  const { data: existing } = await supabase
    .from("appointments")
    .select("scheduled_time, total_duration")
    .eq("dentist_id", dentistId)
    .eq("scheduled_date", date)
    .in("booking_status", ["pending", "approved", "confirmed", "rescheduled"]);

  const busySlots = (existing ?? []).map((a) => {
    const start = new Date(`2000-01-01T${a.scheduled_time}`);
    const end = new Date(start.getTime() + (a.total_duration ?? 30) * 60000);
    return { start, end };
  });

  const blockSlots = (blocks ?? []).map((b) => ({
    start: new Date(b.start_datetime),
    end: new Date(b.end_datetime),
  }));

  const slots: string[] = [];
  const schedStart = new Date(`2000-01-01T${schedule.start_time}`);
  const schedEnd = new Date(`2000-01-01T${schedule.end_time}`);
  const slotInterval = 30;

  for (let t = schedStart; t.getTime() + durationMinutes * 60000 <= schedEnd.getTime(); t = new Date(t.getTime() + slotInterval * 60000)) {
    const slotEnd = new Date(t.getTime() + durationMinutes * 60000);
    const slotStartISO = new Date(`${date}T${t.toTimeString().slice(0, 8)}`);
    const slotEndISO = new Date(`${date}T${slotEnd.toTimeString().slice(0, 8)}`);

    const hasOverlap = busySlots.some((b) => t < b.end && slotEnd > b.start)
      || blockSlots.some((b) => slotStartISO < b.end && slotEndISO > b.start);

    if (!hasOverlap) {
      slots.push(formatTimeDisplay(t.toTimeString().slice(0, 8)));
    }
  }

  return slots;
}

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

export async function processIncomingMessage(
  psid: string,
  text: string,
): Promise<void> {
  const conversation = await findOrCreateConversation(psid);
  await saveMessage(conversation.id, "inbound", text);

  if (conversation.status === "taken_over") {
    console.log(`[Booking Parser] Conversation ${conversation.id} is taken over by staff — bot paused`);
    return;
  }

  if (text === "GET_STARTED" || text === "ICE_BOOK" || text === "MENU_BOOK") {
    await sendMessengerMessage(
      psid,
      "Hello! I can help you book a dental appointment. Reply with \"book\" to get started, " +
        "or tell me what you'd like to do (e.g., \"I want to book an appointment\").",
    );
    return;
  }

  if (text === "MENU_HOURS" || text === "ICE_HOURS") {
    await sendMessengerMessage(
      psid,
      "Our clinic is open Monday to Friday, 9:00 AM to 6:00 PM, and Saturday 9:00 AM to 1:00 PM. " +
        "We're closed on Sundays and public holidays. Reply \"book\" to schedule an appointment.",
    );
    return;
  }

  if (text === "MENU_CONTACT") {
    await sendMessengerMessage(
      psid,
      "You can reach us at:\nPhone: (02) 123-4567\nEmail: info@dentalclinic.com\n" +
        "Or visit us at 123 Main Street, City. Reply \"book\" to schedule an appointment.",
    );
    return;
  }

  if (text === "MENU_CANCEL" || text === "ICE_RESCHEDULE") {
    await sendMessengerMessage(
      psid,
      "Please reply with your appointment reference number (starts with MB-) " +
        "and I'll help you with that. For example: \"MB-0001\"",
    );
    return;
  }

  if (text.startsWith("CONFIRM_")) {
    const referenceNo = text.replace("CONFIRM_", "");
    await handleConfirmResponse(psid, referenceNo);
    return;
  }

  if (text.startsWith("RESCHEDULE_")) {
    const referenceNo = text.replace("RESCHEDULE_", "");
    await handleRescheduleResponse(psid, referenceNo);
    return;
  }

  if (text.startsWith("CANCEL_")) {
    const referenceNo = text.replace("CANCEL_", "");
    await handleCancelResponse(psid, referenceNo);
    return;
  }

  const lowerTrim = text.toLowerCase().trim();
  const refMatch = lowerTrim.match(/^(confirm|reschedule|cancel)\s+(mb-[a-z0-9]+)$/);
  if (refMatch) {
    const action = refMatch[1];
    const referenceNo = refMatch[2].toUpperCase();
    if (action === "confirm") {
      await handleConfirmResponse(psid, referenceNo);
    } else if (action === "reschedule") {
      await handleRescheduleResponse(psid, referenceNo);
    } else {
      await handleCancelResponse(psid, referenceNo);
    }
    return;
  }

  if (text.toUpperCase().startsWith("MB-") && text.trim().length <= 15) {
    const referenceNo = text.trim().toUpperCase();
    await handleReferenceLookup(psid, referenceNo);
    return;
  }

  const parsed = parseIntent(text);
  const sessionKey = `${psid}`;
  const existingSession = await getSession(sessionKey);

  if (parsed.intent === "help") {
    if (existingSession) {
      const isReschedule = existingSession.step.startsWith("reschedule_");
      await sendMessengerMessage(
        psid,
        isReschedule
          ? "You're currently rescheduling an appointment. Type \"cancel\" to stop, or continue with your new date/time."
          : "You're currently in a booking session. Type \"cancel\" to stop and start over, or continue with your booking.",
      );
    } else {
      await sendMessengerMessage(
        psid,
        "Hello! I'm the dental clinic assistant. I can help you with:\n\n" +
          "• Book an appointment — say \"book\"\n" +
          "• View my bookings — say \"my bookings\"\n" +
          "• Confirm an appointment — say \"confirm\"\n" +
          "• Reschedule — say \"reschedule\"\n" +
          "• Cancel — say \"cancel\"\n\n" +
          "How can I help you today?",
      );
    }
    return;
  }

  if (parsed.intent === "cancel" && existingSession) {
    await deleteSession(sessionKey);
    await sendMessengerMessage(
      psid,
      "Booking cancelled. Type \"book\" to start a new appointment or \"help\" for options.",
    );
    return;
  }

  if (parsed.intent === "reschedule") {
    await sendMessengerMessage(
      psid,
      "Please reply with your appointment reference number (starts with MB-) and I'll help you reschedule. e.g. \"MB-0001\"",
    );
    return;
  }

  if (parsed.intent === "confirm") {
    await sendMessengerMessage(
      psid,
      "Please reply with your appointment reference number (starts with MB-) to confirm. e.g. \"MB-0001\"",
    );
    return;
  }

  if (parsed.intent === "cancel" && !existingSession) {
    await sendMessengerMessage(
      psid,
      "Please reply with your appointment reference number (starts with MB-) to cancel. e.g. \"MB-0001\"",
    );
    return;
  }

  if (parsed.intent === "view_bookings") {
    await sendUserBookings(psid);
    return;
  }

  if (parsed.intent === "unknown" && !existingSession) {
    const expired = await hasExpiredSession(psid);
    if (expired) {
      await deleteExpiredSession(psid);
      await sendMessengerMessage(
        psid,
        "Your previous session has expired. Type \"book\" to start a new appointment, \"reschedule\" to reschedule, or \"help\" for options.",
      );
    } else {
      await sendMessengerMessage(
        psid,
        "I didn't understand that. Type \"help\" to see what I can do.",
      );
    }
    return;
  }

  if (parsed.intent === "book") {
    const newSession: BookingSessionData = {
      conversationId: conversation.id,
      patientPsid: psid,
      step: "awaiting_date",
    };
    await saveSession(newSession);
    await sendMessengerMessage(
      psid,
      "Great! Let's book an appointment. What date would you like? " +
        "(e.g., \"tomorrow\", \"Monday\", or \"25/12\")",
    );
    return;
  }

  const session = existingSession;
  if (!session) {
    await sendMessengerMessage(
      psid,
      "I didn't understand. Type \"book\" to schedule an appointment or \"help\" for options.",
    );
    return;
  }

  if (session.step === "reschedule_awaiting_date") {
    const date = parseDate(text);
    if (!date) {
      await sendMessengerMessage(
        psid,
        "I couldn't understand that date. Please try: \"tomorrow\", \"Monday\", or \"DD/MM\" format. Or type \"cancel\" to stop.",
      );
      return;
    }

    const availableDentists = await getAvailableDentistsForDate(date);
    if (availableDentists.length === 0) {
      const dateFormatted = new Date(date).toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      await sendMessengerMessage(
        psid,
        `Sorry, no dentists are available on ${dateFormatted}. Please try a different date (e.g., "tomorrow", "Monday", or "25/12").`,
      );
      return;
    }

    session.collectedDate = date;
    session.step = "reschedule_awaiting_time";
    await saveSession(session);

    const dentistNames = availableDentists.map((d) => `• ${d.name} (${formatTimeDisplay(d.startTime)}–${formatTimeDisplay(d.endTime)})`).join("\n");
    await sendMessengerMessage(
      psid,
      `Great! Available dentists on this day:\n${dentistNames}\n\nWhat new time would you prefer? (e.g., "9am", "2:30pm", "14:00")\nOr type "cancel" to stop.`,
    );
    return;
  }

  if (session.step === "reschedule_awaiting_time") {
    const time = parseTime(text);
    if (!time) {
      await sendMessengerMessage(
        psid,
        "I couldn't understand that time. Please try: \"9am\", \"2:30pm\", or \"14:00\". Or type \"cancel\" to stop.",
      );
      return;
    }

    if (!session.collectedDate || !session.collectedDentistId || !session.rescheduleAppointmentId) {
      await sendMessengerMessage(psid, "Something went wrong. Please type \"reschedule\" to start again.");
      await deleteSession(sessionKey);
      return;
    }

    if (isPastDateTime(session.collectedDate, time)) {
      await sendMessengerMessage(
        psid,
        "That time has already passed. Please choose a later time or a different date. Or type \"cancel\" to stop.",
      );
      return;
    }

    const availableDentists = await getAvailableDentistsForDate(session.collectedDate);
    const reqTime = new Date(`2000-01-01T${time}`);

    const dentistsAvailableAtTime = availableDentists.filter((d) => {
      const schedStart = new Date(`2000-01-01T${d.startTime}`);
      const schedEnd = new Date(`2000-01-01T${d.endTime}`);
      return reqTime >= schedStart && reqTime < schedEnd;
    });

    if (dentistsAvailableAtTime.length === 0) {
      const timeRanges = availableDentists
        .map((d) => `• ${d.name}: ${formatTimeDisplay(d.startTime)}–${formatTimeDisplay(d.endTime)}`)
        .join("\n");
      await sendMessengerMessage(
        psid,
        `Sorry, no dentist is available at ${formatTimeDisplay(time)} on that day.\n\nAvailable hours:\n${timeRanges}\n\nPlease try a different time. Or type "cancel" to stop.`,
      );
      return;
    }

    const originalDentistStillAvailable = dentistsAvailableAtTime.find(
      (d) => d.id === session.collectedDentistId,
    );
    if (!originalDentistStillAvailable) {
      session.collectedDentistId = dentistsAvailableAtTime[0].id;
      await saveSession(session);
    }

    const supabase = getServiceClient();
    const { data: appointment } = await supabase
      .from("appointments")
      .select("total_duration, reference_no")
      .eq("id", session.rescheduleAppointmentId)
      .maybeSingle();

    if (!appointment) {
      await sendMessengerMessage(psid, "This appointment no longer exists. Type \"book\" to schedule a new one.");
      await deleteSession(sessionKey);
      return;
    }

    const conflict = await checkBookingConflict(
      session.collectedDentistId,
      session.collectedDate,
      time,
      appointment.total_duration,
      session.rescheduleAppointmentId,
    );

    if (conflict.hasConflict) {
      await sendMessengerMessage(
        psid,
        `⚠️ ${conflict.reason}\n\nPlease try a different time. Or type "cancel" to stop.`,
      );
      return;
    }

    session.collectedTime = time;
    session.step = "reschedule_awaiting_confirmation";
    await saveSession(session);

    const dateFormatted = new Date(session.collectedDate + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    await sendMessengerMessage(
      psid,
      `Please confirm your new schedule:\n\n` +
        `Reference: ${appointment.reference_no}\n` +
        `New Date: ${dateFormatted}\n` +
        `New Time: ${formatTimeDisplay(time)}\n\n` +
        `Reply "yes" to confirm or "cancel" to stop.`,
    );
    return;
  }

  if (session.step === "reschedule_awaiting_confirmation") {
    const lower = text.toLowerCase().trim();

    if (lower === "yes" || lower === "confirm" || lower === "y" || lower === "ok") {
      if (!session.collectedDate || !session.collectedTime || !session.rescheduleAppointmentId) {
        await sendMessengerMessage(psid, "Something went wrong. Please type \"reschedule\" to start again.");
        await deleteSession(sessionKey);
        return;
      }

      const supabase = getServiceClient();
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          scheduled_date: session.collectedDate,
          scheduled_time: session.collectedTime,
          dentist_id: session.collectedDentistId,
          booking_status: "rescheduled",
        })
        .eq("id", session.rescheduleAppointmentId);

      if (updateError) {
        console.error("[Booking Parser] Reschedule update error:", updateError.message, updateError.code, updateError.details);
        await sendMessengerMessage(psid, "Sorry, something went wrong updating your appointment. Please try again or call the clinic.");
        return;
      }

      const { data: appointment } = await supabase
        .from("appointments")
        .select("reference_no")
        .eq("id", session.rescheduleAppointmentId)
        .maybeSingle();

      await deleteSession(sessionKey);

      const dateFormatted = new Date(session.collectedDate + "T00:00:00").toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      await sendMessengerMessage(
        psid,
        `✅ Your appointment has been rescheduled!\n\n` +
          `Reference: ${appointment?.reference_no ?? "N/A"}\n` +
          `New Date: ${dateFormatted}\n` +
          `New Time: ${formatTimeDisplay(session.collectedTime)}\n\n` +
          `Please arrive 10 minutes before your scheduled time. See you at the clinic!`,
      );
      return;
    }

    if (lower === "no" || lower === "cancel") {
      await deleteSession(sessionKey);
      await sendMessengerMessage(
        psid,
        "Reschedule cancelled. Your appointment remains unchanged. Type \"help\" for options.",
      );
      return;
    }

    await sendMessengerMessage(
      psid,
      "Please reply \"yes\" to confirm the new schedule or \"cancel\" to stop.",
    );
    return;
  }

  if (session.step === "awaiting_date") {
    const date = parseDate(text);
    if (!date) {
      await sendMessengerMessage(
        psid,
        "I couldn't understand that date. Please try: \"tomorrow\", \"Monday\", or \"DD/MM\" format. Or type \"cancel\" to stop.",
      );
      return;
    }

    const availableDentists = await getAvailableDentistsForDate(date);
    if (availableDentists.length === 0) {
      const dateFormatted = new Date(date).toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      await sendMessengerMessage(
        psid,
        `Sorry, no dentists are available on ${dateFormatted}. The clinic is closed or all dentists are off that day.\n\nPlease try a different date (e.g., "tomorrow", "Monday", or "25/12").`,
      );
      return;
    }

    session.collectedDate = date;
    session.step = "awaiting_time";
    await saveSession(session);

    const dentistNames = availableDentists.map((d) => `• ${d.name} (${formatTimeDisplay(d.startTime)}–${formatTimeDisplay(d.endTime)})`).join("\n");
    await sendMessengerMessage(
      psid,
      `Great! Available dentists on this day:\n${dentistNames}\n\nWhat time would you prefer? (e.g., "9am", "2:30pm", "14:00")`,
    );
    return;
  }

  if (session.step === "awaiting_time") {
    const time = parseTime(text);
    if (!time) {
      await sendMessengerMessage(
        psid,
        "I couldn't understand that time. Please try: \"9am\", \"2:30pm\", or \"14:00\".",
      );
      return;
    }

    if (!session.collectedDate) {
      await sendMessengerMessage(psid, "Something went wrong. Please type \"book\" to start again.");
      await deleteSession(sessionKey);
      return;
    }

    if (isPastDateTime(session.collectedDate, time)) {
      await sendMessengerMessage(
        psid,
        "That time has already passed. Please choose a later time or a different date. Or type \"cancel\" to stop.",
      );
      return;
    }

    const availableDentists = await getAvailableDentistsForDate(session.collectedDate);
    const reqTime = new Date(`2000-01-01T${time}`);

    const dentistsAvailableAtTime = availableDentists.filter((d) => {
      const schedStart = new Date(`2000-01-01T${d.startTime}`);
      const schedEnd = new Date(`2000-01-01T${d.endTime}`);
      return reqTime >= schedStart && reqTime < schedEnd;
    });

    if (dentistsAvailableAtTime.length === 0) {
      const timeRanges = availableDentists
        .map((d) => `• ${d.name}: ${formatTimeDisplay(d.startTime)}–${formatTimeDisplay(d.endTime)}`)
        .join("\n");
      await sendMessengerMessage(
        psid,
        `Sorry, no dentist is available at ${formatTimeDisplay(time)} on that day.\n\nAvailable hours:\n${timeRanges}\n\nPlease try a different time.`,
      );
      return;
    }

    session.collectedTime = time;
    session.step = "awaiting_service";
    await saveSession(session);

    const dentistNote = dentistsAvailableAtTime.length === availableDentists.length
      ? ""
      : `\n\nDentists available at ${formatTimeDisplay(time)}: ${dentistsAvailableAtTime.map((d) => d.name).join(", ")}`;

    const services = await getActiveServices();
    if (services.length === 0) {
      await sendMessengerMessage(psid, "No services are currently available. Please call the clinic directly.");
      await deleteSession(sessionKey);
      return;
    }

    const serviceList = services.map((s, i) => `${i + 1}. ${s.name} (${s.default_duration_minutes} min)`).join("\n");
    await sendMessengerMessage(
      psid,
      `What service(s) do you need?\n\n${serviceList}\n\nReply with the number(s) — you can choose multiple, e.g. "1,3,5". Or type the service name.${dentistNote}`,
    );
    return;
  }

  if (session.step === "awaiting_service") {
    const services = await getActiveServices();
    const lower = text.toLowerCase().trim();

    const parts = lower.split(",").map((p) => p.trim()).filter(Boolean);
    const matchedIds: string[] = [];
    const matchedNames: string[] = [];

    for (const part of parts) {
      let matched = services.find((s) => s.name.toLowerCase() === part);
      if (!matched) {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= services.length) {
          matched = services[num - 1];
        }
      }
      if (!matched) {
        matched = services.find((s) => s.name.toLowerCase().includes(part));
      }
      if (matched && !matchedIds.includes(matched.id)) {
        matchedIds.push(matched.id);
        matchedNames.push(matched.name);
      }
    }

    if (matchedIds.length === 0) {
      await sendMessengerMessage(
        psid,
        "I couldn't match that service. Please reply with the number(s) or name(s) from the list. e.g. \"1\" or \"1,3,5\"",
      );
      return;
    }

    session.collectedServiceIds = matchedIds;
    session.step = "awaiting_dentist";
    await saveSession(session);

    const totalDuration = matchedIds.reduce((sum, id) => {
      const svc = services.find((s) => s.id === id);
      return sum + (svc?.default_duration_minutes ?? 30);
    }, 0);

    await sendMessengerMessage(
      psid,
      `You selected: ${matchedNames.join(", ")}\nTotal duration: ${totalDuration} minutes`,
    );

    const allDentists = await getAvailableDentistsForDate(session.collectedDate!);
    const reqTime = new Date(`2000-01-01T${session.collectedTime}`);
    const dentists = allDentists.filter((d) => {
      const schedStart = new Date(`2000-01-01T${d.startTime}`);
      const schedEnd = new Date(`2000-01-01T${d.endTime}`);
      const reqEnd = new Date(reqTime.getTime() + totalDuration * 60000);
      return reqTime >= schedStart && reqEnd <= schedEnd;
    });

    if (dentists.length === 0) {
      await sendMessengerMessage(
        psid,
        `No dentist is available at ${formatTimeDisplay(session.collectedTime!)} for ${totalDuration} minutes on that day.\n\nPlease type "book" to try a different time.`,
      );
      await deleteSession(sessionKey);
      return;
    }

    if (dentists.length === 1) {
      session.collectedDentistId = dentists[0].id;
      await saveSession(session);

      const conflict = await checkBookingConflict(
        dentists[0].id,
        session.collectedDate!,
        session.collectedTime!,
        totalDuration,
      );

      if (conflict.hasConflict) {
        const serviceDetails = matchedIds.map((id) => {
          const svc = services.find((s) => s.id === id)!;
          return { id: svc.id, name: svc.name, duration: svc.default_duration_minutes };
        });

        const split = await trySplitServices(
          dentists[0].id,
          session.collectedDate!,
          session.collectedTime!,
          serviceDetails,
        );

        if (split.fitsNow.length > 0 && split.remaining.length > 0) {
          const fitsNames = split.fitsNow.map((s) => s.name).join(", ");
          const fitsDuration = split.fitsNow.reduce((sum, s) => sum + s.duration, 0);
          const remainingNames = split.remaining.map((s) => s.name).join(", ");
          const remainingDuration = split.remaining.reduce((sum, s) => sum + s.duration, 0);

          let msg = `⚠️ You requested ${matchedNames.join(", ")} at ${formatTimeDisplay(session.collectedTime!)}, but there's only ${split.availableUntil ? formatTimeDisplay(split.availableUntil) : "limited time"} available.\n\n`;
          msg += `✅ Can fit now: ${fitsNames} (${fitsDuration} min)\n`;
          msg += `⏳ Need separate booking: ${remainingNames} (${remainingDuration} min)`;

          if (split.nextSlotForRemaining) {
            msg += `\n\nNext available slot for the remaining service(s): ${split.nextSlotForRemaining}`;
          }

          session.collectedServiceIds = split.fitsNow.map((s) => s.id);
          session.step = "awaiting_confirmation";
          await saveSession(session);

          msg += `\n\nReply "yes" to book ${fitsNames} now${split.nextSlotForRemaining ? `, then type "book" for the remaining service(s)` : ""}. Reply "no" to cancel.`;
          await sendMessengerMessage(psid, msg);
          return;
        }

        const slots = await getAvailableTimeSlots(dentists[0].id, session.collectedDate!, totalDuration);
        let msg = `⚠️ ${conflict.reason}`;
        if (slots.length > 0) {
          msg += `\n\nAvailable time slots with ${dentists[0].name} on this day:\n${slots.slice(0, 8).map((s) => `• ${s}`).join("\n")}`;
          msg += `\n\nPlease type "book" to try one of these times.`;
        } else {
          msg += `\n\nPlease type "book" to try a different date or time.`;
        }
        await sendMessengerMessage(psid, msg);
        await deleteSession(sessionKey);
        return;
      }

      session.step = "awaiting_confirmation";
      await saveSession(session);
      await sendBookingSummary(session, psid, dentists[0].name, matchedNames, totalDuration);
      return;
    }

    const dentistList = dentists.map((d, i) => `${i + 1}. ${d.name} (${formatTimeDisplay(d.startTime)}–${formatTimeDisplay(d.endTime)})`).join("\n");
    await sendMessengerMessage(
      psid,
      `Which dentist?\n\n${dentistList}\n\nReply with the number.`,
    );
    return;
  }

  if (session.step === "awaiting_dentist") {
    if (!session.collectedDate || !session.collectedTime) {
      await sendMessengerMessage(psid, "Session expired. Please type \"book\" to start again.");
      await deleteSession(sessionKey);
      return;
    }

    const services = await getActiveServices();
    const totalDuration = (session.collectedServiceIds ?? []).reduce((sum, id) => {
      const svc = services.find((s) => s.id === id);
      return sum + (svc?.default_duration_minutes ?? 30);
    }, 0);

    const allDentists = await getAvailableDentistsForDate(session.collectedDate);
    const reqTime = new Date(`2000-01-01T${session.collectedTime}`);
    const dentists = allDentists.filter((d) => {
      const schedStart = new Date(`2000-01-01T${d.startTime}`);
      const schedEnd = new Date(`2000-01-01T${d.endTime}`);
      const reqEnd = new Date(reqTime.getTime() + totalDuration * 60000);
      return reqTime >= schedStart && reqEnd <= schedEnd;
    });

    const num = parseInt(text, 10);

    if (isNaN(num) || num < 1 || num > dentists.length) {
      await sendMessengerMessage(psid, "Please reply with the number next to the dentist's name.");
      return;
    }

    session.collectedDentistId = dentists[num - 1].id;
    await saveSession(session);

    const matchedNames = (session.collectedServiceIds ?? [])
      .map((id) => services.find((s) => s.id === id)?.name ?? "Unknown")
      .filter((n) => n !== "Unknown");

    const conflict = await checkBookingConflict(
      dentists[num - 1].id,
      session.collectedDate!,
      session.collectedTime!,
      totalDuration,
    );

    if (conflict.hasConflict) {
      const serviceDetails = (session.collectedServiceIds ?? []).map((id) => {
        const svc = services.find((s) => s.id === id)!;
        return { id: svc.id, name: svc.name, duration: svc.default_duration_minutes };
      });

      const split = await trySplitServices(
        dentists[num - 1].id,
        session.collectedDate!,
        session.collectedTime!,
        serviceDetails,
      );

      if (split.fitsNow.length > 0 && split.remaining.length > 0) {
        const fitsNames = split.fitsNow.map((s) => s.name).join(", ");
        const fitsDuration = split.fitsNow.reduce((sum, s) => sum + s.duration, 0);
        const remainingNames = split.remaining.map((s) => s.name).join(", ");
        const remainingDuration = split.remaining.reduce((sum, s) => sum + s.duration, 0);

        let msg = `⚠️ You requested ${matchedNames.join(", ")} at ${formatTimeDisplay(session.collectedTime!)}, but there's only ${split.availableUntil ? formatTimeDisplay(split.availableUntil) : "limited time"} available.\n\n`;
        msg += `✅ Can fit now: ${fitsNames} (${fitsDuration} min)\n`;
        msg += `⏳ Need separate booking: ${remainingNames} (${remainingDuration} min)`;

        if (split.nextSlotForRemaining) {
          msg += `\n\nNext available slot for the remaining service(s): ${split.nextSlotForRemaining}`;
        }

        session.collectedServiceIds = split.fitsNow.map((s) => s.id);
        session.step = "awaiting_confirmation";
        await saveSession(session);

        msg += `\n\nReply "yes" to book ${fitsNames} now${split.nextSlotForRemaining ? `, then type "book" for the remaining service(s)` : ""}. Reply "no" to cancel.`;
        await sendMessengerMessage(psid, msg);
        return;
      }

      const slots = await getAvailableTimeSlots(dentists[num - 1].id, session.collectedDate!, totalDuration);
      let msg = `⚠️ ${conflict.reason}`;
      if (slots.length > 0) {
        msg += `\n\nAvailable time slots with ${dentists[num - 1].name} on this day:\n${slots.slice(0, 8).map((s) => `• ${s}`).join("\n")}`;
        msg += `\n\nPlease type "book" to try one of these times.`;
      } else {
        msg += `\n\nPlease type "book" to try a different date or time.`;
      }
      await sendMessengerMessage(psid, msg);
      await deleteSession(sessionKey);
      return;
    }

    session.step = "awaiting_confirmation";
    await saveSession(session);
    await sendBookingSummary(session, psid, dentists[num - 1].name, matchedNames, totalDuration);
    return;
  }

  if (session.step === "awaiting_confirmation") {
    const lower = text.toLowerCase().trim();
    if (lower === "yes" || lower === "confirm" || lower === "y" || lower === "ok") {
      session.step = "complete";
      await saveSession(session);
      await finalizeBooking(session, psid);
      await deleteSession(sessionKey);
      return;
    }
    if (lower === "no" || lower === "cancel" || lower === "n" || lower === "change") {
      await deleteSession(sessionKey);
      await sendMessengerMessage(
        psid,
        "Booking cancelled. Type \"book\" to start a new appointment.",
      );
      return;
    }
    await sendMessengerMessage(
      psid,
      "Please reply \"yes\" to confirm your booking or \"no\" to cancel.",
    );
    return;
  }
}

async function findOrCreatePlaceholderPatient(psid: string): Promise<string> {
  const existingId = await findPatientByPsid(psid);
  if (existingId) return existingId;

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("patients")
    .insert({
      first_name: "Messenger",
      last_name: `User ${psid.slice(-6)}`,
      contact_no: "0000000000",
      messenger_psid: psid,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[Booking Parser] Failed to create placeholder patient:", error?.message);
    throw new Error("Failed to create placeholder patient");
  }

  return data.id;
}

async function sendUserBookings(psid: string): Promise<void> {
  const supabase = getServiceClient();

  const patientId = await findPatientByPsid(psid);
  if (!patientId) {
    await sendMessengerMessage(
      psid,
      "You don't have any bookings yet. Type \"book\" to schedule an appointment.",
    );
    return;
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select(`
      reference_no,
      scheduled_date,
      scheduled_time,
      total_duration,
      booking_status,
      dentists(user_id)
    `)
    .eq("patient_id", patientId)
    .eq("is_archived", false)
    .order("scheduled_date", { ascending: false })
    .limit(10);

  if (!appointments || appointments.length === 0) {
    await sendMessengerMessage(
      psid,
      "You don't have any bookings yet. Type \"book\" to schedule an appointment.",
    );
    return;
  }

  const activeStatuses = ["pending", "approved", "confirmed", "rescheduled", "reschedule_required"];
  const active = appointments.filter((a) => activeStatuses.includes(a.booking_status));
  const recent = appointments.filter((a) => !activeStatuses.includes(a.booking_status));

  const dentistNames = new Map<string, string>();
  for (const a of appointments) {
    const d = Array.isArray(a.dentists) ? a.dentists[0] : a.dentists;
    if (d?.user_id && !dentistNames.has(d.user_id)) {
      const { data: userData } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", d.user_id)
        .single();
      if (userData) {
        dentistNames.set(d.user_id, `${userData.first_name} ${userData.last_name}`);
      }
    }
  }

  let msg = "";

  if (active.length > 0) {
    msg += "📋 Your Active Appointments:\n\n";
    for (const a of active) {
      const d = Array.isArray(a.dentists) ? a.dentists[0] : a.dentists;
      const dentistName = d?.user_id ? (dentistNames.get(d.user_id) ?? "TBD") : "TBD";
      const dateFormatted = new Date(a.scheduled_date + "T00:00:00").toLocaleDateString("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      msg += `• ${a.reference_no} — ${dateFormatted} at ${formatTimeDisplay(a.scheduled_time)} (${a.booking_status})\n  Dentist: ${dentistName}\n`;
    }
  }

  if (recent.length > 0) {
    msg += "\n📜 Recent Appointments:\n\n";
    for (const a of recent.slice(0, 3)) {
      const dateFormatted = new Date(a.scheduled_date + "T00:00:00").toLocaleDateString("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      msg += `• ${a.reference_no} — ${dateFormatted} at ${formatTimeDisplay(a.scheduled_time)} (${a.booking_status})\n`;
    }
  }

  msg += "\nType \"reschedule\" or \"cancel\" with your reference number to make changes. Or \"book\" for a new appointment.";

  await sendMessengerMessage(psid, msg);
}

async function sendBookingSummary(
  session: BookingSessionData,
  psid: string,
  dentistName: string,
  serviceNames: string[],
  totalDuration: number,
): Promise<void> {
  if (!session.collectedDate || !session.collectedTime) return;

  const dateFormatted = new Date(session.collectedDate).toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const services = await getActiveServices();
  const totalCost = (session.collectedServiceIds ?? []).reduce((sum, id) => {
    const svc = services.find((s) => s.id === id);
    return sum + Number(svc?.default_price ?? 0);
  }, 0);

  await sendMessengerMessage(
    psid,
    `📋 Booking Summary\n\n` +
      `Date: ${dateFormatted}\n` +
      `Time: ${formatTimeDisplay(session.collectedTime)}\n` +
      `Service(s): ${serviceNames.join(", ")}\n` +
      `Duration: ${totalDuration} minutes\n` +
      `Dentist: ${dentistName}\n` +
      (totalCost > 0 ? `Estimated cost: ₱${totalCost.toFixed(2)}\n` : "") +
      `\nReply "yes" to confirm or "no" to cancel.`,
  );
}

async function finalizeBooking(session: BookingSessionData, psid: string): Promise<void> {
  if (!session.collectedDate || !session.collectedTime || !session.collectedServiceIds?.length || !session.collectedDentistId) {
    await sendMessengerMessage(psid, "Something went wrong with your booking. Please try again by typing \"book\".");
    return;
  }

  let patientId: string;
  try {
    patientId = await findOrCreatePlaceholderPatient(psid);
  } catch {
    await sendMessengerMessage(
      psid,
      "Sorry, I couldn't process your booking right now. Please try again or call the clinic.",
    );
    return;
  }

  const supabase = getServiceClient();
  const { count: pendingCount } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("is_archived", false)
    .in("booking_status", ["pending", "approved", "confirmed"]);

  if ((pendingCount ?? 0) >= 3) {
    await sendMessengerMessage(
      psid,
      "You already have 3 active appointments. Please cancel or complete one before booking another. Type \"my bookings\" to see your appointments, or call the clinic for assistance.",
    );
    return;
  }

  const services = await getActiveServices();
  const totalDuration = (session.collectedServiceIds ?? []).reduce((sum, id) => {
    const svc = services.find((s) => s.id === id);
    return sum + (svc?.default_duration_minutes ?? 30);
  }, 0);

  const conflict = await checkBookingConflict(
    session.collectedDentistId,
    session.collectedDate,
    session.collectedTime,
    totalDuration,
  );

  if (conflict.hasConflict) {
    await sendMessengerMessage(
      psid,
      `⚠️ Booking conflict: ${conflict.reason}\n\nPlease type "book" to try a different date or time.`,
    );
    return;
  }

  const result = await createPendingAppointment(
    patientId,
    session.collectedDentistId,
    session.collectedDate,
    session.collectedTime,
    session.collectedServiceIds,
  );

  if (!result) {
    await sendMessengerMessage(
      psid,
      "Sorry, I couldn't create your appointment. Please try again or call the clinic.",
    );
    return;
  }

  const dateFormatted = new Date(session.collectedDate).toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const serviceNames = (session.collectedServiceIds ?? [])
    .map((id) => services.find((s) => s.id === id)?.name ?? "Unknown")
    .filter((n) => n !== "Unknown");

  await sendMessengerMessage(
    psid,
    `✅ Your appointment request has been received!\n\n` +
      `Reference: ${result.referenceNo}\n` +
      `Date: ${dateFormatted}\n` +
      `Time: ${formatTimeDisplay(session.collectedTime)}\n` +
      `Service(s): ${serviceNames.join(", ")}\n` +
      `Duration: ${totalDuration} minutes\n\n` +
      `Our staff will review and confirm your appointment. You'll receive a message once it's approved.`,
  );

  await saveMessage(session.conversationId, "outbound", `Appointment confirmation sent — Ref: ${result.referenceNo}`);
}

async function handleReferenceLookup(psid: string, referenceNo: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      scheduled_date,
      scheduled_time,
      total_duration,
      booking_status,
      dentist_id,
      patient_id
    `)
    .eq("reference_no", referenceNo)
    .maybeSingle();

  if (!appointment) {
    await sendMessengerMessage(psid, `I couldn't find appointment ${referenceNo}. Please check your reference number.`);
    return;
  }

  const patientId = await findPatientByPsid(psid);
  if (appointment.patient_id !== patientId) {
    await sendMessengerMessage(psid, `I couldn't find appointment ${referenceNo} under your account. Please check your reference number.`);
    return;
  }

  const { data: dentist } = await supabase
    .from("dentists")
    .select("user_id")
    .eq("id", appointment.dentist_id)
    .single();

  let dentistName = "TBD";
  if (dentist?.user_id) {
    const { data: userData } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", dentist.user_id)
      .single();
    if (userData) {
      dentistName = `${userData.first_name} ${userData.last_name}`;
    }
  }

  const { data: apptServices } = await supabase
    .from("appointment_services")
    .select("dental_services(name)")
    .eq("appointment_id", appointment.id);

  const serviceNames = (apptServices ?? [])
    .map((as: { dental_services: { name: string }[] }) => as.dental_services[0]?.name)
    .filter((n): n is string => Boolean(n));

  const dateFormatted = new Date(appointment.scheduled_date + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let msg = `📋 Appointment Details:\n\n`;
  msg += `Reference: ${appointment.reference_no}\n`;
  msg += `Date: ${dateFormatted}\n`;
  msg += `Time: ${formatTimeDisplay(appointment.scheduled_time)}\n`;
  if (serviceNames.length > 0) {
    msg += `Service(s): ${serviceNames.join(", ")}\n`;
  }
  if (appointment.total_duration) {
    msg += `Duration: ${appointment.total_duration} minutes\n`;
  }
  msg += `Dentist: ${dentistName}\n`;
  msg += `Status: ${appointment.booking_status}\n`;

  const activeStatuses = ["pending", "approved", "confirmed", "rescheduled", "reschedule_required"];
  if (activeStatuses.includes(appointment.booking_status)) {
    msg += `\nWhat would you like to do?\n`;
    msg += `• Reply "confirm ${appointment.reference_no}" to confirm\n`;
    msg += `• Reply "reschedule ${appointment.reference_no}" to reschedule\n`;
    msg += `• Reply "cancel ${appointment.reference_no}" to cancel`;
  } else {
    msg += `\nThis appointment is no longer active. Type "book" to schedule a new one.`;
  }

  await sendMessengerMessage(psid, msg);
}

async function handleConfirmResponse(psid: string, referenceNo: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, booking_status")
    .eq("reference_no", referenceNo)
    .maybeSingle();

  if (!appointment) {
    await sendMessengerMessage(psid, `I couldn't find appointment ${referenceNo}. Please check your reference number.`);
    return;
  }

  if (appointment.booking_status !== "approved" && appointment.booking_status !== "confirmed") {
    await sendMessengerMessage(
      psid,
      `Your appointment (${referenceNo}) is still pending approval. Our staff will review it shortly.`,
    );
    return;
  }

  const { error: confirmError } = await supabase
    .from("appointments")
    .update({ booking_status: "confirmed" })
    .eq("id", appointment.id);

  if (confirmError) {
    await sendMessengerMessage(psid, `Sorry, something went wrong confirming ${referenceNo}. Please try again or call the clinic.`);
    return;
  }

  await sendMessengerMessage(
    psid,
    `✅ Thank you for confirming your appointment (${referenceNo}). We'll see you at the clinic!`,
  );
}

async function handleRescheduleResponse(psid: string, referenceNo: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, booking_status, scheduled_date, scheduled_time, dentist_id, total_duration, patient_id")
    .eq("reference_no", referenceNo)
    .maybeSingle();

  if (!appointment) {
    await sendMessengerMessage(psid, `I couldn't find appointment ${referenceNo}. Please check your reference number.`);
    return;
  }

  const patientId = await findPatientByPsid(psid);
  if (appointment.patient_id !== patientId) {
    await sendMessengerMessage(psid, `I couldn't find appointment ${referenceNo} under your account. Please check your reference number.`);
    return;
  }

  const activeStatuses = ["approved", "confirmed", "rescheduled", "reschedule_required"];
  if (!activeStatuses.includes(appointment.booking_status)) {
    await sendMessengerMessage(
      psid,
      `Appointment ${referenceNo} cannot be rescheduled (current status: ${appointment.booking_status}). Type "book" to schedule a new appointment.`,
    );
    return;
  }

  const { data: conversation } = await supabase
    .from("messenger_conversations")
    .select("id")
    .eq("patient_psid", psid)
    .maybeSingle();

  if (!conversation) {
    await sendMessengerMessage(psid, "Something went wrong. Please try again or call the clinic.");
    return;
  }

  const session: BookingSessionData = {
    conversationId: conversation.id,
    patientPsid: psid,
    step: "reschedule_awaiting_date",
    collectedDentistId: appointment.dentist_id,
    collectedServiceIds: [],
    rescheduleAppointmentId: appointment.id,
  };
  await saveSession(session);

  const currentDate = new Date(appointment.scheduled_date + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  await sendMessengerMessage(
    psid,
    `📅 Rescheduling appointment ${referenceNo}\n` +
      `Current: ${currentDate} at ${formatTimeDisplay(appointment.scheduled_time)}\n\n` +
      `What new date would you like? (e.g., "tomorrow", "Monday", or "25/12")\n` +
      `Or type "cancel" to stop.`,
  );
}

async function handleCancelResponse(psid: string, referenceNo: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, booking_status")
    .eq("reference_no", referenceNo)
    .maybeSingle();

  if (!appointment) {
    await sendMessengerMessage(psid, `I couldn't find appointment ${referenceNo}. Please check your reference number.`);
    return;
  }

  const { error: cancelError } = await supabase
    .from("appointments")
    .update({ booking_status: "pending_cancellation" })
    .eq("id", appointment.id);

  if (cancelError) {
    await sendMessengerMessage(psid, `Sorry, something went wrong with your cancellation request for ${referenceNo}. Please try again or call the clinic.`);
    return;
  }

  await sendMessengerMessage(
    psid,
    `🚫 Your cancellation request for appointment ${referenceNo} has been received. ` +
      `Our staff will process it shortly. If this was a mistake, please call the clinic.`,
  );
}

export async function notifyAffectedPatients(
  dentistId: string,
  startDate: string,
  endDate: string,
  reason: string,
): Promise<number> {
  const supabase = getServiceClient();

  const { data: dentist } = await supabase
    .from("dentists")
    .select("user_id")
    .eq("id", dentistId)
    .single();

  let dentistName = "your dentist";
  if (dentist) {
    const { data: userData } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", dentist.user_id)
      .single();
    if (userData) {
      dentistName = `Dr. ${userData.first_name} ${userData.last_name}`;
    }
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, reference_no, patient_id, scheduled_date, scheduled_time")
    .eq("dentist_id", dentistId)
    .eq("is_archived", false)
    .in("booking_status", ["reschedule_required"])
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate);

  if (!appointments || appointments.length === 0) return 0;

  const patientIds = [...new Set(appointments.map((a) => a.patient_id))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, messenger_psid, first_name")
    .in("id", patientIds);

  const patientMap = new Map(patients?.map((p) => [p.id, p]) ?? []);

  let notifiedCount = 0;
  for (const appt of appointments) {
    const patient = patientMap.get(appt.patient_id);
    if (!patient?.messenger_psid) continue;

    const dateFormatted = new Date(appt.scheduled_date + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    await sendMessengerMessage(
      patient.messenger_psid,
      `⚠️ Important: Your appointment with ${dentistName} on ${dateFormatted} at ${formatTimeDisplay(appt.scheduled_time)} ` +
        `(Ref: ${appt.reference_no}) needs to be rescheduled due to: ${reason}.\n\n` +
        `Please reply "reschedule ${appt.reference_no}" to pick a new date/time, or call the clinic for assistance.`,
    );
    notifiedCount++;
  }

  return notifiedCount;
}
