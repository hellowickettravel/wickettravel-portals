"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SenderRole } from "@/lib/db/types";

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
