/**
 * Hand-written TypeScript types for the Wicket database tables.
 *
 * IMPORTANT: these mirror the schema described in CLAUDE.md (6 tables) and the
 * shapes the UI needs. Column names are the project's best-known schema — if the
 * live Supabase schema differs, adjust here and the queries in lib/db/* will
 * follow. Replace this file with `supabase gen types typescript` output once the
 * CLI is wired up.
 */

export type UserRole = "admin" | "employee" | "customer";
export type AccessLevel = "full" | "chat_only" | "view_only";

export type ConversationStatus = "open" | "pending" | "closed";
export type OrderStatus =
  | "open"
  | "in_progress"
  | "closed"
  | "cancelled";

/** Direction of a message relative to the business. */
export type MessageDirection = "inbound" | "outbound";

export type Profile = {
  id: string; // = auth.users.id
  full_name: string | null;
  email: string | null;
  role: UserRole | null;
  access_level: AccessLevel | null;
  is_active: boolean | null;
  created_at: string;
};

export type Customer = {
  id: string;
  profile_id: string | null; // links a portal account (auth.uid) to this customer; null for WhatsApp-only leads
  full_name: string | null;
  phone: string | null; // WhatsApp number
  email: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  customer_id: string;
  status: ConversationStatus;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number | null;
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
  sender_id: string | null; // profile id for outbound; null for inbound/system
  direction: MessageDirection;
  body: string;
  created_at: string;
};

export type Order = {
  id: string;
  reference: string | null; // human ref e.g. "WT-1042"
  customer_id: string | null;
  conversation_id: string | null;
  created_by: string | null; // -> profiles.id (the employee)
  from_airport: string | null;
  to_airport: string | null;
  travel_date: string | null;
  pax: number | null;
  price: number | null;
  commission: number | null;
  status: OrderStatus;
  created_at: string;
};

// ----- Joined / view shapes the UI consumes -----

export type ConversationWithCustomer = Conversation & {
  customer: Pick<Customer, "id" | "full_name" | "phone"> | null;
};

export type OrderWithRelations = Order & {
  customer: Pick<Customer, "id" | "full_name"> | null;
  created_by_profile: Pick<Profile, "id" | "full_name"> | null;
};
