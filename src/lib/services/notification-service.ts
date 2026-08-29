import { createClient } from "@supabase/supabase-js";
import { findOrCreateConversation, saveMessage } from "./messenger-service";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN ?? "";
const GRAPH_API_VERSION = process.env.MESSENGER_API_VERSION ?? "v21.0";

export type NotificationType =
  | "approval"
  | "decline"
  | "reschedule"
  | "cancellation"
  | "reminder"
  | "follow_up"
  | "custom";

export interface NotificationPayload {
  type: NotificationType;
  patientPsid: string;
  appointmentReference?: string;
  date?: string;
  time?: string;
  dentistName?: string;
  reason?: string;
  customMessage?: string;
  serviceNames?: string[];
  totalDuration?: number;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  fallbackRequired?: boolean;
}

function getServiceClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for notification service");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatMessage(payload: NotificationPayload): string {
  switch (payload.type) {
    case "approval": {
      const dateFormatted = payload.date
        ? new Date(payload.date + "T00:00:00").toLocaleDateString("en-PH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "TBD";
      const timeFormatted = payload.time ? formatTimeDisplay(payload.time) : "TBD";
      return (
        `✅ Your appointment has been approved!\n\n` +
        `Reference: ${payload.appointmentReference ?? "N/A"}\n` +
        `Date: ${dateFormatted}\n` +
        `Time: ${timeFormatted}\n` +
        (payload.serviceNames && payload.serviceNames.length > 0
          ? `Service(s): ${payload.serviceNames.join(", ")}\n`
          : "") +
        (payload.totalDuration ? `Duration: ${payload.totalDuration} minutes\n` : "") +
        `Dentist: ${payload.dentistName ?? "TBD"}\n\n` +
        `Please arrive 10 minutes before your scheduled time. See you at the clinic!`
      );
    }

    case "decline":
      return (
        `❌ We're sorry, but your appointment request could not be accommodated.\n\n` +
        `Reference: ${payload.appointmentReference ?? "N/A"}\n` +
        (payload.reason ? `Reason: ${payload.reason}\n\n` : "\n") +
        `Please call the clinic or send "book" to schedule a different time.`
      );

    case "reschedule": {
      const dateFormatted = payload.date
        ? new Date(payload.date + "T00:00:00").toLocaleDateString("en-PH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "TBD";
      const timeFormatted = payload.time ? formatTimeDisplay(payload.time) : "TBD";
      return (
        `📅 Your appointment has been rescheduled.\n\n` +
        `Reference: ${payload.appointmentReference ?? "N/A"}\n` +
        `New Date: ${dateFormatted}\n` +
        `New Time: ${timeFormatted}\n` +
        `Dentist: ${payload.dentistName ?? "TBD"}\n\n` +
        `Please confirm your attendance by replying "confirm".`
      );
    }

    case "cancellation":
      return (
        `🚫 Your appointment has been cancelled.\n\n` +
        `Reference: ${payload.appointmentReference ?? "N/A"}\n` +
        (payload.reason ? `Reason: ${payload.reason}\n\n` : "\n") +
        `If you'd like to book a new appointment, reply "book".`
      );

    case "reminder": {
      const dateFormatted = payload.date
        ? new Date(payload.date + "T00:00:00").toLocaleDateString("en-PH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "TBD";
      const timeFormatted = payload.time ? formatTimeDisplay(payload.time) : "TBD";
      return (
        `⏰ Appointment Reminder\n\n` +
        `You have an appointment tomorrow.\n\n` +
        `Reference: ${payload.appointmentReference ?? "N/A"}\n` +
        `Date: ${dateFormatted}\n` +
        `Time: ${timeFormatted}\n` +
        `Dentist: ${payload.dentistName ?? "TBD"}\n\n` +
        `Reply with:\n` +
        `• "Confirm" — to confirm your attendance\n` +
        `• "Reschedule" — to request a new time\n` +
        `• "Cancel" — to cancel`
      );
    }

    case "follow_up": {
      const dateFormatted = payload.date
        ? new Date(payload.date + "T00:00:00").toLocaleDateString("en-PH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "TBD";
      const timeFormatted = payload.time ? formatTimeDisplay(payload.time) : "TBD";
      return (
        `🦷 Follow-up Appointment Scheduled\n\n` +
        `Reference: ${payload.appointmentReference ?? "N/A"}\n` +
        `Date: ${dateFormatted}\n` +
        `Time: ${timeFormatted}\n` +
        `Dentist: ${payload.dentistName ?? "TBD"}\n\n` +
        `See you at the clinic!`
      );
    }

    case "custom":
      return payload.customMessage ?? "";

    default:
      return payload.customMessage ?? "";
  }
}

const CONFIRMED_EVENT_TAG = "CONFIRMED_EVENT_UPDATE";

type MessagingType = "RESPONSE" | "UPDATE" | "MESSAGE_TAG";

async function sendToMessenger(
  psid: string,
  text: string,
  messagingType: MessagingType = "RESPONSE",
  tag?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!PAGE_ACCESS_TOKEN) {
    console.warn("[Notification] MESSENGER_PAGE_ACCESS_TOKEN not configured — skipping send");
    return { success: false, error: "PAGE_ACCESS_TOKEN not configured" };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  const body: Record<string, unknown> = {
    recipient: { id: psid },
    messaging_type: messagingType,
    message: { text },
  };

  if (messagingType === "MESSAGE_TAG" && tag) {
    body.tag = tag;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message ?? `HTTP ${response.status}`;
      const errorCode = data?.error?.code ?? "unknown";
      console.error(`[Notification] Send API error (${errorCode}): ${errorMsg}`);
      if (errorCode === 1545041) {
        return { success: false, error: `Messaging window closed (24h expired). ${errorMsg}` };
      }
      return { success: false, error: errorMsg };
    }

    return { success: true, messageId: data?.message_id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error";
    console.error("[Notification] Failed to send:", msg);
    return { success: false, error: msg };
  }
}

async function sendQuickReplyMessage(
  psid: string,
  text: string,
  quickReplies: { title: string; payload: string }[],
  messagingType: MessagingType = "UPDATE",
  tag?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!PAGE_ACCESS_TOKEN) {
    console.warn("[Notification] MESSENGER_PAGE_ACCESS_TOKEN not configured — skipping send");
    return { success: false, error: "PAGE_ACCESS_TOKEN not configured" };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  const body: Record<string, unknown> = {
    recipient: { id: psid },
    messaging_type: messagingType,
    message: {
      text,
      quick_replies: quickReplies.map((qr) => ({
        content_type: "text",
        title: qr.title,
        payload: qr.payload,
      })),
    },
  };

  if (messagingType === "MESSAGE_TAG" && tag) {
    body.tag = tag;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message ?? `HTTP ${response.status}`;
      console.error(`[Notification] Quick reply send error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error";
    return { success: false, error: msg };
  }
}

export async function sendNotification(
  payload: NotificationPayload,
): Promise<SendResult> {
  const message = formatMessage(payload);

  if (!message) {
    return { success: false, error: "Empty message" };
  }

  const taggableTypes: NotificationType[] = ["reminder", "follow_up", "reschedule", "cancellation"];
  const useMessageTag = taggableTypes.includes(payload.type);

  const messagingType: MessagingType = useMessageTag ? "MESSAGE_TAG" : "RESPONSE";
  const tag = useMessageTag ? CONFIRMED_EVENT_TAG : undefined;

  const result = await sendToMessenger(payload.patientPsid, message, messagingType, tag);

  if (result.success) {
    try {
      const conversation = await findOrCreateConversation(payload.patientPsid);
      await saveMessage(conversation.id, "outbound", message);
    } catch (error) {
      console.error("[Notification] Failed to save outbound message:", error);
    }
  } else {
    const isWindowExpired = result.error?.includes("window") || result.error?.includes("24") || result.error?.includes("1545041");
    if (isWindowExpired) {
      console.warn(`[Notification] Messaging window expired for PSID ${payload.patientPsid} — notification type: ${payload.type}. Staff follow-up required.`);
      await createStaffNotification(payload.patientPsid, payload.type, `Messaging window expired: ${result.error}`);
    }
  }

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
    fallbackRequired: !result.success,
  };
}

export async function sendReminderWithQuickReplies(
  psid: string,
  appointmentReference: string,
  date: string,
  time: string,
  dentistName: string,
): Promise<SendResult> {
  const text =
    `⏰ Appointment Reminder\n\n` +
    `You have an appointment tomorrow.\n\n` +
    `Reference: ${appointmentReference}\n` +
    `Date: ${date}\n` +
    `Time: ${time}\n` +
    `Dentist: ${dentistName}\n\n` +
    `Please confirm your attendance:`;

  const quickReplies = [
    { title: "Confirm", payload: `CONFIRM_${appointmentReference}` },
    { title: "Reschedule", payload: `RESCHEDULE_${appointmentReference}` },
    { title: "Cancel", payload: `CANCEL_${appointmentReference}` },
  ];

  const result = await sendQuickReplyMessage(psid, text, quickReplies, "MESSAGE_TAG", CONFIRMED_EVENT_TAG);

  if (result.success) {
    try {
      const conversation = await findOrCreateConversation(psid);
      await saveMessage(conversation.id, "outbound", text);
    } catch (error) {
      console.error("[Notification] Failed to save reminder message:", error);
    }
  } else {
    const isWindowExpired = result.error?.includes("window") || result.error?.includes("24") || result.error?.includes("1545041");
    if (isWindowExpired) {
      console.warn(`[Notification] Messaging window expired for PSID ${psid} — reminder for ${appointmentReference}. Staff follow-up required.`);
      await createStaffNotification(psid, "reminder", `Messaging window expired for reminder ${appointmentReference}: ${result.error}`);
    }
  }

  return {
    success: result.success,
    error: result.error,
    fallbackRequired: !result.success,
  };
}

export async function sendStaffMessage(
  psid: string,
  text: string,
): Promise<SendResult> {
  const result = await sendToMessenger(psid, text, "RESPONSE");

  if (result.success) {
    try {
      const conversation = await findOrCreateConversation(psid);
      await saveMessage(conversation.id, "outbound", text);
    } catch (error) {
      console.error("[Notification] Failed to save staff message:", error);
    }
  }

  return {
    success: result.success,
    error: result.error,
    fallbackRequired: !result.success,
  };
}

export async function createStaffNotification(
  patientPsid: string,
  notificationType: string,
  reason: string,
): Promise<void> {
  const supabase = getServiceClient();

  await supabase.from("audit_logs").insert({
    action: "messenger_notification_failed",
    entity_type: "messenger_notification",
    metadata: {
      patient_psid: patientPsid,
      notification_type: notificationType,
      reason,
      timestamp: new Date().toISOString(),
    },
  });
}
