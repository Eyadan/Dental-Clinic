import { createClient } from "@supabase/supabase-js";
import type { MessengerConversation, MessengerMessage } from "@/lib/types/database";
import type { ConversationStatus, MessageDirection } from "@/lib/types/enums";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getServiceClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for messenger service");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function findOrCreateConversation(
  patientPsid: string,
): Promise<MessengerConversation> {
  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("messenger_conversations")
    .select("*")
    .eq("patient_psid", patientPsid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing as MessengerConversation;
  }

  const { data, error } = await supabase
    .from("messenger_conversations")
    .insert({
      patient_psid: patientPsid,
      status: "active" as ConversationStatus,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message ?? "Unknown error"}`);
  }

  return data as MessengerConversation;
}

export async function saveMessage(
  conversationId: string,
  direction: MessageDirection,
  content: string,
): Promise<MessengerMessage> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("messenger_messages")
    .insert({
      conversation_id: conversationId,
      direction,
      content,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save message: ${error?.message ?? "Unknown error"}`);
  }

  return data as MessengerMessage;
}

export async function updateConversationStatus(
  conversationId: string,
  status: ConversationStatus,
  takenOverBy?: string,
): Promise<void> {
  const supabase = getServiceClient();

  const update: Record<string, unknown> = { status };
  if (takenOverBy !== undefined) {
    update.taken_over_by = takenOverBy;
    update.taken_over_at = takenOverBy ? new Date().toISOString() : null;
  }

  await supabase.from("messenger_conversations").update(update).eq("id", conversationId);
}

export async function getConversationByPsid(
  patientPsid: string,
): Promise<MessengerConversation | null> {
  const supabase = getServiceClient();

  const { data } = await supabase
    .from("messenger_conversations")
    .select("*")
    .eq("patient_psid", patientPsid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as MessengerConversation) ?? null;
}

export async function getConversations(
  status?: ConversationStatus,
): Promise<(MessengerConversation & { last_message?: string; last_message_at?: string })[]> {
  const supabase = getServiceClient();

  let query = supabase
    .from("messenger_conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: conversations } = await query;

  if (!conversations || conversations.length === 0) {
    return [];
  }

  const result = await Promise.all(
    (conversations as MessengerConversation[]).map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from("messenger_messages")
        .select("content, sent_at")
        .eq("conversation_id", conv.id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...conv,
        last_message: lastMsg?.content ?? null,
        last_message_at: lastMsg?.sent_at ?? null,
      };
    }),
  );

  return result;
}

export async function getMessages(
  conversationId: string,
): Promise<MessengerMessage[]> {
  const supabase = getServiceClient();

  const { data } = await supabase
    .from("messenger_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true });

  return (data as MessengerMessage[]) ?? [];
}
