import { createClient } from "@/lib/supabase/server";
import { withSignedMedia } from "@/lib/storage-server";
import type { Message } from "./types";

/**
 * Messages access. RLS limits messages to conversations the caller can see.
 * Inserts (sending) are added in Batch 3c behind the same RLS insert policy.
 * Attachment paths in media_url are resolved to short-lived signed URLs here so
 * every portal renders private attachments through expiring links.
 */

const MESSAGE_COLUMNS =
  "id, conversation_id, direction, body, media_url, sender_id, reply_to_id, created_at";

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
  return withSignedMedia(data ?? []);
}
