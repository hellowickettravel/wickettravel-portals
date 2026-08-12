import { createClient } from "@/lib/supabase/server";
import type { Order, OrderWithRelations } from "./types";
import { isUuid } from "@/lib/db/errors";

/**
 * Orders access. RLS scopes rows: admins all; employees their own/assigned;
 * customers only their own.
 */

// `*` rather than a hand-kept list: migration 0021 adds airline, flight
// numbers, budget and payment columns, and a wildcard means the app runs
// identically whether or not that migration has been applied yet. Orders carry
// no column an admin/employee/customer must not see — RLS scopes the rows.
const ORDER_COLUMNS = "*";

// Two FKs point at profiles (created_by, assigned_employee_id), so each embed
// is disambiguated with its source column (PostgREST relationship hint).
const ORDER_WITH_RELATIONS = `${ORDER_COLUMNS}, customer:customers(id, name, wa_phone), created_by_profile:profiles!created_by(id, full_name), assigned_employee:profiles!assigned_employee_id(id, full_name)`;

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
  // A dynamic route segment matches ANY path segment, so this is reachable
  // with junk from the URL bar. Postgres raises 22P02 on a malformed uuid,
  // which an RSC turns into a 500 — "no such record" is the honest answer.
  if (!isUuid(id)) return null;
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
