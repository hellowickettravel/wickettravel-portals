import { createClient } from "@/lib/supabase/server";
import { ATTACHMENT_BUCKET, SIGNED_URL_TTL } from "@/lib/storage";

/**
 * Server-side signing for PRIVATE attachment reads. messages.media_url stores an
 * object PATH (new rows) or, for legacy rows, a public URL. Either way we resolve
 * it to the object key and mint a short-lived SIGNED URL so the private bucket is
 * never exposed via a guessable/permanent link. Signing runs through the
 * RLS-aware client, so the storage read policy (conversation access) is the gate.
 */

/**
 * Resolve a stored media_url to its attachments object key.
 *   - already a path (`conversation/<id>/<file>` or legacy `<id>/<file>`) → as-is
 *   - legacy public URL (`…/storage/v1/object/public/attachments/<path>`) → <path>
 *   - any other absolute URL (e.g. an external/branding link) → null (leave alone)
 */
export function toAttachmentPath(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return value; // already a storage path
  const marker = `/attachments/`;
  const idx = value.indexOf(marker);
  if (idx === -1) return null; // not an attachments-bucket URL
  let path = value.slice(idx + marker.length).split("?")[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw */
  }
  return path || null;
}

/**
 * Replace each row's media_url with a fresh signed URL. Rows with no attachment,
 * or whose URL can't be resolved to an attachments path, are passed through
 * unchanged. Batched into a single createSignedUrls call.
 */
export async function withSignedMedia<T extends { media_url: string | null }>(
  rows: T[]
): Promise<T[]> {
  // Map each distinct media_url → its object path (skip nulls / unresolvable).
  const urlToPath = new Map<string, string>();
  for (const row of rows) {
    const url = row.media_url;
    if (!url || urlToPath.has(url)) continue;
    const path = toAttachmentPath(url);
    if (path) urlToPath.set(url, path);
  }
  if (urlToPath.size === 0) return rows;

  const paths = Array.from(new Set(urlToPath.values()));
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL);

  const pathToSigned = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) pathToSigned.set(item.path, item.signedUrl);
  }

  return rows.map((row) => {
    if (!row.media_url) return row;
    const path = urlToPath.get(row.media_url);
    const signed = path ? pathToSigned.get(path) : undefined;
    return signed ? { ...row, media_url: signed } : row;
  });
}
