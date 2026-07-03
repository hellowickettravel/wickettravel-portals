"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrderMessages } from "@/lib/db/order-messages";
import { LIMITS, sanitizeText } from "@/lib/security/limits";
import { tooManyRecentRows } from "@/lib/security/rate-limit";
import type { OrderMessage, SenderRole } from "@/lib/db/types";

/**
 * Shared (all-roles) order-attachment recording. The file bytes are uploaded
 * client-side into the private 'order-attachments' bucket (storage RLS scopes
 * the path to order participants); this action then records the reference rows.
 *
 * message_id is null here — these are PRE-ORDER NOTE attachments captured by the
 * gate and kept as part of the order's record. order_attachments RLS independently
 * re-checks access (uploaded_by = me AND I can act on the order), so a caller can
 * only attach to an order they participate in.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

export type RecordedAttachment = {
  path: string;
  name: string;
  mime: string | null;
  size: number | null;
};

export async function recordOrderAttachments(input: {
  orderId: string;
  attachments: RecordedAttachment[];
}): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };
  if (input.attachments.length === 0) return { ok: true };

  const role = (profile?.role ?? null) as SenderRole | null;

  const supabase = await createClient();
  const rows = input.attachments.map((a) => ({
    order_id: input.orderId,
    message_id: null,
    uploaded_by: user.id,
    uploader_role: role,
    storage_path: a.path,
    file_name: a.name,
    mime_type: a.mime,
    size_bytes: a.size,
  }));

  const { error } = await supabase.from("order_attachments").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Per-order inbox messages, oldest first. Runs under RLS
 * (order_messages_select_participant) so a caller only ever sees the threads for
 * orders they participate in — admin (all), assigned staff, or owning customer.
 * Attachment paths are resolved to short-lived signed URLs server-side.
 */
export async function listOrderMessages(orderId: string): Promise<OrderMessage[]> {
  const { user } = await getUserAndProfile();
  if (!user) return [];
  return getOrderMessages(orderId);
}

type SendResult =
  | { ok: true; data: { message: OrderMessage } }
  | { ok: false; error: string };

/**
 * Send a message in an order's dedicated inbox (shared by all three roles). The
 * sender_role is derived from the caller's profile — never trusted from the
 * client — and RLS does the real gating:
 *   - admin: always allowed (even on completed/cancelled orders)
 *   - employee: only on orders they're assigned to
 *   - customer: only on their own order AND only while it's NOT
 *     completed/cancelled (order_is_locked) — so a locked-order send fails
 *     server-side, not just in the UI.
 *
 * An optional attachment (uploaded client-side to the private 'order-attachments'
 * bucket) is stored as the message's media_url AND recorded as an order_attachments
 * reference row tied to the new message id.
 */
export async function sendOrderMessage(input: {
  orderId: string;
  body: string;
  attachment?: RecordedAttachment | null;
}): Promise<SendResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };

  const role = (profile?.role ?? null) as SenderRole | null;
  if (role !== "admin" && role !== "employee" && role !== "customer") {
    return { ok: false, error: "Your account can't send messages here." };
  }

  const body = sanitizeText(input.body, LIMITS.MESSAGE_BODY).trim();
  const attachment = input.attachment ?? null;
  if (!body && !attachment) {
    return { ok: false, error: "Message is empty." };
  }

  // Per-sender flood guard across all order inboxes they participate in.
  if (
    await tooManyRecentRows({
      table: "order_messages",
      column: "sender_id",
      value: user.id,
      windowSec: 10,
      max: 10,
    })
  ) {
    return { ok: false, error: "You're sending messages too quickly — please slow down." };
  }

  const supabase = await createClient();

  const { data: message, error } = await supabase
    .from("order_messages")
    .insert({
      order_id: input.orderId,
      sender_id: user.id,
      sender_role: role,
      body: body || null,
      media_url: attachment?.path ?? null,
    })
    .select("id, order_id, sender_id, sender_role, body, media_url, created_at")
    .single<OrderMessage>();

  // RLS rejects a locked-order customer send (and any non-participant) here.
  if (error || !message) {
    return {
      ok: false,
      error: error?.message ?? "Couldn't send message.",
    };
  }

  // Record the attachment as a durable reference row tied to this message.
  if (attachment) {
    await supabase.from("order_attachments").insert({
      order_id: input.orderId,
      message_id: message.id,
      uploaded_by: user.id,
      uploader_role: role,
      storage_path: attachment.path,
      file_name: attachment.name,
      mime_type: attachment.mime,
      size_bytes: attachment.size,
    });
  }

  return { ok: true, data: { message } };
}
