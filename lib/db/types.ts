/**
 * Hand-written TypeScript types for the Wicket Travel database tables.
 *
 * These match the REAL live Supabase schema exactly (reconciled in
 * supabase/migrations/0003_schema_reconcile.sql, which adds customers.profile_id,
 * profiles.is_active and profiles.email). Replace with `supabase gen types
 * typescript` output once the CLI is wired up.
 */

/**
 * Mirrors the profiles_role_check constraint (APPLY_HELPER_ROLE.sql).
 *
 * A customer BUYS — books flights, asks for help for a parent. A helper
 * PROVIDES — offers to accompany someone's parent on a flight they were
 * already taking, and is paid for it. They are different businesses to the
 * company, so they are different roles and different portals.
 */
export type UserRole = "admin" | "employee" | "customer" | "helper";

/**
 * The one map from a role to its portal. Client-safe on purpose: the login
 * form needs it too, and it used to be duplicated there as a hardcoded ladder
 * that fell through to "/customer" — so adding the helper role sent helpers to
 * the wrong portal until the layout bounced them back.
 *
 * Returns null for a role with no portal, which is how the login screen tells
 * an unrecognised account apart from a valid one.
 */
export function roleDashboardPath(
  role: string | null | undefined
): string | null {
  switch (role) {
    case "admin":
      return "/admin";
    case "employee":
      return "/employee";
    case "customer":
      return "/customer";
    case "helper":
      // A Parents Tickets helper is a service provider, not a customer — they
      // never book a flight, so they never see the customer portal.
      return "/helper";
    default:
      return null;
  }
}
export type AccessLevel = "full" | "chat_only" | "view_only" | "semi_admin";

export type ConversationStatus = "open" | "closed";

/** Order lifecycle (migration 0016): new → in_progress → completed | cancelled. */
export type OrderStatus = "new" | "in_progress" | "completed" | "cancelled";

/** One-way (direct) vs multi-leg (connection) itinerary. */
export type TripType = "direct" | "connection";

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

/** Direction of a (conversation) message relative to the business. */
export type MessageDirection = "incoming" | "outgoing";

/**
 * Who sent an order-inbox message. Drives the fixed UI labels:
 *   admin → "Admin", employee → "Support Team", customer → "Customer".
 */
export type SenderRole = "admin" | "employee" | "customer";

export type Profile = {
  id: string; // = auth.users.id
  full_name: string | null;
  role: UserRole | null;
  access_level: AccessLevel | null;
  /** Human job title ("Ticketing agent"). Not a permission. Added in 0021. */
  job_title?: string | null;
  is_active: boolean; // added in 0003 (not null default true)
  email: string | null; // added in 0003
  created_at: string;
  /* ---- added in 0022, all optional so the app runs before it is applied ---- */
  phone?: string | null;
  start_date?: string | null;
  /** Commission band label, e.g. "Standard — 8%". Not a computed rate. */
  commission_rate?: string | null;
};

export type Customer = {
  id: string;
  profile_id: string | null; // added in 0003 — links a portal account (auth.uid); null for leads with no portal login
  wa_phone: string | null; // made nullable in 0003 for portal signups
  name: string | null;
  created_at: string;
  /* ---- added in 0022, all optional so the app runs before it is applied ---- */
  preferred_name?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  /** Staff-only. Never rendered in the customer portal. */
  internal_note?: string | null;
  assigned_consultant_id?: string | null;
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
  /** The message this one replies to (same conversation); null = not a reply. */
  reply_to_id: string | null;
  created_at: string;
};

/** How a completed order was paid for (0021). */
export type PaymentMethod = "card" | "bank_transfer" | "cash" | "unpaid";
/** Where that payment got to (0021). */
export type PaymentStatus = "paid_in_full" | "deposit" | "unpaid" | "refunded";

