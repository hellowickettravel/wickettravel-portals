import { createClient } from "@/lib/supabase/server";
import type { Message } from "./types";

/**
 * Messages access. RLS limits messages to conversations the caller can see.
 * Inserts (sending) are added in Batch 3c behind the same RLS insert policy.
 */

const MESSAGE_COLUMNS =
  "id, conversation_id, direction, body, media_url, sender_id, created_at";

/** Messages for a conversation, oldest first (chat order). */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  if (error) throw error;
  return data ?? [];
}
