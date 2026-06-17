import { createClient } from "@/lib/supabase/server";
import type { Order, OrderWithRelations } from "./types";

/**
 * Orders access. RLS scopes rows: admins all; employees their own/assigned;
 * customers only their own.
 */

const ORDER_COLUMNS =
  "id, conversation_id, customer_id, route_from, route_to, travel_date, return_date, passengers, status, selling_price, cost_price, commission, notes, created_by, created_at";

const ORDER_WITH_RELATIONS = `${ORDER_COLUMNS}, customer:customers(id, name), created_by_profile:profiles(id, full_name)`;

/** All orders visible to the caller, newest first. */
export async function getOrders(): Promise<OrderWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_WITH_RELATIONS)
    .order("created_at", { ascending: false })
    .returns<OrderWithRelations[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getOrderById(
  id: string
): Promise<OrderWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_WITH_RELATIONS)
    .eq("id", id)
    .maybeSingle<OrderWithRelations>();

  if (error) throw error;
  return data ?? null;
}

/**
 * Orders visible to the current employee, with relations. RLS
 * (orders_select_employee) already scopes rows to those they created OR that
 * are tied to a conversation assigned to them — exactly "my orders". Runs as the
 * logged-in user, so no employeeId filter is needed.
 */
export async function getMyVisibleOrders(): Promise<OrderWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_WITH_RELATIONS)
    .order("created_at", { ascending: false })
    .returns<OrderWithRelations[]>();

  if (error) throw error;
  return data ?? [];
}

/** Orders created by a specific employee. */
export async function getOrdersForEmployee(
  employeeId: string
): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("created_by", employeeId)
    .order("created_at", { ascending: false })
    .returns<Order[]>();

  if (error) throw error;
  return data ?? [];
}

/** Orders belonging to a specific customer. */
export async function getOrdersForCustomer(
  customerId: string
): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .returns<Order[]>();

  if (error) throw error;
  return data ?? [];
}
