/**
 * Hand-written TypeScript types for the Wicket database tables.
 *
 * These match the REAL live Supabase schema exactly (reconciled in
 * supabase/migrations/0003_schema_reconcile.sql, which adds customers.profile_id,
 * profiles.is_active and profiles.email). Replace with `supabase gen types
 * typescript` output once the CLI is wired up.
 */

export type UserRole = "admin" | "employee" | "customer";
export type AccessLevel = "full" | "chat_only" | "view_only";

export type ConversationStatus = "open" | "closed";
export type OrderStatus = "open" | "closed" | "cancelled";

/** Direction of a message relative to the business. */
export type MessageDirection = "incoming" | "outgoing";

export type Profile = {
  id: string; // = auth.users.id
  full_name: string | null;
  role: UserRole | null;
  access_level: AccessLevel | null;
  is_active: boolean; // added in 0003 (not null default true)
  email: string | null; // added in 0003
  created_at: string;
};

export type Customer = {
  id: string;
  profile_id: string | null; // added in 0003 — links a portal account (auth.uid); null for WhatsApp-only leads
  wa_phone: string | null; // made nullable in 0003 for portal signups
  name: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  customer_id: string;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
};

export type Assignment = {
  id: string;
  conversation_id: string;
  employee_id: string; // -> profiles.id
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  body: string;
  media_url: string | null;
  sender_id: string | null; // profile id for outgoing; null for incoming
  created_at: string;
};

export type Order = {
  id: string;
  conversation_id: string | null;
  customer_id: string | null;
  route_from: string | null;
  route_to: string | null;
  travel_date: string | null;
  return_date: string | null;
  passengers: number | null;
  status: OrderStatus;
  selling_price: number | null;
  cost_price: number | null;
  commission: number | null;
  notes: string | null;
  created_by: string | null; // -> profiles.id (the employee)
  created_at: string;
};

// ----- Joined / view shapes the UI consumes -----

export type ConversationWithCustomer = Conversation & {
  customer: Pick<Customer, "id" | "name" | "wa_phone"> | null;
};

export type OrderWithRelations = Order & {
  customer: Pick<Customer, "id" | "name"> | null;
  created_by_profile: Pick<Profile, "id" | "full_name"> | null;
};
