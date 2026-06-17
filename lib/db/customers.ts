import { createClient } from "@/lib/supabase/server";
import type { Customer } from "./types";

/** Customers access. RLS scopes rows to the caller's role. */

const CUSTOMER_COLUMNS = "id, profile_id, full_name, phone, email, created_at";

export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .order("full_name", { ascending: true })
    .returns<Customer[]>();

  if (error) throw error;
  return data ?? [];
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
