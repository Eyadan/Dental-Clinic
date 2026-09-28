"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getServerUserContext } from "@/lib/supabase/user-context";
import { sendStaffMessage } from "@/lib/services/notification-service";
import { updateConversationStatus, saveMessage } from "@/lib/services/messenger-service";
import type { ServiceResult } from "@/lib/services/base-service";
import type { MessengerConversation, MessengerMessage, Appointment } from "@/lib/types/database";

export interface ConversationWithDetails extends MessengerConversation {
  last_message: string | null;
  last_message_at: string | null;
  patient_name: string | null;
  patient_id: string | null;
  unread_count: number;
}

function getServiceRoleSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getConversationsAction(): Promise<ServiceResult<ConversationWithDetails[]>> {
  try {
    const { userId, role } = await getServerUserContext();
    if (!userId || !role || !["admin", "reception", "dentist"].includes(role)) {
      return { success: false, error: "Unauthorized" };
    }

    const serviceClient = getServiceRoleSupabaseClient();
    const supabase = await createServerSupabaseClient();
    const queryClient = serviceClient ?? supabase;

    const { data: conversations, error } = await queryClient
      .from("messenger_conversations")
      .select("*")
      .in("status", ["active", "taken_over"])
      .order("updated_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!conversations || conversations.length === 0) {
      return { success: true, data: [] };
    }

    const convList = conversations as MessengerConversation[];
    const convIds = convList.map((c) => c.id);
    const uniquePsids = Array.from(new Set(convList.map((c) => c.patient_psid))).filter(Boolean);

    // Parallel batch query: fetch all patients, unread counts, and recent messages across all conversations in just 3 queries
    const [patientsRes, unreadRes, messagesRes] = await Promise.all([
      uniquePsids.length > 0
        ? queryClient
            .from("patients")
            .select("id, first_name, last_name, messenger_psid")
            .in("messenger_psid", uniquePsids)
        : Promise.resolve({ data: [] }),
      convIds.length > 0
        ? queryClient
            .from("messenger_messages")
            .select("conversation_id")
            .in("conversation_id", convIds)
            .eq("direction", "inbound")
            .eq("is_read", false)
        : Promise.resolve({ data: [] }),
      convIds.length > 0
        ? queryClient
            .from("messenger_messages")
            .select("conversation_id, content, sent_at")
            .in("conversation_id", convIds)
            .order("sent_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    // Build fast in-memory lookup maps
    const patientMap = new Map<string, { id: string; name: string }>();
    patientsRes.data?.forEach((p) => {
      if (p.messenger_psid) {
        patientMap.set(p.messenger_psid, {
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
        });
      }
    });

    const unreadCountMap = new Map<string, number>();
    unreadRes.data?.forEach((m) => {
      unreadCountMap.set(m.conversation_id, (unreadCountMap.get(m.conversation_id) ?? 0) + 1);
    });

    // Messages are sorted descending by sent_at, so first occurrence per conversation is the newest message
    const lastMsgMap = new Map<string, { content: string; sent_at: string }>();
    messagesRes.data?.forEach((m) => {
      if (!lastMsgMap.has(m.conversation_id)) {
        lastMsgMap.set(m.conversation_id, {
          content: m.content,
          sent_at: m.sent_at,
        });
      }
    });

    const result: ConversationWithDetails[] = convList.map((conv) => {
      const patient = patientMap.get(conv.patient_psid);
      const lastMsg = lastMsgMap.get(conv.id);
      const unreadCount = unreadCountMap.get(conv.id) ?? 0;

      return {
        ...conv,
        last_message: lastMsg?.content ?? null,
        last_message_at: lastMsg?.sent_at ?? null,
        patient_name: patient?.name ?? null,
        patient_id: patient?.id ?? null,
        unread_count: unreadCount,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch conversations",
    };
  }
}

export async function getMessagesAction(
  conversationId: string,
): Promise<ServiceResult<MessengerMessage[]>> {
  try {
    const { userId, role } = await getServerUserContext();
    if (!userId || !role || !["admin", "reception", "dentist"].includes(role)) {
      return { success: false, error: "Unauthorized" };
    }

    const serviceClient = getServiceRoleSupabaseClient();
    const supabase = await createServerSupabaseClient();
    const queryClient = serviceClient ?? supabase;

    const { data, error } = await queryClient
      .from("messenger_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as MessengerMessage[]) ?? [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch messages",
    };
  }
}

export async function takeChatAction(
  conversationId: string,
  staffId: string,
): Promise<ServiceResult<void>> {
  try {
    const serviceClient = getServiceRoleSupabaseClient();
    const supabase = await createServerSupabaseClient();
    const client = serviceClient ?? supabase;

    const { data: conv } = await client
      .from("messenger_conversations")
      .select("patient_psid")
      .eq("id", conversationId)
      .single();

    await updateConversationStatus(conversationId, "taken_over", staffId);

    if (conv?.patient_psid) {
      const takeOverMsg = "👩‍⚕️ A staff member from our clinic has joined this conversation and will assist you personally.";
      const sendResult = await sendStaffMessage(conv.patient_psid, takeOverMsg);
      if (!sendResult.success) {
        await saveMessage(conversationId, "outbound", takeOverMsg);
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to take over chat",
    };
  }
}

export async function endChatAction(
  conversationId: string,
): Promise<ServiceResult<void>> {
  try {
    const serviceClient = getServiceRoleSupabaseClient();
    const supabase = await createServerSupabaseClient();
    const client = serviceClient ?? supabase;

    const { data: conv } = await client
      .from("messenger_conversations")
      .select("patient_psid")
      .eq("id", conversationId)
      .single();

    await updateConversationStatus(conversationId, "active");

    if (conv?.patient_psid) {
      const endChatMsg = "🤖 The staff member has left the conversation. I (the assistant bot) am back to help you. Type \"help\" to see what I can do.";
      const sendResult = await sendStaffMessage(conv.patient_psid, endChatMsg);
      if (!sendResult.success) {
        await saveMessage(conversationId, "outbound", endChatMsg);
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to end chat",
    };
  }
}

export async function sendMessageAction(
  conversationId: string,
  patientPsid: string,
  content: string,
): Promise<ServiceResult<void>> {
  try {
    if (!content.trim()) {
      return { success: false, error: "Message cannot be empty" };
    }

    const result = await sendStaffMessage(patientPsid, content.trim());

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "Failed to send message",
      };
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}

export async function markAsReadAction(
  conversationId: string,
): Promise<ServiceResult<void>> {
  try {
    const { userId, role } = await getServerUserContext();
    if (!userId || !role || !["admin", "reception", "dentist"].includes(role)) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createServerSupabaseClient();
    const serviceClient = getServiceRoleSupabaseClient();
    const client = serviceClient ?? supabase;

    const { error } = await client
      .from("messenger_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("direction", "inbound")
      .eq("is_read", false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark messages as read",
    };
  }
}

export async function getPatientAppointmentsAction(
  patientId: string,
): Promise<ServiceResult<Appointment[]>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", patientId)
      .eq("is_archived", false)
      .order("scheduled_date", { ascending: false })
      .limit(5);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as Appointment[]) ?? [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch appointments",
    };
  }
}
