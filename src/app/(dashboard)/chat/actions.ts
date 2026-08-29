"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server-client";
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

export async function getConversationsAction(): Promise<ServiceResult<ConversationWithDetails[]>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: conversations, error } = await supabase
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

    const result: ConversationWithDetails[] = await Promise.all(
      (conversations as MessengerConversation[]).map(async (conv) => {
        const { data: lastMsg } = await supabase
          .from("messenger_messages")
          .select("content, sent_at, direction")
          .eq("conversation_id", conv.id)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: patient } = await supabase
          .from("patients")
          .select("id, first_name, last_name")
          .eq("messenger_psid", conv.patient_psid)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from("messenger_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("direction", "inbound")
          .eq("is_read", false);

        return {
          ...conv,
          last_message: lastMsg?.content ?? null,
          last_message_at: lastMsg?.sent_at ?? null,
          patient_name: patient ? `${patient.first_name} ${patient.last_name}` : null,
          patient_id: patient?.id ?? null,
          unread_count: unreadCount ?? 0,
        };
      }),
    );

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
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
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
    const supabase = await createServerSupabaseClient();

    const { data: conv } = await supabase
      .from("messenger_conversations")
      .select("patient_psid")
      .eq("id", conversationId)
      .single();

    await updateConversationStatus(conversationId, "taken_over", staffId);

    if (conv?.patient_psid) {
      const takeOverMsg = "👩\u200d⚕️ A staff member from our clinic has joined this conversation and will assist you personally.";
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
    const supabase = await createServerSupabaseClient();

    const { data: conv } = await supabase
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
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
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
