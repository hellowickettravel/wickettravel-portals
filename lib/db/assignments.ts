import { createClient } from "@/lib/supabase/server";
import type { Assignment } from "./types";

/** Assignments link employees to the conversations they handle. */

const ASSIGNMENT_COLUMNS = "id, conversation_id, employee_id, created_at";

/** Every assignment for an employee. RLS restricts to their own. */
export async function getAssignmentsForEmployee(
  employeeId: string
): Promise<Assignment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("employee_id", employeeId)
    .returns<Assignment[]>();

  if (error) throw error;
  return data ?? [];
}

/** Who is assigned to a conversation. */
export async function getAssignmentsForConversation(
  conversationId: string
): Promise<Assignment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("conversation_id", conversationId)
    .returns<Assignment[]>();

  if (error) throw error;
  return data ?? [];
}
