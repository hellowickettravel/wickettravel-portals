"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tooManyRecentRows } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIMITS, sanitizeLine, sanitizeText } from "@/lib/security/limits";
import { isMissingTable } from "@/lib/db/errors";
import { notify, notifyAdmins } from "@/lib/notify";
import type {
  SupportMessage,
  SupportTicket,
  SupportTicketStatus,
} from "@/lib/db/types";

/**
 * Support-ticket actions. Employees raise + read their own tickets (RLS:
 * support_tickets_insert_own / _select_own). Admins read + resolve every ticket
 * (support_tickets_admin_all). A DB trigger notifies admins on insert.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

const TICKET_COLUMNS =
  "id, employee_id, customer_id, submitter_role, subject, message, status, created_at, resolved_at";

type SubmitterRef = { full_name: string | null; email: string | null } | null;

/** Admin-queue shape: a ticket with both possible submitters embedded. */
export type SupportTicketWithSubmitter = SupportTicket & {
  employee: SubmitterRef;
  customer: SubmitterRef;
};

/** @deprecated kept as an alias — admin queue now uses SupportTicketWithSubmitter. */
export type SupportTicketWithEmployee = SupportTicketWithSubmitter;

/** Employee raises an internal issue. */
export async function createSupportTicket(input: {
  subject: string;
  message: string;
}): Promise<ActionResult> {
  const { user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };

  // One person opening dozens of tickets an hour is either a bug or abuse;
  // either way the queue shouldn't absorb it. Fail-open.
  if (
    await tooManyRecentRows({
      table: "support_tickets",
      column: "employee_id",
      value: user.id,
      windowSec: 60 * 60,
      max: 10,
    })
  ) {
    return { ok: false, error: "You've opened several tickets already — we'll reply to those first." };
  }

  const subject = sanitizeLine(input.subject, LIMITS.SUPPORT_SUBJECT);
  const message = sanitizeText(input.message, LIMITS.SUPPORT_BODY).trim();
  if (!subject || !message) {
    return { ok: false, error: "Subject and details are both required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("support_tickets")
    .insert({ employee_id: user.id, subject, message });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** The signed-in employee's own tickets, newest first. */
export async function listMySupportTickets(): Promise<SupportTicket[]> {
  const { user } = await getUserAndProfile();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select(TICKET_COLUMNS)
    .eq("employee_id", user.id)
    .order("created_at", { ascending: false })
    .returns<SupportTicket[]>();

  return data ?? [];
}

/** A customer raises a support query → lands in the admin Support Queries queue. */
export async function createCustomerSupportTicket(input: {
  subject: string;
  message: string;
}): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };
  // Customer portal only — keeps submitter_role honest.
  if (profile?.role !== "customer") return { ok: false, error: "Unauthorized" };

  // One person opening dozens of tickets an hour is either a bug or abuse;
  // either way the queue shouldn't absorb it. Fail-open.
  if (
    await tooManyRecentRows({
      table: "support_tickets",
      column: "customer_id",
      value: user.id,
      windowSec: 60 * 60,
      max: 10,
    })
  ) {
    return { ok: false, error: "You've opened several tickets already — we'll reply to those first." };
  }

  const subject = sanitizeLine(input.subject, LIMITS.SUPPORT_SUBJECT);
  const message = sanitizeText(input.message, LIMITS.SUPPORT_BODY).trim();
  if (!subject || !message) {
    return { ok: false, error: "Subject and details are both required." };
  }

  const supabase = await createClient();
  // RLS support_tickets_insert_customer: customer_id = auth.uid() + role 'customer'.
  const { error } = await supabase.from("support_tickets").insert({
    customer_id: user.id,
    employee_id: null,
    submitter_role: "customer",
    subject,
    message,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * A helper raises a support query.
 *
 * Separate from `createCustomerSupportTicket` only so `submitter_role` stays
 * honest — a helper is a service provider, not a customer, and the admin queue
 * filters on that. The row lands in `customer_id`, which is a `profiles(id)`
 * reference meaning "the non-staff submitter"; a helper has no `customers` row
 * by design, so there is nothing else it could be.
 *
 * Needs `sql/APPLY_HELPER_SUPPORT.sql`. Until that is run the CHECK constraint
 * and the INSERT policy both reject the row, so the error names the file
 * rather than surfacing a raw Postgres message.
 */
export async function createHelperSupportTicket(input: {
  subject: string;
  message: string;
}): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };
  if (profile?.role !== "helper") return { ok: false, error: "Unauthorized" };

  if (
    await tooManyRecentRows({
      table: "support_tickets",
      column: "customer_id",
      value: user.id,
      windowSec: 60 * 60,
      max: 10,
    })
  ) {
    return {
      ok: false,
      error: "You've opened several tickets already — we'll reply to those first.",
    };
  }

  const subject = sanitizeLine(input.subject, LIMITS.SUPPORT_SUBJECT);
  const message = sanitizeText(input.message, LIMITS.SUPPORT_BODY).trim();
  if (!subject || !message) {
    return { ok: false, error: "Subject and details are both required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("support_tickets").insert({
    customer_id: user.id,
    employee_id: null,
    submitter_role: "helper",
    subject,
    message,
  });

  if (error) {
    // 23514 = check constraint, 42501 = RLS refusal. Both mean the same thing
    // here: the migration hasn't been applied.
    if (error.code === "23514" || error.code === "42501") {
      return {
        ok: false,
        error:
          "Helper support tickets aren't enabled on this database yet — run sql/APPLY_HELPER_SUPPORT.sql.",
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** The signed-in helper's own tickets, newest first. */
export async function listMyHelperSupportTickets(): Promise<SupportTicket[]> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "helper") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select(TICKET_COLUMNS)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .returns<SupportTicket[]>();

  return data ?? [];
}

/** The signed-in customer's own tickets, newest first. */
export async function listMyCustomerSupportTickets(): Promise<SupportTicket[]> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "customer") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select(TICKET_COLUMNS)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .returns<SupportTicket[]>();

  return data ?? [];
}

/** Admin queue: every ticket with the submitting employee OR customer's name. */
export async function listAllSupportTickets(): Promise<
  SupportTicketWithSubmitter[]
> {
  const { profile } = await getUserAndProfile();
  if (profile?.role !== "admin") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select(
      `${TICKET_COLUMNS}, employee:profiles!employee_id(full_name, email), customer:profiles!customer_id(full_name, email)`
    )
    .order("created_at", { ascending: false })
    .returns<SupportTicketWithSubmitter[]>();

  return data ?? [];
}

/** Admin marks a ticket resolved/open. */
export async function setSupportTicketStatus(input: {
  id: string;
  status: SupportTicketStatus;
}): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }
  if (input.status !== "open" && input.status !== "resolved") {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: input.status,
      resolved_at: input.status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ----- Replies -----

/**
 * A support ticket used to be a one-way message: somebody typed a problem, an
 * admin read it and flipped a switch to "resolved". There was no reply
 * anywhere in the product — not a button, not a table — so every answer had to
 * leave the portal and arrive by email or phone, and the ticket never recorded
 * what was said.
 *
 * `support_messages` is the thread. Reads are RLS-scoped exactly like the
 * ticket itself (admins all, submitters their own), and everything degrades to
 * "no replies yet" on a database that hasn't had the table added, so the
 * screens render either way.
 */

const SUPPORT_MESSAGE_COLUMNS =
  "id, ticket_id, author_id, author_role, author_name, body, created_at";

/** Replies on one ticket, oldest first. `[]` if the table isn't there yet. */
export async function listSupportMessages(
  ticketId: string
): Promise<SupportMessage[]> {
  const { user } = await getUserAndProfile();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_messages")
    .select(SUPPORT_MESSAGE_COLUMNS)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .returns<SupportMessage[]>();

  if (error) {
    if (isMissingTable(error)) return [];
    return [];
  }
  return data ?? [];
}

/**
 * Post a reply. Anyone who can see the ticket can answer on it — that is the
 * whole point — and RLS decides who that is.
 *
 * Status moves on its own, which is the automation the queue was missing:
 *   - a submitter replying to a RESOLVED ticket reopens it, because a person
 *     coming back after being closed off is by definition not resolved;
 *   - an admin replying leaves it open, because answering is not the same as
 *     finishing, and "Mark resolved" is one click away when it is.
 */
export async function replyToSupportTicket(input: {
  ticketId: string;
  body: string;
}): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };

  const body = sanitizeText(input.body, LIMITS.SUPPORT_BODY).trim();
  if (!body) return { ok: false, error: "Write a reply first." };

  if (
    await tooManyRecentRows({
      table: "support_messages",
      column: "author_id",
      value: user.id,
      windowSec: 60,
      max: 20,
    })
  ) {
    return { ok: false, error: "You're replying too quickly — please slow down." };
  }

  const supabase = await createClient();

  // The ticket has to be visible to the caller before anything is written —
  // RLS would refuse the insert anyway, but this gives a readable error.
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, status, employee_id, customer_id, submitter_role, subject")
    .eq("id", input.ticketId)
    .maybeSingle<
      Pick<
        SupportTicket,
        "id" | "status" | "employee_id" | "customer_id" | "submitter_role" | "subject"
      >
    >();
  if (!ticket) return { ok: false, error: "That ticket isn't available." };

  // Mirrors the BEFORE-trigger, which overwrites this anyway — the trigger is
  // the authority, this only keeps the optimistic value honest.
  const role =
    profile?.role === "admin"
      ? "admin"
      : profile?.role === "employee"
        ? "employee"
        : profile?.role === "helper"
          ? "helper"
          : "customer";

  const { error } = await supabase.from("support_messages").insert({
    ticket_id: input.ticketId,
    author_id: user.id,
    author_role: role,
    author_name: profile?.full_name ?? null,
    body,
  });

  if (error) {
    if (isMissingTable(error)) {
      return {
        ok: false,
        error:
          "Ticket replies aren't enabled on this database yet — run APPLY_ADMIN_ROUND3.sql.",
      };
    }
    return { ok: false, error: error.message };
  }

  const submitterId = ticket.employee_id ?? ticket.customer_id;
  const isSubmitter = submitterId === user.id;

  if (isSubmitter && ticket.status === "resolved") {
    await supabase
      .from("support_tickets")
      .update({ status: "open", resolved_at: null })
      .eq("id", ticket.id);
  }

  // Tell the other side. An admin answering tells the person who asked; the
  // person answering tells every admin, because no single admin owns a ticket.
  if (role === "admin") {
    if (submitterId) {
      const base =
        ticket.submitter_role === "customer"
          ? "/customer"
          : ticket.submitter_role === "helper"
            ? "/helper"
            : "/employee";
      await notify({
        recipientId: submitterId,
        type: "support_ticket",
        title: "replied to your support ticket",
        body: ticket.subject,
        link: `${base}/support`,
        actorId: user.id,
        actorName: profile?.full_name ?? null,
      });
    }
  } else {
    await notifyAdmins({
      type: "support_ticket",
      title: "replied on a support ticket",
      body: ticket.subject,
      link: "/admin/support",
      actorId: user.id,
      actorName: profile?.full_name ?? null,
    });
  }

  return { ok: true };
}

/**
 * The business contact email for the employee "Email admin" button. Read with
 * the service role since business_settings is admin-only under RLS; returns a
 * sensible fallback so the mailto always has a target.
 */
export async function getSupportContactEmail(): Promise<string> {
  const { user } = await getUserAndProfile();
  if (!user) return "support@wickettravel.co.uk";

  const admin = createAdminClient();
  const { data } = await admin
    .from("business_settings")
    .select("business_email")
    .eq("id", 1)
    .maybeSingle<{ business_email: string | null }>();

  return data?.business_email?.trim() || "support@wickettravel.co.uk";
}
