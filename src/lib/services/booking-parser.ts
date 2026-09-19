import { createClient } from "@supabase/supabase-js";
import { findOrCreateConversation, saveMessage, updateConversationStatus } from "./messenger-service";
import type { MessengerConversation } from "@/lib/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN ?? "";
const GRAPH_API_VERSION = process.env.MESSENGER_API_VERSION ?? "v21.0";

type Intent = "book" | "confirm" | "reschedule" | "cancel" | "help" | "unknown" | "view_bookings" | "talk_to_staff";

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

  if (
    lower.includes("my bookings") ||
    lower.includes("my appointments") ||
    lower.includes("view booking") ||
    lower.includes("view appointment") ||
    lower === "qr_my_bookings"
  ) {
    return { intent: "view_bookings", rawText: text };
  }

  if (
    lower === "qr_talk_staff" ||
    lower === "menu_talk_staff" ||
    lower === "ice_talk_staff" ||
    lower === "staff" ||
    lower === "talk to staff" ||
    lower === "speak to staff" ||
    lower.includes("staff") ||
    lower.includes("human") ||
    lower.includes("agent") ||
    lower.includes("representative") ||
    lower.includes("receptionist") ||
    lower.includes("operator") ||
    lower.includes("talk to someone") ||
    lower.includes("speak to someone") ||
    lower.includes("speak with someone") ||
    lower.includes("talk to a person") ||
    lower.includes("talk to person") ||
    lower.includes("talk to doctor") ||
    lower.includes("talk to dentist") ||
    lower.includes("talk to human")
  ) {
    return { intent: "talk_to_staff", rawText: text };
  }

  if (lower === "qr_book" || lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) {
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

// A single bot turn frequently sends 2-4 messages back to back (e.g. a
// text reply + quick replies + a carousel). findOrCreateConversation's
// result never changes for a given PSID once the conversation exists, so
// memoize it briefly to avoid re-querying messenger_conversations for
// every message in the same turn.
const CONVERSATION_ID_CACHE_TTL_MS = 60_000;
const conversationIdCache = new Map<string, { id: string; expiresAt: number }>();

async function getConversationIdCached(psid: string): Promise<string> {
  const cached = conversationIdCache.get(psid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.id;
  }
  const conversation = await findOrCreateConversation(psid);
  conversationIdCache.set(psid, { id: conversation.id, expiresAt: Date.now() + CONVERSATION_ID_CACHE_TTL_MS });
  return conversation.id;
}

async function recordOutboundMessage(psid: string, content: string): Promise<void> {
  try {
    const conversationId = await getConversationIdCached(psid);
    await saveMessage(conversationId, "outbound", content);
  } catch (error) {
    console.error("[Booking Parser] Failed to record outbound message:", error);
  }
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
      return;
    }

    await recordOutboundMessage(psid, text);
  } catch (error) {
    console.error("[Booking Parser] Failed to send message:", error);
  }
}

interface QuickReplyOption {
  title: string;
  payload: string;
  imageUrl?: string;
}

async function sendQuickReplies(
  psid: string,
  text: string,
  replies: QuickReplyOption[],
): Promise<void> {
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
        message: {
          text,
          quick_replies: replies.map((r) => ({
            content_type: "text",
            title: r.title,
            payload: r.payload,
            ...(r.imageUrl ? { image_url: r.imageUrl } : {}),
          })),
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Booking Parser] Quick replies send error ${response.status}: ${errorBody}`);
      return;
    }

    await recordOutboundMessage(
      psid,
      `${text}\n[Options: ${replies.map((r) => r.title).join(" | ")}]`,
    );
  } catch (error) {
    console.error("[Booking Parser] Failed to send quick replies:", error);
  }
}

interface GenericTemplateElement {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons?: { type: string; title: string; payload?: string; url?: string }[];
}

async function sendGenericTemplate(
  psid: string,
  elements: GenericTemplateElement[],
): Promise<void> {
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
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: elements.map((el) => ({
                title: el.title,
                ...(el.subtitle ? { subtitle: el.subtitle } : {}),
                ...(el.imageUrl ? { image_url: el.imageUrl } : {}),
                ...(el.buttons ? { buttons: el.buttons } : {}),
              })),
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Booking Parser] Generic template send error ${response.status}: ${errorBody}`);
      return;
    }

    await recordOutboundMessage(
      psid,
      `[Cards]\n${elements
        .map((el) => (el.subtitle ? `${el.title} — ${el.subtitle}` : el.title))
        .join("\n")}`,
    );
  } catch (error) {
    console.error("[Booking Parser] Failed to send generic template:", error);
  }
}

