"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupportTicket, SupportTicketStatus } from "@/lib/db/types";

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

  const subject = input.subject.trim();
  const message = input.message.trim();
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

  const subject = input.subject.trim();
  const message = input.message.trim();
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
