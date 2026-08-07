import { createClient } from "@/lib/supabase/server";
import type { Customer } from "./types";

/** Customers access. RLS scopes rows to the caller's role. */

const CUSTOMER_COLUMNS = "id, profile_id, wa_phone, name, created_at";

export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .order("name", { ascending: true })
    .returns<Customer[]>();

  if (error) throw error;
  return data ?? [];
}

/** The customer record linked to a portal account (customers.profile_id). */
export async function getCustomerByProfileId(
  profileId: string
): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("profile_id", profileId)
    .maybeSingle<Customer>();

  if (error) throw error;
  return data ?? null;
}

/**
 * The design's Customer card on an order: email, plus how many orders this
 * customer has placed and what they are worth. Email lives on `profiles`, so
 * it is only there once the customer has a portal login.
 */
export type CustomerSnapshot = {
  email: string | null;
  orderCount: number;
  lifetimeValue: number;
};

export async function getCustomerSnapshot(
  customerId: string
): Promise<CustomerSnapshot> {
  const supabase = await createClient();

  const [customer, orders] = await Promise.all([
    supabase
      .from("customers")
      .select("profile_id")
      .eq("id", customerId)
      .maybeSingle<{ profile_id: string | null }>(),
    supabase
      .from("orders")
      .select("selling_price")
      .eq("customer_id", customerId)
      .returns<{ selling_price: number | null }[]>(),
  ]);

  let email: string | null = null;
  if (customer.data?.profile_id) {
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", customer.data.profile_id)
      .maybeSingle<{ email: string | null }>();
    email = data?.email ?? null;
  }

  const rows = orders.data ?? [];
  return {
    email,
    orderCount: rows.length,
    lifetimeValue: rows.reduce((sum, o) => sum + (o.selling_price ?? 0), 0),
  };
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("id", id)
    .maybeSingle<Customer>();

  if (error) throw error;
  return data ?? null;
}