interface ReceiptTemplateElement {
  title: string;
  subtitle?: string;
  quantity?: number;
  price: number;
  image_url?: string;
}

interface ReceiptTemplateParams {
  recipientName: string;
  orderNumber: string;
  currency: string;
  paymentMethod: string;
  summary: { totalCost: number };
  elements: ReceiptTemplateElement[];
  timestamp?: string;
  imageUrl?: string;
}

async function sendReceiptTemplate(
  psid: string,
  params: ReceiptTemplateParams,
): Promise<void> {
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
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "receipt",
              recipient_name: params.recipientName,
              order_number: params.orderNumber,
              currency: params.currency,
              payment_method: params.paymentMethod,
              ...(params.timestamp ? { timestamp: params.timestamp } : {}),
              summary: {
                total_cost: params.summary.totalCost,
              },
              elements: params.elements.map((el) => ({
                title: el.title,
                ...(el.subtitle ? { subtitle: el.subtitle } : {}),
                ...(el.quantity ? { quantity: el.quantity } : {}),
                price: el.price,
                ...(el.image_url ? { image_url: el.image_url } : {}),
              })),
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Booking Parser] Receipt template send error ${response.status}: ${errorBody}`);
      return;
    }

    await recordOutboundMessage(
      psid,
      `[Receipt] Order ${params.orderNumber} — ${params.elements
        .map((el) => el.title)
        .join(", ")} — Total: ${params.summary.totalCost} ${params.currency}`,
    );
  } catch (error) {
    console.error("[Booking Parser] Failed to send receipt template:", error);
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

async function promptDentistOrTime(
  session: BookingSessionData,
  psid: string,
  sessionKey: string,
  totalDuration: number,
  availableDentists: { id: string; name: string; startTime: string; endTime: string }[],
): Promise<void> {
  if (availableDentists.length === 1) {
    session.collectedDentistId = availableDentists[0].id;
    session.step = "awaiting_time";
    await saveSession(session);

    const slots = await getAvailableTimeSlots(availableDentists[0].id, session.collectedDate!, totalDuration);
    if (slots.length === 0) {
      await sendMessengerMessage(
        psid,
        `No time slots are available for ${totalDuration} minutes with ${availableDentists[0].name} on this date. Please type "book" to try a different date.`,
      );
      await deleteSession(sessionKey);
      return;
    }

    const timeQuickReplies: QuickReplyOption[] = [...slots]
      .map((timeStr) => ({ raw: parseTime(timeStr) ?? timeStr, display: timeStr }))
      .sort((a, b) => a.raw.localeCompare(b.raw))
      .slice(0, 10)
      .map(({ raw, display }) => ({
        title: display,
        payload: `QR_TIME_${raw}`,
      }));

    await sendQuickReplies(
      psid,
      `Dentist: ${availableDentists[0].name} (${formatTimeDisplay(availableDentists[0].startTime)}–${formatTimeDisplay(availableDentists[0].endTime)})\n\nWhat time would you prefer? (e.g., "9am", "2:30pm", "14:00")`,
      timeQuickReplies,
    );
    return;
  }

  session.step = "awaiting_dentist";
  await saveSession(session);

  const dentistQuickReplies: QuickReplyOption[] = availableDentists.slice(0, 10).map((d) => ({
    title: d.name.length > 20 ? d.name.slice(0, 20) : d.name,
    payload: `QR_DENTIST_${d.id}`,
  }));

  const dentistList = availableDentists
    .map((d, i) => `${i + 1}. ${d.name} (${formatTimeDisplay(d.startTime)}–${formatTimeDisplay(d.endTime)})`)
    .join("\n");

  await sendQuickReplies(
    psid,
    `Available dentists on this day:\n${dentistList}\n\nWhich dentist would you prefer? Reply with the name or number (e.g., "1" or "${availableDentists[0].name}").`,
    dentistQuickReplies,
  );
}

export async function processIncomingMessage(
  psid: string,
  text: string,
  displayText?: string,
): Promise<void> {
  const conversation = await findOrCreateConversation(psid);
  conversationIdCache.set(psid, { id: conversation.id, expiresAt: Date.now() + CONVERSATION_ID_CACHE_TTL_MS });
  await saveMessage(conversation.id, "inbound", displayText ?? text);

  if (conversation.status === "taken_over") {
    const lower = text.toLowerCase().trim();
    if (lower === "bot" || lower === "restart bot" || lower === "start bot" || lower === "menu") {
      await updateConversationStatus(conversation.id, "active");
      await sendMessengerMessage(
        psid,
        "The automated assistant is back. Type \"help\" to see all options or \"book\" to schedule an appointment.",
      );
      return;
    }
    console.log(`[Booking Parser] Conversation ${conversation.id} is taken over by staff — bot paused`);
    return;
  }

  if (text === "MENU_TALK_STAFF" || text === "ICE_TALK_STAFF" || text === "QR_TALK_STAFF") {
    await handleTalkToStaff(psid, conversation.id);
    return;
  }

  if (text === "GET_STARTED" || text === "ICE_BOOK") {
    await sendQuickReplies(
      psid,
      "Hello! I can help you book a dental appointment, view your bookings, or connect you with clinic staff. How can I help you today?",
      [
        { title: "Book Appointment", payload: "QR_BOOK" },
        { title: "My Bookings", payload: "QR_MY_BOOKINGS" },
        { title: "Talk to Staff", payload: "QR_TALK_STAFF" },
      ],
    );
    return;
  }

  if (text === "MENU_BOOK" || text.startsWith("MENU_BOOK_")) {
    const preselectedServiceId = text.startsWith("MENU_BOOK_") ? text.slice("MENU_BOOK_".length) : undefined;
    const newSession: BookingSessionData = {
      conversationId: conversation.id,
      patientPsid: psid,
      step: "awaiting_date",
      ...(preselectedServiceId ? { collectedServiceIds: [preselectedServiceId] } : {}),
    };
    await saveSession(newSession);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const fmt = (d: Date) => d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
    await sendQuickReplies(
      psid,
      "Great! Let's book an appointment. What date would you like? " +
        "(e.g., \"tomorrow\", \"Monday\", or \"25/12\")",
      [
        { title: `Today (${fmt(today)})`, payload: `QR_DATE_TODAY` },
        { title: `Tomorrow (${fmt(tomorrow)})`, payload: `QR_DATE_TOMORROW` },
        { title: `${fmt(dayAfter)}`, payload: `QR_DATE_DAYAFTER` },
      ],
    );
    return;
  }

  if (text === "MENU_SERVICES") {
    const services = await getActiveServices();
    if (services.length === 0) {
      await sendMessengerMessage(psid, "No services are currently available. Please call the clinic directly.");
      return;
    }

    const elements: GenericTemplateElement[] = services.slice(0, 10).map((s) => ({
      title: s.name,
      subtitle: `Duration: ${s.default_duration_minutes} min` +
        (s.default_price ? ` | Price: ₱${Number(s.default_price).toFixed(2)}` : ""),
      buttons: [
        { type: "postback", title: "Book This", payload: `MENU_BOOK_${s.id}` },
      ],
    }));

    await sendGenericTemplate(psid, elements);
    return;
  }

  if (text === "MENU_CALL") {
    await sendMessengerMessage(
      psid,
      "📞 For dental emergencies or immediate assistance, please call us at:\n" +
        "(02) 123-4567\n\n" +
        "We're available Monday to Friday, 9:00 AM to 6:00 PM, and Saturday 9:00 AM to 1:00 PM.\n" +
        "Reply \"book\" to schedule an appointment online.",
    );
    return;
  }

  if (text === "MENU_MY_APPOINTMENTS") {
    await sendUserBookings(psid);
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
      await sendQuickReplies(
        psid,
        isReschedule
          ? "You're currently rescheduling an appointment. Type \"cancel\" to stop, \"staff\" to talk to clinic staff, or continue with your new date/time."
          : "You're currently in a booking session. Type \"cancel\" to stop, \"staff\" to talk to clinic staff, or continue with your booking.",
        [
          { title: "Talk to Staff", payload: "QR_TALK_STAFF" },
          { title: "Cancel Booking", payload: "cancel" },
        ],
      );
    } else {
      await sendQuickReplies(
        psid,
        "Hello! I'm the dental clinic assistant. I can help you with:\n\n" +
          "• Book an appointment — say \"book\"\n" +
          "• View my bookings — say \"my bookings\"\n" +
          "• Confirm an appointment — say \"confirm\"\n" +
          "• Reschedule — say \"reschedule\"\n" +
          "• Cancel — say \"cancel\"\n" +
          "• Talk to clinic staff — say \"staff\"\n\n" +
          "How can I help you today?",
        [
          { title: "Book", payload: "QR_BOOK" },
          { title: "My Bookings", payload: "QR_MY_BOOKINGS" },
          { title: "Talk to Staff", payload: "QR_TALK_STAFF" },
        ],
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

  if (parsed.intent === "talk_to_staff") {
    await handleTalkToStaff(psid, conversation.id);
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
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const fmt = (d: Date) => d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
    await sendQuickReplies(
      psid,
      "Great! Let's book an appointment. What date would you like? " +
        "(e.g., \"tomorrow\", \"Monday\", or \"25/12\")",
      [
        { title: `Today (${fmt(today)})`, payload: `QR_DATE_TODAY` },
        { title: `Tomorrow (${fmt(tomorrow)})`, payload: `QR_DATE_TOMORROW` },
        { title: `${fmt(dayAfter)}`, payload: `QR_DATE_DAYAFTER` },
      ],
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
    let dateInput = text;
    if (text === "QR_DATE_TODAY") dateInput = "today";
    else if (text === "QR_DATE_TOMORROW") dateInput = "tomorrow";
    else if (text === "QR_DATE_DAYAFTER") {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      dateInput = d.toLocaleDateString("en-PH", { day: "2-digit", month: "2-digit" });
    }
    const date = parseDate(dateInput);
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
    await saveSession(session);

    if (session.collectedServiceIds && session.collectedServiceIds.length > 0) {
      const services = await getActiveServices();
      const totalDuration = session.collectedServiceIds.reduce((sum, id) => {
        const svc = services.find((s) => s.id === id);
        return sum + (svc?.default_duration_minutes ?? 30);
      }, 0);

      await promptDentistOrTime(session, psid, sessionKey, totalDuration, availableDentists);
      return;
    }

    session.step = "awaiting_service";
    await saveSession(session);

    const services = await getActiveServices();
    if (services.length === 0) {
      await sendMessengerMessage(psid, "No services are currently available. Please call the clinic directly.");
      await deleteSession(sessionKey);
      return;
    }

    const elements: GenericTemplateElement[] = services.slice(0, 10).map((s) => ({
      title: s.name,
      subtitle: `Duration: ${s.default_duration_minutes} min` +
        (s.default_price ? ` | Price: ₱${Number(s.default_price).toFixed(2)}` : ""),
      buttons: [
        { type: "postback", title: "Add This", payload: `ADD_SERVICE_${s.id}` },
      ],
    }));

    await sendMessengerMessage(
      psid,
      `What service(s) do you need? Tap "Add This" on each service you want, then type "done" when finished.`,
    );
    await sendGenericTemplate(psid, elements);
    return;
  }

  if (session.step === "awaiting_time") {
    let timeInput = text;
    if (text.startsWith("QR_TIME_")) {
      timeInput = text.replace("QR_TIME_", "");
    }
    const time = parseTime(timeInput);
    if (!time) {
      // Check if user entered a dentist name instead of time
      const availableDentists = await getAvailableDentistsForDate(session.collectedDate!);
      const cleanInput = text.toLowerCase().replace(/^dr\.?\s*/i, "").trim();
      const matchedDentist = availableDentists.find((d) => {
        const cleanName = d.name.toLowerCase().replace(/^dr\.?\s*/i, "").trim();
        return cleanName === cleanInput || cleanName.includes(cleanInput) || cleanInput.includes(cleanName);
      });

      if (matchedDentist) {
        session.collectedDentistId = matchedDentist.id;
        await saveSession(session);

        const services = await getActiveServices();
        const totalDuration = (session.collectedServiceIds ?? []).reduce((sum, id) => {
          const svc = services.find((s) => s.id === id);
          return sum + (svc?.default_duration_minutes ?? 30);
        }, 0);

        const slots = await getAvailableTimeSlots(matchedDentist.id, session.collectedDate!, totalDuration);
        const timeQuickReplies: QuickReplyOption[] = [...slots]
          .map((timeStr) => ({ raw: parseTime(timeStr) ?? timeStr, display: timeStr }))
          .sort((a, b) => a.raw.localeCompare(b.raw))
          .slice(0, 10)
          .map(({ raw, display }) => ({
            title: display,
            payload: `QR_TIME_${raw}`,
          }));

        await sendQuickReplies(
          psid,
          `You selected: ${matchedDentist.name} (${formatTimeDisplay(matchedDentist.startTime)}–${formatTimeDisplay(matchedDentist.endTime)})\n\nWhat time would you prefer? (e.g., "9am", "2:30pm", "14:00")`,
          timeQuickReplies,
        );
        return;
      }

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

    let dentistsToEvaluate = availableDentists;
    if (session.collectedDentistId) {
      const chosen = availableDentists.filter((d) => d.id === session.collectedDentistId);
      if (chosen.length > 0) {
        dentistsToEvaluate = chosen;
      }
    }

    const dentistsAvailableAtTime = dentistsToEvaluate.filter((d) => {
      const schedStart = new Date(`2000-01-01T${d.startTime}`);
      const schedEnd = new Date(`2000-01-01T${d.endTime}`);
      return reqTime >= schedStart && reqTime < schedEnd;
    });

    if (dentistsAvailableAtTime.length === 0) {
      const timeRanges = dentistsToEvaluate
        .map((d) => `• ${d.name}: ${formatTimeDisplay(d.startTime)}–${formatTimeDisplay(d.endTime)}`)
        .join("\n");
      await sendMessengerMessage(
        psid,
        `Sorry, no dentist is available at ${formatTimeDisplay(time)} on that day.\n\nAvailable hours:\n${timeRanges}\n\nPlease try a different time.`,
      );
      return;
    }

    session.collectedTime = time;
    await saveSession(session);

    const services = await getActiveServices();
    const totalDuration = (session.collectedServiceIds ?? []).reduce((sum, id) => {
      const svc = services.find((s) => s.id === id);
      return sum + (svc?.default_duration_minutes ?? 30);
    }, 0);

    const reqTime2 = new Date(`2000-01-01T${time}`);
    const dentists = dentistsToEvaluate.filter((d) => {
      const schedStart = new Date(`2000-01-01T${d.startTime}`);
      const schedEnd = new Date(`2000-01-01T${d.endTime}`);
      const reqEnd = new Date(reqTime2.getTime() + totalDuration * 60000);
      return reqTime2 >= schedStart && reqEnd <= schedEnd;
    });

    if (dentists.length === 0) {
      const timeRanges = dentistsToEvaluate
        .map((d) => `• ${d.name}: ${formatTimeDisplay(d.startTime)}–${formatTimeDisplay(d.endTime)}`)
        .join("\n");
      await sendMessengerMessage(
        psid,
        `No dentist is available at ${formatTimeDisplay(time)} for ${totalDuration} minutes on that day.\n\nAvailable hours:\n${timeRanges}\n\nPlease try a different time.`,
      );
      return;
    }

    if (dentists.length === 1) {
      session.collectedDentistId = dentists[0].id;
      await saveSession(session);

      const conflict = await checkBookingConflict(
        dentists[0].id,
        session.collectedDate!,
        time,
        totalDuration,
      );

      if (conflict.hasConflict) {
        const serviceDetails = (session.collectedServiceIds ?? []).map((id) => {
          const svc = services.find((s) => s.id === id)!;
          return { id: svc.id, name: svc.name, duration: svc.default_duration_minutes };
        });

        const split = await trySplitServices(
          dentists[0].id,
          session.collectedDate!,
          time,
          serviceDetails,
        );

        if (split.fitsNow.length > 0 && split.remaining.length > 0) {
          const fitsNames = split.fitsNow.map((s) => s.name).join(", ");
          const fitsDuration = split.fitsNow.reduce((sum, s) => sum + s.duration, 0);
          const remainingNames = split.remaining.map((s) => s.name).join(", ");
          const remainingDuration = split.remaining.reduce((sum, s) => sum + s.duration, 0);

          let msg = `You requested ${split.fitsNow.map((s) => s.name).join(", ")} at ${formatTimeDisplay(time)}, but there's only ${split.availableUntil ? formatTimeDisplay(split.availableUntil) : "limited time"} available.\n\n`;
          msg += `Can fit now: ${fitsNames} (${fitsDuration} min)\n`;
          msg += `Need separate booking: ${remainingNames} (${remainingDuration} min)`;

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
        let msg2 = conflict.reason ? `${conflict.reason}` : "Time slot conflict";
        if (slots.length > 0) {
          msg2 += `\n\nAvailable time slots with ${dentists[0].name} on this day:\n${slots.slice(0, 8).map((s) => `• ${s}`).join("\n")}`;
          msg2 += `\n\nPlease type "book" to try one of these times.`;
        } else {
          msg2 += `\n\nPlease type "book" to try a different date or time.`;
        }
        await sendMessengerMessage(psid, msg2);
        await deleteSession(sessionKey);
        return;
      }

      session.step = "awaiting_confirmation";
      await saveSession(session);
      const matchedNames = (session.collectedServiceIds ?? [])
        .map((id) => services.find((s) => s.id === id)?.name ?? "Unknown")
        .filter((n) => n !== "Unknown");
      await sendBookingSummary(session, psid, dentists[0].name, matchedNames, totalDuration);
      return;
    }

    session.step = "awaiting_dentist";
    await saveSession(session);

    const dentistList = dentists.map((d, i) => `${i + 1}. ${d.name} (${formatTimeDisplay(d.startTime)}–${formatTimeDisplay(d.endTime)})`).join("\n");
    await sendMessengerMessage(
      psid,
      `Which dentist?\n\n${dentistList}\n\nReply with the number or name.`,
    );
    return;
  }

  if (session.step === "awaiting_service") {
    const services = await getActiveServices();

    if (text.startsWith("ADD_SERVICE_")) {
      const serviceId = text.replace("ADD_SERVICE_", "");
      const svc = services.find((s) => s.id === serviceId);
      if (!svc) {
        await sendMessengerMessage(psid, "That service is no longer available. Please try again or type \"done\" to finish.");
        return;
      }
      if (!session.collectedServiceIds) session.collectedServiceIds = [];
      if (session.collectedServiceIds.includes(serviceId)) {
        await sendMessengerMessage(psid, `"${svc.name}" is already in your selection. Tap more services or type "done" to continue.`);
        return;
      }
      session.collectedServiceIds.push(serviceId);
      await saveSession(session);
      const selectedNames = session.collectedServiceIds
        .map((id) => services.find((s) => s.id === id)?.name ?? "Unknown")
        .filter((n) => n !== "Unknown");
      await sendMessengerMessage(
        psid,
        `✅ Added: ${svc.name}\n\nYour services: ${selectedNames.join(", ")}\n\nTap "Add This" on more services, or type "done" to continue.`,
      );
      return;
    }

    if (text.toLowerCase().trim() === "done") {
      if (!session.collectedServiceIds || session.collectedServiceIds.length === 0) {
        await sendMessengerMessage(psid, "You haven't selected any services yet. Tap \"Add This\" on the services you want, or type a service name/number.");
        return;
      }
      const matchedIds = session.collectedServiceIds;
      const matchedNames = matchedIds
        .map((id) => services.find((s) => s.id === id)?.name ?? "Unknown")
        .filter((n) => n !== "Unknown");

      const totalDuration = matchedIds.reduce((sum, id) => {
        const svc = services.find((s) => s.id === id);
        return sum + (svc?.default_duration_minutes ?? 30);
      }, 0);

      await sendMessengerMessage(
        psid,
        `You selected: ${matchedNames.join(", ")}\nTotal duration: ${totalDuration} minutes`,
      );

      const availableDentists = await getAvailableDentistsForDate(session.collectedDate!);
      if (availableDentists.length === 0) {
        await sendMessengerMessage(psid, "No dentists are available on this date. Please type \"book\" to try a different date.");
        await deleteSession(sessionKey);
        return;
      }

      await promptDentistOrTime(session, psid, sessionKey, totalDuration, availableDentists);
      return;
    }

    let inputText = text;

    if (text.startsWith("QR_SERVICE_")) {
      const num = parseInt(text.replace("QR_SERVICE_", ""), 10);
      if (!isNaN(num) && num >= 1 && num <= services.length) {
        inputText = String(num);
      }
    }

    const lower = inputText.toLowerCase().trim();

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

    const totalDuration = matchedIds.reduce((sum, id) => {
      const svc = services.find((s) => s.id === id);
      return sum + (svc?.default_duration_minutes ?? 30);
    }, 0);

    await sendMessengerMessage(
      psid,
      `You selected: ${matchedNames.join(", ")}\nTotal duration: ${totalDuration} minutes`,
    );

    const availableDentists = await getAvailableDentistsForDate(session.collectedDate!);
    if (availableDentists.length === 0) {
      await sendMessengerMessage(psid, "No dentists are available on this date. Please type \"book\" to try a different date.");
      await deleteSession(sessionKey);
      return;
    }

    await promptDentistOrTime(session, psid, sessionKey, totalDuration, availableDentists);
    return;
  }

  if (session.step === "awaiting_dentist") {
    if (!session.collectedDate) {
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
    if (allDentists.length === 0) {
      await sendMessengerMessage(psid, "No dentists are available on this date. Please type \"book\" to try a different date.");
      await deleteSession(sessionKey);
      return;
    }

    let selectedDentist: { id: string; name: string; startTime: string; endTime: string } | undefined;

    if (text.startsWith("QR_DENTIST_")) {
      const dId = text.replace("QR_DENTIST_", "");
      selectedDentist = allDentists.find((d) => d.id === dId);
    } else {
      const num = parseInt(text.trim(), 10);
      if (!isNaN(num) && num >= 1 && num <= allDentists.length) {
        selectedDentist = allDentists[num - 1];
      } else {
        const cleanInput = text.toLowerCase().replace(/^dr\.?\s*/i, "").trim();
        selectedDentist = allDentists.find((d) => {
          const cleanName = d.name.toLowerCase().replace(/^dr\.?\s*/i, "").trim();
          return cleanName === cleanInput || cleanName.includes(cleanInput) || cleanInput.includes(cleanName);
        });
      }
    }

    // Check if user entered a time instead of a dentist name
    if (!selectedDentist) {
      const timeCandidate = parseTime(text);
      if (timeCandidate) {
        const reqTime = new Date(`2000-01-01T${timeCandidate}`);
        const atTime = allDentists.filter((d) => {
          const schedStart = new Date(`2000-01-01T${d.startTime}`);
          const schedEnd = new Date(`2000-01-01T${d.endTime}`);
          const reqEnd = new Date(reqTime.getTime() + totalDuration * 60000);
          return reqTime >= schedStart && reqEnd <= schedEnd;
        });

        if (atTime.length === 1) {
          selectedDentist = atTime[0];
          session.collectedTime = timeCandidate;
        } else if (atTime.length > 1) {
          session.collectedTime = timeCandidate;
          await saveSession(session);
          const dentistList = atTime.map((d, i) => `${i + 1}. ${d.name}`).join("\n");
          await sendMessengerMessage(
            psid,
            `Multiple dentists are available at ${formatTimeDisplay(timeCandidate)}:\n${dentistList}\n\nPlease reply with the number or name of your chosen dentist.`,
          );
          return;
        }
      }
    }

    if (!selectedDentist) {
      const dentistList = allDentists.map((d, i) => `${i + 1}. ${d.name}`).join("\n");
      await sendMessengerMessage(
        psid,
        `I couldn't match that dentist. Please reply with the number or name:\n\n${dentistList}`,
      );
      return;
    }

    session.collectedDentistId = selectedDentist.id;

    // If time was already collected, proceed to conflict check and summary
    if (session.collectedTime) {
      const time = session.collectedTime;
      const conflict = await checkBookingConflict(
        selectedDentist.id,
        session.collectedDate!,
        time,
        totalDuration,
      );

      const matchedNames = (session.collectedServiceIds ?? [])
        .map((id) => services.find((s) => s.id === id)?.name ?? "Unknown")
        .filter((n) => n !== "Unknown");

      if (conflict.hasConflict) {
        const serviceDetails = (session.collectedServiceIds ?? []).map((id) => {
          const svc = services.find((s) => s.id === id)!;
          return { id: svc.id, name: svc.name, duration: svc.default_duration_minutes };
        });

        const split = await trySplitServices(
          selectedDentist.id,
          session.collectedDate!,
          time,
          serviceDetails,
        );

        if (split.fitsNow.length > 0 && split.remaining.length > 0) {
          const fitsNames = split.fitsNow.map((s) => s.name).join(", ");
          const fitsDuration = split.fitsNow.reduce((sum, s) => sum + s.duration, 0);
          const remainingNames = split.remaining.map((s) => s.name).join(", ");
          const remainingDuration = split.remaining.reduce((sum, s) => sum + s.duration, 0);

          let msg = `You requested ${matchedNames.join(", ")} at ${formatTimeDisplay(session.collectedTime!)}, but there's only ${split.availableUntil ? formatTimeDisplay(split.availableUntil) : "limited time"} available.\n\n`;
          msg += `Can fit now: ${fitsNames} (${fitsDuration} min)\n`;
          msg += `Need separate booking: ${remainingNames} (${remainingDuration} min)`;

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

        const slots = await getAvailableTimeSlots(selectedDentist.id, session.collectedDate!, totalDuration);
        let msg = conflict.reason ? `${conflict.reason}` : "Time slot conflict";
        if (slots.length > 0) {
          msg += `\n\nAvailable time slots with ${selectedDentist.name} on this day:\n${slots.slice(0, 8).map((s) => `• ${s}`).join("\n")}`;
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
      await sendBookingSummary(session, psid, selectedDentist.name, matchedNames, totalDuration);
      return;
    }

    // Time is not yet collected: transition to awaiting_time with time slots for this dentist
    const slots = await getAvailableTimeSlots(selectedDentist.id, session.collectedDate!, totalDuration);
    if (slots.length === 0) {
      await sendMessengerMessage(
        psid,
        `Sorry, ${selectedDentist.name} has no available slots for ${totalDuration} minutes on this date. Please reply with another dentist or type "book" to pick a different date.`,
      );
      return;
    }

    session.step = "awaiting_time";
    await saveSession(session);

    const timeQuickReplies: QuickReplyOption[] = [...slots]
      .map((timeStr) => ({ raw: parseTime(timeStr) ?? timeStr, display: timeStr }))
      .sort((a, b) => a.raw.localeCompare(b.raw))
      .slice(0, 10)
      .map(({ raw, display }) => ({
        title: display,
        payload: `QR_TIME_${raw}`,
      }));

    await sendQuickReplies(
      psid,
      `You selected: ${selectedDentist.name} (${formatTimeDisplay(selectedDentist.startTime)}–${formatTimeDisplay(selectedDentist.endTime)})\n\nWhat time would you prefer? (e.g., "9am", "2:30pm", "14:00")`,
      timeQuickReplies,
    );
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

  const receiptElements: ReceiptTemplateElement[] = (session.collectedServiceIds ?? []).map((id) => {
    const svc = services.find((s) => s.id === id);
    return {
      title: svc?.name ?? "Unknown Service",
      subtitle: `${svc?.default_duration_minutes ?? 30} minutes`,
      quantity: 1,
      price: Number(svc?.default_price ?? 0),
    };
  });

  const totalCost = receiptElements.reduce((sum, el) => sum + el.price, 0);

  const { data: dentist } = await supabase
    .from("dentists")
    .select("user_id")
    .eq("id", session.collectedDentistId!)
    .single();

  let dentistName = "TBD";
  if (dentist?.user_id) {
    const { data: userData } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", dentist.user_id)
      .single();
    if (userData) {
      dentistName = `Dr. ${userData.first_name} ${userData.last_name}`;
    }
  }

  if (totalCost > 0) {
    await sendReceiptTemplate(psid, {
      recipientName: `Messenger User`,
      orderNumber: result.referenceNo,
      currency: "PHP",
      paymentMethod: "Pay at clinic",
      timestamp: Math.floor(Date.now() / 1000).toString(),
      summary: { totalCost },
      elements: receiptElements,
    });
  }

  await sendGenericTemplate(psid, [
    {
      title: `✅ Appointment Request Received`,
      subtitle: `${dateFormatted} at ${formatTimeDisplay(session.collectedTime!)} with ${dentistName}\nRef: ${result.referenceNo} | Duration: ${totalDuration} min`,
      imageUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400",
      buttons: [
        {
          type: "postback",
          title: "📅 Reschedule",
          payload: `RESCHEDULE_${result.referenceNo}`,
        },
        {
          type: "postback",
          title: "🚫 Cancel",
          payload: `CANCEL_${result.referenceNo}`,
        },
        {
          type: "web_url",
          title: "📍 Get Directions",
          url: "https://maps.google.com/?q=dental+clinic",
        },
      ],
    },
  ]);

  await sendMessengerMessage(
    psid,
    `Our staff will review and confirm your appointment. You'll receive a message once it's approved. ` +
      `Type "my bookings" to view your appointments.`,
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

  const { data: fullAppt } = await supabase
    .from("appointments")
    .select(`
      reference_no,
      scheduled_date,
      scheduled_time,
      dentist_id
    `)
    .eq("id", appointment.id)
    .maybeSingle();

  let dentistName = "your dentist";
  if (fullAppt?.dentist_id) {
    const { data: dentist } = await supabase
      .from("dentists")
      .select("user_id")
      .eq("id", fullAppt.dentist_id)
      .single();
    if (dentist?.user_id) {
      const { data: userData } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", dentist.user_id)
        .single();
      if (userData) {
        dentistName = `Dr. ${userData.first_name} ${userData.last_name}`;
      }
    }
  }

  if (fullAppt) {
    const dateFormatted = new Date(fullAppt.scheduled_date + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    await sendGenericTemplate(psid, [
      {
        title: `✅ Appointment Confirmed`,
        subtitle: `${dateFormatted} at ${formatTimeDisplay(fullAppt.scheduled_time)} with ${dentistName}\nRef: ${referenceNo}`,
        imageUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400",
        buttons: [
          {
            type: "postback",
            title: "📅 Reschedule",
            payload: `RESCHEDULE_${referenceNo}`,
          },
          {
            type: "web_url",
            title: "📍 Get Directions",
            url: "https://maps.google.com/?q=dental+clinic",
          },
        ],
      },
    ]);
  } else {
    await sendMessengerMessage(
      psid,
      `✅ Thank you for confirming your appointment (${referenceNo}). We'll see you at the clinic!`,
    );
  }
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

async function handleTalkToStaff(psid: string, conversationId: string): Promise<void> {
  const sessionKey = `${psid}`;
  await deleteSession(sessionKey);
  await updateConversationStatus(conversationId, "taken_over");
  await sendMessengerMessage(
    psid,
    "A clinic staff member has been notified and will assist you here shortly.\n\n" +
      "Please feel free to type your question or message, and our team will get back to you as soon as possible.\n\n" +
      "(Type \"bot\" anytime if you wish to return to the automated booking assistant.)",
  );
}
