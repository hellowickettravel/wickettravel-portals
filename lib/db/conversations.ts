import { createClient } from "@/lib/supabase/server";
import type { Conversation, ConversationWithCustomer } from "./types";

export type ConversationOverview = ConversationWithCustomer & {
  assignedEmployee: string | null;
  assignedEmployeeId: string | null;
  preview: string | null;
};

/**
 * Conversations access. RLS limits results: admins see all, employees see only
 * conversations assigned to them, customers see only their own.
 */

const CONVERSATION_COLUMNS =
  "id, customer_id, status, last_message_at, created_at";

const CONVERSATION_WITH_CUSTOMER = `${CONVERSATION_COLUMNS}, customer:customers(id, name, wa_phone)`;

/** All conversations visible to the caller, newest activity first. */
export async function getConversations(): Promise<ConversationWithCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_WITH_CUSTOMER)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .returns<ConversationWithCustomer[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getConversationById(
  id: string
): Promise<ConversationWithCustomer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_WITH_CUSTOMER)
    .eq("id", id)
    .maybeSingle<ConversationWithCustomer>();

  if (error) throw error;
  return data ?? null;
}

/**
 * Admin overview: conversations + customer, enriched with the assigned employee
 * name and the latest message preview. Uses plain `in()` lookups (no fragile
 * nested embeds) and short-circuits on an empty DB so the screen never crashes.
 */
export async function getConversationsOverview(): Promise<
  ConversationOverview[]
> {
  const base = await getConversations();
  if (base.length === 0) return [];

  const supabase = await createClient();
  const ids = base.map((c) => c.id);

  const { data: assignments } = await supabase
    .from("assignments")
    .select("conversation_id, employee_id")
    .in("conversation_id", ids)
    .returns<{ conversation_id: string; employee_id: string }[]>();

  const employeeIds = [
    ...new Set((assignments ?? []).map((a) => a.employee_id)),
  ];

  const { data: profiles } = employeeIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", employeeIds)
        .returns<{ id: string; full_name: string | null }[]>()
    : { data: [] as { id: string; full_name: string | null }[] };

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const employeeByConv = new Map<string, string | null>();
  const employeeIdByConv = new Map<string, string>();
  for (const a of assignments ?? []) {
    if (!employeeByConv.has(a.conversation_id)) {
      employeeByConv.set(a.conversation_id, nameById.get(a.employee_id) ?? null);
      employeeIdByConv.set(a.conversation_id, a.employee_id);
    }
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, body, created_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false })
    .returns<{ conversation_id: string; body: string; created_at: string }[]>();

  const previewByConv = new Map<string, string>();
  for (const m of messages ?? []) {
    if (!previewByConv.has(m.conversation_id)) {
      previewByConv.set(m.conversation_id, m.body);
    }
  }

  return base.map((c) => ({
    ...c,
    assignedEmployee: employeeByConv.get(c.id) ?? null,
    assignedEmployeeId: employeeIdByConv.get(c.id) ?? null,
    preview: previewByConv.get(c.id) ?? null,
  }));
}

/**
 * Conversations explicitly assigned to an employee. RLS already restricts an
 * employee to their own, but this is the canonical query for the inbox.
 */
export async function getConversationsForEmployee(
  employeeId: string
): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(`${CONVERSATION_COLUMNS}, assignments!inner(employee_id)`)
    .eq("assignments.employee_id", employeeId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .returns<Conversation[]>();

  if (error) throw error;
  return data ?? [];
}

/** A conversation row enriched for the employee inbox left pane. */
export type InboxConversation = ConversationWithCustomer & {
  preview: string | null;
  unreadCount: number;
  lastReadAt: string | null;
  /** Admin inbox only: the currently assigned employee (for the reassign control). */
  assignedEmployeeId?: string | null;
};

/**
 * The employee inbox: every conversation assigned to me, with the latest
 * message preview and an unread count (incoming messages newer than my
 * assignments.last_read_at — see migration 0005). Newest activity first.
 *
 * Uses plain `in()` lookups (no fragile nested embeds) and short-circuits on an
 * empty assignment set so a brand-new employee never hits an error.
 */
export async function getInboxForEmployee(
  employeeId: string
): Promise<InboxConversation[]> {
  const supabase = await createClient();

  const { data: assigns, error: aErr } = await supabase
    .from("assignments")
    .select("conversation_id, last_read_at")
    .eq("employee_id", employeeId)
    .returns<{ conversation_id: string; last_read_at: string | null }[]>();

  if (aErr) throw aErr;
  if (!assigns || assigns.length === 0) return [];

  const convIds = assigns.map((a) => a.conversation_id);
  const lastReadByConv = new Map(
    assigns.map((a) => [a.conversation_id, a.last_read_at])
  );

  const { data: convs, error: cErr } = await supabase
    .from("conversations")
    .select(CONVERSATION_WITH_CUSTOMER)
    .in("id", convIds)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .returns<ConversationWithCustomer[]>();

  if (cErr) throw cErr;

  const { data: msgs } = await supabase
    .from("messages")
    .select("conversation_id, body, direction, created_at")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false })
    .returns<
      {
        conversation_id: string;
        body: string;
        direction: string;
        created_at: string;
      }[]
    >();

  const previewByConv = new Map<string, string>();
  const unreadByConv = new Map<string, number>();
  for (const m of msgs ?? []) {
    if (!previewByConv.has(m.conversation_id)) {
      previewByConv.set(m.conversation_id, m.body);
    }
    if (m.direction === "incoming") {
      const lr = lastReadByConv.get(m.conversation_id);
      if (!lr || new Date(m.created_at) > new Date(lr)) {
        unreadByConv.set(
          m.conversation_id,
          (unreadByConv.get(m.conversation_id) ?? 0) + 1
        );
      }
    }
  }

  return (convs ?? []).map((c) => ({
    ...c,
    preview: previewByConv.get(c.id) ?? null,
    unreadCount: unreadByConv.get(c.id) ?? 0,
    lastReadAt: lastReadByConv.get(c.id) ?? null,
  }));
}
