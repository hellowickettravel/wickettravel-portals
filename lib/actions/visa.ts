"use server";

import { randomUUID } from "crypto";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SIGNED_URL_TTL } from "@/lib/storage";
import { isUuid } from "@/lib/db/errors";
import {
  VISA_STATUSES,
  type VisaAdminNote,
  type VisaEnquiry,
  type VisaEnquiryListItem,
  type VisaEnquiryStatus,
} from "@/lib/visa";

/**
 * Admin-only server actions for Dubai Visa enquiries. All reads/writes run
 * through the RLS-aware client — the visa_enquiries policies grant admin
 * everything and everyone else nothing, so RLS is the real gate; requireAdmin
 * here just gives clean errors instead of empty results.
 */

const VISA_DOCUMENTS_BUCKET = "visa-documents";
const MAX_NOTE_LEN = 2000;

type ActionResult = { ok: true } | { ok: false; error: string };
type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Throws if the caller isn't a signed-in admin. */
async function requireAdmin(): Promise<void> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

const LIST_COLUMNS =
  "id, reference_number, first_name, last_name, email, phone, visa_type, preferred_contact_method, status, created_at";

/** Every enquiry, newest first (admin list view). */
export async function listVisaEnquiries(): Promise<VisaEnquiryListItem[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visa_enquiries")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<VisaEnquiryListItem[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type SignedVisaDocument = {
  name: string;
  size: number;
  type: string;
  /** Short-lived signed URL into the private visa-documents bucket. */
  url: string;
};

export type VisaEnquiryDetail = {
  enquiry: VisaEnquiry;
  documents: SignedVisaDocument[];
};

/** Full enquiry + freshly signed document URLs, or null if not found. */
export async function getVisaEnquiry(
  id: string
): Promise<VisaEnquiryDetail | null> {
  await requireAdmin();
  // A dynamic route segment matches ANY path segment, so this is reachable
  // with junk from the URL bar. Postgres raises 22P02 on a malformed uuid,
  // which an RSC turns into a 500 — "no such record" is the honest answer.
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visa_enquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle<VisaEnquiry>();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const docs = Array.isArray(data.documents) ? data.documents : [];
  let documents: SignedVisaDocument[] = [];
  if (docs.length > 0) {
    const { data: signed } = await supabase.storage
      .from(VISA_DOCUMENTS_BUCKET)
      .createSignedUrls(
        docs.map((d) => d.path),
        SIGNED_URL_TTL
      );
    const byPath = new Map(
      (signed ?? [])
        .filter((s) => s.path && s.signedUrl)
        .map((s) => [s.path as string, s.signedUrl])
    );
    documents = docs.flatMap((d) => {
      const url = byPath.get(d.path);
      return url ? [{ name: d.name, size: d.size, type: d.type, url }] : [];
    });
  }

  return { enquiry: data, documents };
}

/** Change an enquiry's lifecycle status. */
export async function setVisaEnquiryStatus(input: {
  id: string;
  status: VisaEnquiryStatus;
}): Promise<ActionResult> {
  await requireAdmin();
  if (!VISA_STATUSES.includes(input.status)) {
    return { ok: false, error: "Invalid status." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("visa_enquiries")
    .update({ status: input.status })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Permanently delete an enquiry and the documents it uploaded. The row goes
 * first; the files are then removed best-effort (an orphaned file in a
 * private bucket is harmless, a row pointing at missing files is not).
 */
export async function deleteVisaEnquiry(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Only an admin can delete visa queries." };
  }
  if (!isUuid(id)) return { ok: false, error: "That enquiry no longer exists." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visa_enquiries")
    .delete()
    .eq("id", id)
    .select("documents");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "That enquiry no longer exists." };

  const docs = (data[0] as { documents?: unknown }).documents;
  const paths = (Array.isArray(docs) ? docs : [])
    .map((d) => (d as { path?: unknown })?.path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  if (paths.length > 0) {
    await supabase.storage.from(VISA_DOCUMENTS_BUCKET).remove(paths);
  }
  return { ok: true };
}

/** Append a timestamped internal note. Returns the saved note. */
export async function addVisaEnquiryNote(input: {
  id: string;
  body: string;
}): Promise<DataResult<VisaAdminNote>> {
  await requireAdmin();
  const body = input.body.trim().slice(0, MAX_NOTE_LEN);
  if (!body) return { ok: false, error: "Note can't be empty." };

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("visa_enquiries")
    .select("admin_notes")
    .eq("id", input.id)
    .maybeSingle<{ admin_notes: VisaAdminNote[] }>();
  if (readError || !current) {
    return { ok: false, error: readError?.message ?? "Enquiry not found." };
  }

  const note: VisaAdminNote = {
    id: randomUUID(),
    body,
    created_at: new Date().toISOString(),
  };
  const notes = [...(Array.isArray(current.admin_notes) ? current.admin_notes : []), note];

  const { error } = await supabase
    .from("visa_enquiries")
    .update({ admin_notes: notes })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: note };
}

/**
 * Count of unactioned ('new') enquiries — powers the sidebar badge. Fail-open
 * to 0 so the admin portal still renders before APPLY_VISA_ENQUIRIES.sql has
 * been applied.
 */
export async function countNewVisaEnquiries(): Promise<number> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("visa_enquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
