import { createClient } from "@/lib/supabase/client";

/**
 * Shared attachment upload helpers for the three message composers (employee,
 * admin, customer) and for the admin branding logo.
 *
 * SECURITY: the "attachments" bucket is PRIVATE. Customer documents (passports,
 * IDs, tickets) must never have a guessable public URL. We upload to a path
 * scoped to the conversation — `conversation/<conversation_id>/<file>` — which a
 * storage RLS policy ties to conversation access, and we store that PATH on
 * messages.media_url. Renderable URLs are short-lived SIGNED URLs generated
 * server-side at read time (see lib/storage-server.ts). The signed URL returned
 * here is only for the optimistic bubble until the query refetches.
 *
 * The "branding" bucket is a SEPARATE, PUBLIC bucket — the business logo is meant
 * to be world-readable (it shows in the portal sidebar), so it must not live in
 * the private attachments bucket.
 */

export const ATTACHMENT_BUCKET = "attachments";
export const BRANDING_BUCKET = "branding";
/** Private bucket for per-order inbox + pre-order note attachments (0016). */
export const ORDER_ATTACHMENT_BUCKET = "order-attachments";
/**
 * Private bucket for Parents Tickets ID documents
 * (APPLY_PARENTS_FULLSCOPE_0.sql). The storage policy pins every object to a
 * folder named after the uploader's own uid, so the key MUST start `<uid>/`.
 */
export const ID_DOCUMENT_BUCKET = "parent-ticket-ids";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
];
export const ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.pdf";

/** Signed-URL lifetime for attachments (seconds). */
export const SIGNED_URL_TTL = 60 * 60; // 1 hour

export type UploadResult =
  | { ok: true; url: string; name: string }
  | { ok: false; error: string };

export type AttachmentUploadResult =
  | { ok: true; path: string; url: string; name: string }
  | { ok: false; error: string };

/** Validate a file against the allowed types + size. */
export function validateAttachment(file: File): { ok: true } | { ok: false; error: string } {
  const type = file.type.toLowerCase();
  if (!ALLOWED_ATTACHMENT_TYPES.includes(type)) {
    return { ok: false, error: "Only PNG, JPG and PDF files are allowed." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "File is too large — max 10MB." };
  }
  return { ok: true };
}

/** A reasonably unique, path-safe object key under a per-prefix folder. */
function objectKey(prefix: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`;
}

/**
 * Upload a chat attachment for `conversationId` into the PRIVATE attachments
 * bucket. Returns the stored PATH (save this on messages.media_url) plus a
 * short-lived signed `url` for the optimistic bubble. The storage insert policy
 * only permits a path under `conversation/<id>/…` for a conversation the caller
 * can access, so the upload itself is access-scoped.
 */
export async function uploadAttachment(
  file: File,
  conversationId: string
): Promise<AttachmentUploadResult> {
  const valid = validateAttachment(file);
  if (!valid.ok) return valid;

  const supabase = createClient();
  const key = objectKey(`conversation/${conversationId}`, file.name);

  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  // Signed URL only for immediate optimistic display; the persisted value is the
  // path, and reads are re-signed server-side on every fetch.
  const { data: signed } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL);

  return { ok: true, path: key, url: signed?.signedUrl ?? "", name: file.name };
}

/**
 * Upload an attachment for an order's inbox (or its pre-order note) into the
 * PRIVATE 'order-attachments' bucket. Returns the stored PATH (save it on
 * order_messages.media_url / order_attachments.storage_path) plus a short-lived
 * signed `url` for optimistic display. The storage insert policy only permits a
 * path under `order/<orderId>/…` for an order the caller can access.
 */
export async function uploadOrderAttachment(
  file: File,
  orderId: string
): Promise<AttachmentUploadResult> {
  const valid = validateAttachment(file);
  if (!valid.ok) return valid;

  const supabase = createClient();
  const key = objectKey(`order/${orderId}`, file.name);

  const { error } = await supabase.storage
    .from(ORDER_ATTACHMENT_BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  const { data: signed } = await supabase.storage
    .from(ORDER_ATTACHMENT_BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL);

  return { ok: true, path: key, url: signed?.signedUrl ?? "", name: file.name };
}

/**
 * Upload a Parents Tickets ID document into the PRIVATE 'parent-ticket-ids'
 * bucket. Returns the stored PATH only — deliberately NOT a signed URL.
 *
 * An ID document is the most sensitive thing this product handles, so it is
 * never rendered back to the person who uploaded it and never held in a URL
 * that could end up in a log or a screenshot. The admin reviewing it gets a
 * freshly signed, short-lived URL server-side at the moment they open the
 * record (see signIdDocument in lib/actions/parents-marketplace.ts).
 *
 * The key is `<uid>/<file>`: the storage insert policy checks that first
 * segment against auth.uid(), so a caller physically cannot write into anyone
 * else's folder.
 */
export async function uploadIdDocument(
  file: File,
  profileId: string
): Promise<{ ok: true; path: string; name: string } | { ok: false; error: string }> {
  const valid = validateAttachment(file);
  if (!valid.ok) return valid;

  const supabase = createClient();
  const key = objectKey(profileId, file.name);

  const { error } = await supabase.storage
    .from(ID_DOCUMENT_BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path: key, name: file.name };
}

/**
 * Upload the business logo into the PUBLIC branding bucket and return its public
 * URL (saved on business_settings.logo_url). Admin-only at the storage policy
 * level. Kept separate from attachments so the private-bucket switch can't expose
 * customer documents while still serving the public logo.
 */
export async function uploadBrandingLogo(file: File): Promise<UploadResult> {
  const valid = validateAttachment(file);
  if (!valid.ok) return valid;

  const supabase = createClient();
  const key = objectKey("logo", file.name);

  const { error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(key);
  return { ok: true, url: data.publicUrl, name: file.name };
}
