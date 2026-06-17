import { createClient } from "@/lib/supabase/server";
import type { Conversation, ConversationWithCustomer } from "./types";

/**
 * Conversations access. RLS limits results: admins see all, employees see only
 * conversations assigned to them, customers see only their own.
 */

const CONVERSATION_COLUMNS =
  "id, customer_id, status, last_message_at, last_message_preview, unread_count, created_at";

const CONVERSATION_WITH_CUSTOMER = `${CONVERSATION_COLUMNS}, customer:customers(id, full_name, phone)`;

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
