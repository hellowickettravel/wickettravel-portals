"use server";

import { randomUUID } from "crypto";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  PARENT_TICKET_STATUSES,
  type ParentTicketEnquiry,
  type ParentTicketListItem,
  type ParentTicketNote,
  type ParentTicketStatus,
} from "@/lib/parents-tickets";

/**
 * Admin-only server actions for Parents Tickets leads. All reads/writes run
 * through the RLS-aware client — the parent_ticket_enquiries policies grant
 * admin everything and everyone else nothing, so RLS is the real gate;
 * requireAdmin here just gives clean errors instead of empty results.
 */

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
  "id, reference_number, enquiry_type, full_name, email, phone, from_location, to_location, travel_date, status, created_at";

/** Every lead, newest first (admin list view). */
export async function listParentTickets(): Promise<ParentTicketListItem[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_enquiries")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<ParentTicketListItem[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Full lead, or null if not found. */
export async function getParentTicket(
  id: string
): Promise<ParentTicketEnquiry | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_ticket_enquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle<ParentTicketEnquiry>();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/** Change a lead's lifecycle status. */
export async function setParentTicketStatus(input: {
  id: string;
  status: ParentTicketStatus;
}): Promise<ActionResult> {
  await requireAdmin();
  if (!PARENT_TICKET_STATUSES.includes(input.status)) {
    return { ok: false, error: "Invalid status." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_ticket_enquiries")
    .update({ status: input.status })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Append a timestamped internal note. Returns the saved note. */
export async function addParentTicketNote(input: {
  id: string;
  body: string;
}): Promise<DataResult<ParentTicketNote>> {
  await requireAdmin();
  const body = input.body.trim().slice(0, MAX_NOTE_LEN);
  if (!body) return { ok: false, error: "Note can't be empty." };

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("parent_ticket_enquiries")
    .select("admin_notes")
    .eq("id", input.id)
    .maybeSingle<{ admin_notes: ParentTicketNote[] }>();
  if (readError || !current) {
    return { ok: false, error: readError?.message ?? "Lead not found." };
  }

  const note: ParentTicketNote = {
    id: randomUUID(),
    body,
    created_at: new Date().toISOString(),
  };
  const notes = [
    ...(Array.isArray(current.admin_notes) ? current.admin_notes : []),
    note,
  ];

  const { error } = await supabase
    .from("parent_ticket_enquiries")
    .update({ admin_notes: notes })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: note };
}

/**
 * Count of unactioned ('new') leads — powers the sidebar badge. Fail-open to 0
 * so the admin portal still renders before APPLY_PARENTS_TICKETS.sql has been
 * applied.
 */
export async function countNewParentTickets(): Promise<number> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("parent_ticket_enquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