export type Order = {
  id: string;
  order_number: string; // human ref "#7343490", auto-generated on insert (0016)
  conversation_id: string | null;
  customer_id: string | null;
  route_from: string | null;
  route_to: string | null;
  travel_date: string | null;
  return_date: string | null;
  passengers: number | null;
  status: OrderStatus;
  // ----- Flight details (0016) -----
  trip_type: TripType | null;
  adults: number;
  children: number;
  child_ages: number[]; // per-child ages, length == children
  wheelchair: boolean;
  extra_luggage: boolean;
  extra_luggage_kg: number | null;
  cabin_class: CabinClass | null;
  passenger_names: string[];
  /** Carrier on the boarding pass, e.g. "Emirates". Added in 0021. */
  airline?: string | null;
  /** "EK 004 · EK 003" — both legs in one field. Added in 0021. */
  flight_numbers?: string | null;
  /** What the customer wanted to spend per traveller. Added in 0021. */
  budget_per_person?: number | null;
  // ----- Pricing -----
  selling_price: number | null;
  cost_price: number | null;
  commission: number | null;
  /** How they paid — card / transfer / cash / unpaid. Added in 0021. */
  payment_method?: PaymentMethod | null;
  /** paid_in_full / deposit / unpaid / refunded. Added in 0021. */
  payment_status?: PaymentStatus | null;
  notes: string | null; // internal staff notes
  customer_note: string | null; // pre-order gate note from the customer (0016)
  created_by: string | null; // -> profiles.id (the employee/admin); null for customer-created
  assigned_employee_id: string | null; // -> profiles.id (added in 0008)
  closed_at: string | null; // completion timestamp; set when status becomes 'completed'
  created_at: string;
};

/**
 * A message in an order's dedicated inbox (0016). sender_role drives the fixed
 * UI label; the customer is locked out once the order is completed/cancelled
 * (enforced server-side via RLS).
 */
export type OrderMessage = {
  id: string;
  order_id: string;
  sender_id: string | null;
  sender_role: SenderRole;
  body: string | null;
  media_url: string | null; // storage path in 'order-attachments', signed for display
  /** The order message this one replies to; null = not a reply. */
  reply_to_id: string | null;
  created_at: string;
};

/**
 * A file/image attached to an order message, or to the pre-order note when
 * message_id is null (0016). Stored in the private 'order-attachments' bucket.
 */
export type OrderAttachment = {
  id: string;
  order_id: string;
  message_id: string | null; // null = attached to the pre-order note
  uploaded_by: string | null;
  uploader_role: SenderRole | null;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type NotificationType =
  | "new_message"
  | "new_order"
  | "assignment"
  | "status_change"
  | "support_ticket"
  /** A lead from the public Parents Tickets form. */
  | "parent_ticket"
  /* --- Parents Tickets marketplace. `notifications.type` is free text in the
     database, so these needed no migration; the UI maps them below. --- */
  /** A listing or an identity check was approved or sent back. */
  | "listing_review"
  /** A pairing was proposed, or the other side answered one. */
  | "match"
  /** The introduction was made — the one event people wait for. */
  | "contact_released";

export type Notification = {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  /** The viewer starred this notification (per-recipient, 0019). */
  is_starred: boolean;
  created_at: string;
  /** Who performed the action; null for system/service-role events. */
  actor_id: string | null;
  /** Denormalised display name of the actor (staff full_name or customer name). */
  actor_name: string | null;
};

export type SupportTicketStatus = "open" | "resolved";

/** Who raised a support ticket (added in 0015). */
export type SupportSubmitterRole = "employee" | "customer";

export type SupportTicket = {
  id: string;
  employee_id: string | null; // null for customer-submitted tickets (0015)
  customer_id: string | null; // -> profiles.id of the customer (0015)
  submitter_role: SupportSubmitterRole;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  created_at: string;
  resolved_at: string | null;
};

export type NotificationPrefs = {
  user_id: string;
  new_message: boolean;
  new_order: boolean;
  status_change: boolean;
  daily_summary: boolean;
  updated_at: string;
};

export type BusinessSettings = {
  id: number;
  business_name: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  default_commission: number | null;
  logo_url: string | null;
  /** Trading identifiers the design's Business profile asks for (0021). */
  company_number?: string | null;
  atol_licence?: string | null;
  iata_number?: string | null;
  currency?: string | null;
  updated_at: string;
};

// ----- Joined / view shapes the UI consumes -----

export type ConversationWithCustomer = Conversation & {
  customer: Pick<Customer, "id" | "name" | "wa_phone"> | null;
};

export type OrderWithRelations = Order & {
  customer: Pick<Customer, "id" | "name" | "wa_phone"> | null;
  created_by_profile: Pick<Profile, "id" | "full_name"> | null;
  assigned_employee: Pick<Profile, "id" | "full_name"> | null;
};
