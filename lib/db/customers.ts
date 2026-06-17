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
