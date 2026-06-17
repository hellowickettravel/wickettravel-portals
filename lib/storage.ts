import { createClient } from "@/lib/supabase/client";

/**
 * Shared attachment upload helper for all three message composers (employee,
 * admin, customer). Uploads to the public "attachments" Storage bucket and
 * returns the public URL + original filename for saving on message.media_url.
 */

export const ATTACHMENT_BUCKET = "attachments";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
];
export const ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.pdf";

export type UploadResult =
  | { ok: true; url: string; name: string }
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

/** A reasonably unique, path-safe object key under a per-conversation folder. */
function objectKey(prefix: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`;
}

/**
 * Upload an attachment. `prefix` groups files (e.g. the conversation id).
 * Returns the public URL on success.
 */
export async function uploadAttachment(
  file: File,
  prefix: string
): Promise<UploadResult> {
  const valid = validateAttachment(file);
  if (!valid.ok) return valid;

  const supabase = createClient();
  const key = objectKey(prefix || "misc", file.name);

  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(key);
  return { ok: true, url: data.publicUrl, name: file.name };
}
