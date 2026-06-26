import { createClient } from "@/lib/supabase/server";
import { withSignedOrderMedia } from "@/lib/storage-server";
import type { OrderMessage, OrderAttachment } from "./types";

/**
 * Per-order inbox reads (0016). RLS (order_messages_select_participant) scopes
 * rows to the order's participants: admin, assigned staff, or owning customer.
 * Attachment paths in media_url are resolved to short-lived signed URLs so the
 * private 'order-attachments' bucket is never exposed via a permanent link.
 */

const ORDER_MESSAGE_COLUMNS =
  "id, order_id, sender_id, sender_role, body, media_url, created_at";

const ORDER_ATTACHMENT_COLUMNS =
  "id, order_id, message_id, uploaded_by, uploader_role, storage_path, file_name, mime_type, size_bytes, created_at";

/** Messages for an order's inbox, oldest first (chat order). */
export async function getOrderMessages(orderId: string): Promise<OrderMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_messages")
    .select(ORDER_MESSAGE_COLUMNS)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .returns<OrderMessage[]>();

  if (error) throw error;
  return withSignedOrderMedia(data ?? []);
}

/** Attachment reference rows for an order (messages + pre-order note). */
export async function getOrderAttachments(
  orderId: string
): Promise<OrderAttachment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_attachments")
    .select(ORDER_ATTACHMENT_COLUMNS)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .returns<OrderAttachment[]>();

  if (error) throw error;
  return data ?? [];
}
