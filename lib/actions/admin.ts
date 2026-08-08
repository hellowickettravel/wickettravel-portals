"use server";

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATTACHMENT_BUCKET } from "@/lib/storage";
import { getEmployees, getProfileById } from "@/lib/db/profiles";
import {
  getOrders,
  getOrdersForCustomer,
  getOrdersForEmployee,
} from "@/lib/db/orders";
import { getCustomers, getCustomerById } from "@/lib/db/customers";
import { getMessages } from "@/lib/db/messages";
import {
  getConversationsOverview,
  type InboxConversation,
} from "@/lib/db/conversations";
import type {
  Profile,
  Customer,
  Order,
  Conversation,
  OrderWithRelations,
  OrderStatus,
  AccessLevel,
  Message,
  BusinessSettings,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/db/types";
import { normalizeOrderInput, type OrderFormInput } from "@/lib/orders/form";

/**
 * Admin-only server actions. Reads run through the RLS-aware helpers (admin
 * policies grant all); privileged writes use the service-role client AFTER an
 * explicit admin check here, since service-role bypasses RLS.
 */

/**
 * True when PostgREST rejected a write because a column is not there yet —
 * i.e. migration 0021 has not been applied to this database. Callers retry
 * with the pre-0021 payload so the feature degrades instead of failing.
 */
function isMissingColumn(error: { message?: string; code?: string }): boolean {
  return (
    error?.code === "PGRST204" ||
    /column .* does not exist|could not find the .* column/i.test(
      error?.message ?? ""
    )
  );
}

type ActionResult = { ok: true } | { ok: false; error: string };
type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

const MESSAGE_COLUMNS =
  "id, conversation_id, direction, body, media_url, sender_id, reply_to_id, created_at";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const ACCESS_LEVELS: AccessLevel[] = [
  "full",
  "semi_admin",
  "chat_only",
  "view_only",
];

/** Throws if the caller isn't a signed-in admin. */
async function requireAdmin(): Promise<void> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

// ----- Reads (consumed by TanStack Query on the client) -----

export async function listEmployees(): Promise<Profile[]> {
  await requireAdmin();
  return getEmployees();
}

export async function listOrders(): Promise<OrderWithRelations[]> {
  await requireAdmin();
  return getOrders();
}

/** Customers for the admin "New Order" picker (admin RLS sees all). */
export async function listCustomers(): Promise<Customer[]> {
  await requireAdmin();
  return getCustomers();
}

export type CustomerWithStats = Customer & {
  orderCount: number;
  conversationCount: number;
  /** Distinct order statuses this customer has — powers the status filter. */
  orderStatuses: OrderStatus[];
  /** Sign-in email from the linked portal account; null for a lead with no login. */
  email: string | null;
};

/** Customers enriched with their order + conversation counts for the list page. */
export async function listCustomersWithStats(): Promise<CustomerWithStats[]> {
  await requireAdmin();
  const customers = await getCustomers();
  if (customers.length === 0) return [];

  const supabase = await createClient();
  const profileIds = customers
    .map((c) => c.profile_id)
    .filter((id): id is string => !!id);
  const [{ data: orders }, { data: convs }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("customer_id, status")
        .returns<{ customer_id: string | null; status: OrderStatus }[]>(),
      supabase
        .from("conversations")
        .select("customer_id")
        .returns<{ customer_id: string | null }[]>(),
      profileIds.length
        ? supabase
            .from("profiles")
            .select("id, email")
            .in("id", profileIds)
            .returns<{ id: string; email: string | null }[]>()
        : Promise.resolve({ data: [] as { id: string; email: string | null }[] }),
    ]);
  const emailByProfile = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  const orderCounts = new Map<string, number>();
  const statusesByCustomer = new Map<string, Set<OrderStatus>>();
  for (const o of orders ?? []) {
    if (!o.customer_id) continue;
    orderCounts.set(o.customer_id, (orderCounts.get(o.customer_id) ?? 0) + 1);
    const set = statusesByCustomer.get(o.customer_id) ?? new Set<OrderStatus>();
    set.add(o.status);
    statusesByCustomer.set(o.customer_id, set);
  }
  const convCounts = new Map<string, number>();
  for (const c of convs ?? []) {
    if (c.customer_id) convCounts.set(c.customer_id, (convCounts.get(c.customer_id) ?? 0) + 1);
  }

  return customers.map((c) => ({
    ...c,
    orderCount: orderCounts.get(c.id) ?? 0,
    conversationCount: convCounts.get(c.id) ?? 0,
    orderStatuses: Array.from(statusesByCustomer.get(c.id) ?? []),
    email: c.profile_id ? (emailByProfile.get(c.profile_id) ?? null) : null,
  }));
}

export type CustomerDetail = {
  customer: Customer;
  orders: Order[];
  conversations: Pick<Conversation, "id" | "status" | "last_message_at" | "created_at">[];
};

/** A single customer with their orders + conversations for the detail page. */
export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  await requireAdmin();
  const customer = await getCustomerById(id);
  if (!customer) return null;

  const supabase = await createClient();
  const [orders, { data: conversations }] = await Promise.all([
    getOrdersForCustomer(id),
    supabase
      .from("conversations")
      .select("id, status, last_message_at, created_at")
      .eq("customer_id", id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .returns<Pick<Conversation, "id" | "status" | "last_message_at" | "created_at">[]>(),
  ]);

  return { customer, orders, conversations: conversations ?? [] };
}

/**
 * Admin creates a full order (the shared Chunk 1 create-order form) for any
 * customer. Inserted through the RLS-aware client — orders_admin_all permits the
 * write — with created_by = the admin. The order is attached to that customer's
 * conversation (reusing the most recent one, or opening their first) so
 * "Message customer" on the record always has somewhere to go. Returns the new
 * order id + human ref so the UI can route to its detail view.
 */
export async function createOrder(
  input: OrderFormInput & { customerId: string }
): Promise<DataResult<{ orderId: string; orderNumber: string }>> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }
  if (!input.customerId) return { ok: false, error: "Please choose a customer." };

  const normalized = normalizeOrderInput(input);
  if (!normalized.ok) return normalized;

  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("conversations")
    .select("id")
    .eq("customer_id", input.customerId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  let conversationId = thread?.id ?? null;
  if (!conversationId) {
    const { data: opened } = await supabase
      .from("conversations")
      .insert({ customer_id: input.customerId, status: "open" })
      .select("id")
      .single<{ id: string }>();
    conversationId = opened?.id ?? null;
  }

  const row = {
    ...normalized.fields,
    customer_id: input.customerId,
    conversation_id: conversationId,
    created_by: user.id,
  };
  const insert = (payload: Record<string, unknown>) =>
    supabase
      .from("orders")
      .insert(payload)
      .select("id, order_number")
      .single<{ id: string; order_number: string }>();

  let { data, error } = await insert(row);
  if (error && isMissingColumn(error)) {
    // Migration 0021 not applied yet — drop its column and insert the rest, so
    // creating an order never depends on a pending migration.
    const { airline: _airline, ...legacy } = row;
    ({ data, error } = await insert(legacy));
  }

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't create the order." };
  }
  // The human ref is trigger-generated, so it only exists after the insert —
  // the create screen shows it back ("Order #7343490 created").
  return { ok: true, data: { orderId: data.id, orderNumber: data.order_number } };
}

const ORDER_STATUSES: OrderStatus[] = ["new", "in_progress", "completed", "cancelled"];

/**
 * Edit an existing order's trip + pricing fields. Admin-only; the write goes
 * through orders_admin_all RLS. Customer/conversation links aren't editable here.
 */
export async function updateOrder(input: {
  id: string;
  routeFrom: string;
  routeTo: string;
  travelDate: string | null;
  returnDate: string | null;
  passengers: number | null;
  sellingPrice: number | null;
  costPrice: number | null;
  commission: number | null;
  notes: string | null;
  // ----- added by migration 0021; optional so older databases still work -----
  airline?: string | null;
  flightNumbers?: string | null;
  budgetPerPerson?: number | null;
  paymentMethod?: PaymentMethod | null;
  paymentStatus?: PaymentStatus | null;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const routeFrom = input.routeFrom.trim();
  const routeTo = input.routeTo.trim();
  if (!routeFrom || !routeTo) {
    return { ok: false, error: "Both From and To are required." };
  }

  const supabase = await createClient();
  const base = {
    route_from: routeFrom,
    route_to: routeTo,
    travel_date: input.travelDate,
    return_date: input.returnDate,
    passengers: input.passengers,
    selling_price: input.sellingPrice,
    cost_price: input.costPrice,
    commission: input.commission,
    notes: input.notes?.trim() || null,
  };
  const extended = {
    ...base,
    airline: input.airline?.trim() || null,
    flight_numbers: input.flightNumbers?.trim() || null,
    budget_per_person: input.budgetPerPerson ?? null,
    payment_method: input.paymentMethod ?? null,
    payment_status: input.paymentStatus ?? null,
  };

  const { error } = await supabase
    .from("orders")
    .update(extended)
    .eq("id", input.id);

  if (error) {
    // Migration 0021 not applied yet: save everything it does understand
    // rather than failing the whole edit.
    if (isMissingColumn(error)) {
      const retry = await supabase
        .from("orders")
        .update(base)
        .eq("id", input.id);
      if (retry.error) return { ok: false, error: retry.error.message };
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Change an order's status. Stamps closed_at when moving to 'completed' and
 * clears it otherwise, so analytics can time completed orders accurately.
 */
export async function setOrderStatus(input: {
  id: string;
  status: OrderStatus;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  if (!ORDER_STATUSES.includes(input.status)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({
      status: input.status,
      closed_at: input.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Assign (or, with null, unassign) an order to an employee. */
export async function assignOrder(input: {
  id: string;
  employeeId: string | null;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ assigned_employee_id: input.employeeId || null })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ----- Writes (service-role) -----

export async function createEmployee(input: {
  fullName: string;
  email: string;
  password: string;
  accessLevel: AccessLevel;
  /* The rest are the design's Add-employee fields. All optional: an admin can
     still create an account from a name, an email and a password alone. */
  jobTitle?: string | null;
  phone?: string | null;
  startDate?: string | null;
  commissionRate?: string | null;
  active?: boolean;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (input.password.length < MIN_PASSWORD)
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` };
  if (!ACCESS_LEVELS.includes(input.accessLevel))
    return { ok: false, error: "Invalid access level." };

  const admin = createAdminClient();

  // 1) Create the auth user (confirmed so they can log in immediately).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    return {
      ok: false,
      error: error?.message ?? "Could not create the account.",
    };
  }

  // 2) The signup trigger creates a profile row; force it to an employee with
  //    the chosen access level. upsert covers the case where the trigger is off.
  const base = {
    id: data.user.id,
    role: "employee" as const,
    access_level: input.accessLevel,
    full_name: fullName,
    email,
    is_active: input.active ?? true,
  };
  const with21 = { ...base, job_title: input.jobTitle?.trim() || null };
  const with22 = {
    ...with21,
    phone: input.phone?.trim() || null,
    start_date: input.startDate?.trim() || null,
    commission_rate: input.commissionRate?.trim() || null,
  };

  // Step down one migration at a time rather than straight to base, so a
  // database on 0021 still keeps the job title.
  let profileError: { message?: string; code?: string } | null = null;
  for (const payload of [with22, with21, base]) {
    ({ error: profileError } = await admin
      .from("profiles")
      .upsert(payload, { onConflict: "id" }));
    if (!profileError || !isMissingColumn(profileError)) break;
  }

  if (profileError) {
    return {
      ok: false,
      error: profileError.message ?? "Couldn't save the employee profile.",
    };
  }

  return { ok: true };
}

/**
 * Admin creates a customer portal account directly (service-role) — the mirror
 * of createEmployee. Makes a confirmed auth user (immediate login, no email
 * verification), forces the profile to role='customer', and links a customers
 * row (profile_id → the new user). That link is REQUIRED for the customer
 * portal RLS (owns_customer / owns_conversation) to resolve. The customer can
 * then change their own name/password from their Settings.
 */
export async function createCustomer(input: {
  fullName: string;
  email: string;
  password: string;
  waPhone?: string | null;
  /* The rest are the design's Add-customer fields, all optional. */
  preferredName?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  internalNote?: string | null;
  consultantId?: string | null;
  active?: boolean;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const waPhone = input.waPhone?.trim() || null;

  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (input.password.length < MIN_PASSWORD)
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` };
  // Optional phone — accept digits, spaces and the usual + ( ) - separators.
  if (waPhone && !/^[+\d][\d\s()-]{5,}$/.test(waPhone))
    return { ok: false, error: "Enter a valid phone number." };

  const admin = createAdminClient();

  // 1) Create the auth user (confirmed so they can log in immediately).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    const message = (error?.message ?? "").toLowerCase();
    if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
      return { ok: false, error: "An account with this email already exists." };
    }
    return { ok: false, error: error?.message ?? "Could not create the account." };
  }

  const userId = data.user.id;

  // 2) The signup trigger creates a profile row; force it to a customer.
  //    upsert covers the case where the trigger is off.
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: "customer",
      full_name: fullName,
      email,
      is_active: input.active ?? true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  // 3) Link a customers row to the new account (REQUIRED for customer RLS).
  //    No unique constraint on profile_id, so update-or-insert by hand to stay
  //    idempotent if a row already exists for this account.
  const { data: existing, error: lookupError } = await admin
    .from("customers")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle<{ id: string }>();
  if (lookupError) return { ok: false, error: lookupError.message };

  const base = { name: fullName, wa_phone: waPhone };
  const extra = {
    ...base,
    preferred_name: input.preferredName?.trim() || null,
    nationality: input.nationality?.trim() || null,
    date_of_birth: input.dateOfBirth?.trim() || null,
    address: input.address?.trim() || null,
    internal_note: input.internalNote?.trim() || null,
    assigned_consultant_id: input.consultantId || null,
  };

  if (existing) {
    let { error } = await admin
      .from("customers")
      .update(extra)
      .eq("id", existing.id);
    // 0022 not applied here — keep the record, drop its columns.
    if (error && isMissingColumn(error)) {
      ({ error } = await admin
        .from("customers")
        .update(base)
        .eq("id", existing.id));
    }
    if (error) return { ok: false, error: error.message };
  } else {
    let { error } = await admin
      .from("customers")
      .insert({ profile_id: userId, ...extra });
    if (error && isMissingColumn(error)) {
      ({ error } = await admin
        .from("customers")
        .insert({ profile_id: userId, ...base }));
    }
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function setEmployeeActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const admin = createAdminClient();

    // Hard block at the auth layer: a banned user can't sign in OR refresh their
    // access token, so even an existing session dies on the next token refresh —
    // not just our UI checks. Lifting the ban (`none`) restores login.
    const { error: banError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: isActive ? "none" : "876000h", // ~100 years
    });
    if (banError) return { ok: false, error: banError.message };

    const { error } = await admin
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

/**
 * Reset an employee's password to a freshly generated temporary one (service
 * role). Returns the temp password so the admin can hand it over — email
 * delivery isn't relied upon. The employee can change it later from Settings.
 */
export async function resetEmployeePassword(
  id: string
): Promise<{ ok: true; tempPassword: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const tempPassword = "Wk-" + crypto.randomUUID().slice(0, 10);
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, {
      password: tempPassword,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, tempPassword };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Reset failed." };
  }
}

export type EmployeeDetail = {
  profile: Profile;
  ordersCreated: Order[];
  assignmentCount: number;
};

/** An employee with the orders they created + how many conversations they hold. */
export async function getEmployeeDetail(
  id: string
): Promise<EmployeeDetail | null> {
  await requireAdmin();
  const profile = await getProfileById(id);
  if (!profile || profile.role !== "employee") return null;

  const supabase = await createClient();
  const [ordersCreated, { count }] = await Promise.all([
    getOrdersForEmployee(id),
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", id),
  ]);

  return { profile, ordersCreated, assignmentCount: count ?? 0 };
}

export async function updateEmployee(input: {
  id: string;
  fullName: string;
  email: string;
  accessLevel: AccessLevel;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (!ACCESS_LEVELS.includes(input.accessLevel))
    return { ok: false, error: "Invalid access level." };

  try {
    const admin = createAdminClient();

    // Keep the auth login in sync — email + display name live on auth.users too.
    const { error: authError } = await admin.auth.admin.updateUserById(input.id, {
      email,
      user_metadata: { full_name: fullName },
    });
    if (authError) return { ok: false, error: authError.message };

    const { error } = await admin
      .from("profiles")
      .update({ full_name: fullName, email, access_level: input.accessLevel })
      .eq("id", input.id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

/**
 * Permanently delete an employee — their auth login AND profile row. Service
 * role after an admin check. References are detached first so foreign keys never
 * block the delete: orders they authored keep their history (created_by → null),
 * messages they sent keep their content (sender_id → null), and their
 * conversation assignments are removed. assigned_employee_id, notifications and
 * notification_prefs clean themselves up via ON DELETE SET NULL / CASCADE.
 */
export async function deleteEmployee(id: string): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }
  if (id === user.id) {
    return { ok: false, error: "You can't delete your own account." };
  }

  try {
    const admin = createAdminClient();

    const { error: ordersErr } = await admin
      .from("orders")
      .update({ created_by: null })
      .eq("created_by", id);
    if (ordersErr) return { ok: false, error: ordersErr.message };

    const { error: msgErr } = await admin
      .from("messages")
      .update({ sender_id: null })
      .eq("sender_id", id);
    if (msgErr) return { ok: false, error: msgErr.message };

    const { error: assignErr } = await admin
      .from("assignments")
      .delete()
      .eq("employee_id", id);
    if (assignErr) return { ok: false, error: assignErr.message };

    // Drop the profile row, then the auth user.
    const { error: profileErr } = await admin
      .from("profiles")
      .delete()
      .eq("id", id);
    if (profileErr) return { ok: false, error: profileErr.message };

    const { error: authErr } = await admin.auth.admin.deleteUser(id);
    if (authErr) return { ok: false, error: authErr.message };

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
  }
}

/**
 * Permanently delete a customer — like deleting an employee, this is a FULL
 * account removal. Service role after an admin check. Their conversations (and
 * the messages + assignments inside them) are removed; their orders are KEPT for
 * revenue history with the customer link detached (customer_id → null). If the
 * customer has a portal login (profile_id set), their profile row AND auth user
 * are deleted so they can no longer sign in — their session dies on its next
 * request (getUser fails → the customer layout redirects to /login).
 * Customers without a portal login (no profile_id) just lose their customer + chat data.
 * Children are cleared before parents so no foreign key blocks the delete.
 */
export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const admin = createAdminClient();

    // Grab the portal login (if any) before we remove the customer row.
    const { data: customer, error: custReadErr } = await admin
      .from("customers")
      .select("profile_id")
      .eq("id", id)
      .maybeSingle<{ profile_id: string | null }>();
    if (custReadErr) return { ok: false, error: custReadErr.message };
    const profileId = customer?.profile_id ?? null;

    const { data: convs, error: convReadErr } = await admin
      .from("conversations")
      .select("id")
      .eq("customer_id", id)
      .returns<{ id: string }[]>();
    if (convReadErr) return { ok: false, error: convReadErr.message };

    const convIds = (convs ?? []).map((c) => c.id);
    if (convIds.length > 0) {
      const { error: msgErr } = await admin
        .from("messages")
        .delete()
        .in("conversation_id", convIds);
      if (msgErr) return { ok: false, error: msgErr.message };

      const { error: assignErr } = await admin
        .from("assignments")
        .delete()
        .in("conversation_id", convIds);
      if (assignErr) return { ok: false, error: assignErr.message };

      // Detach any orders tied to these chats before the chats disappear.
      const { error: ordConvErr } = await admin
        .from("orders")
        .update({ conversation_id: null })
        .in("conversation_id", convIds);
      if (ordConvErr) return { ok: false, error: ordConvErr.message };

      const { error: convDelErr } = await admin
        .from("conversations")
        .delete()
        .eq("customer_id", id);
      if (convDelErr) return { ok: false, error: convDelErr.message };
    }

    // Keep the customer's orders for revenue history — just unlink the customer.
    const { error: ordersErr } = await admin
      .from("orders")
      .update({ customer_id: null })
      .eq("customer_id", id);
    if (ordersErr) return { ok: false, error: ordersErr.message };

    const { error: custErr } = await admin
      .from("customers")
      .delete()
      .eq("id", id);
    if (custErr) return { ok: false, error: custErr.message };

    // Full account removal: drop the profile row, then the auth login so they
    // can never sign in again. Only portal customers have these.
    if (profileId) {
      const { error: profileErr } = await admin
        .from("profiles")
        .delete()
        .eq("id", profileId);
      if (profileErr) return { ok: false, error: profileErr.message };

      const { error: authErr } = await admin.auth.admin.deleteUser(profileId);
      if (authErr) return { ok: false, error: authErr.message };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
  }
}

// ----- Admin inbox (full access — admin RLS sees every conversation) -----

/**
 * Every conversation for the admin inbox, shaped like the employee inbox so the
 * shared <ConversationInbox> can render both. Admins aren't assignment-scoped
 * and there is no per-admin read receipt, so the badge shows how many customer
 * messages are waiting on a reply rather than a per-viewer unread count.
 */
export async function listAdminInbox(): Promise<InboxConversation[]> {
  await requireAdmin();
  const overview = await getConversationsOverview();
  return overview.map((c) => ({
    ...c,
    unreadCount: c.waitingCount,
    lastReadAt: null,
    assignedEmployeeId: c.assignedEmployeeId,
  }));
}

/**
 * Assign (or reassign) a conversation to a single employee — or unassign with a
 * null employeeId. Service-role after an admin check: clears any existing
 * assignment for the conversation, then inserts the new one (the assignments
 * insert fires the assignment notification trigger).
 */
export async function setConversationAssignee(input: {
  conversationId: string;
  employeeId: string | null;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const admin = createAdminClient();

  const { error: delError } = await admin
    .from("assignments")
    .delete()
    .eq("conversation_id", input.conversationId);
  if (delError) return { ok: false, error: delError.message };

  if (input.employeeId) {
    const { error: insError } = await admin
      .from("assignments")
      .insert({ conversation_id: input.conversationId, employee_id: input.employeeId });
    if (insError) return { ok: false, error: insError.message };
  }

  return { ok: true };
}

/** Close or reopen a conversation. */
export async function setConversationStatus(input: {
  conversationId: string;
  status: "open" | "closed";
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  if (input.status !== "open" && input.status !== "closed") {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ status: input.status })
    .eq("id", input.conversationId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listAdminMessages(
  conversationId: string
): Promise<Message[]> {
  await requireAdmin();
  // RLS messages_admin_all lets admins read any conversation.
  return getMessages(conversationId);
}

/**
 * Send an outgoing reply as admin. Messaging is fully internal — the row is
 * persisted and Supabase Realtime delivers it live to the customer's portal.
 * Admins can reply in ANY conversation; messages_admin_all permits the insert.
 */
export async function adminSendMessage(input: {
  conversationId: string;
  body: string;
  mediaUrl?: string | null;
  replyToId?: string | null;
}): Promise<DataResult<Message>> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }

  const body = input.body.trim();
  if (!body && !input.mediaUrl) return { ok: false, error: "Message is empty." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      direction: "outgoing",
      body: body || "",
      media_url: input.mediaUrl ?? null,
      sender_id: user.id,
      reply_to_id: input.replyToId ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single<Message>();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

// ----- Business settings -----

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_settings")
    // `*` so the four identifiers migration 0021 adds appear as soon as it
    // runs, without this select needing a matching deploy.
    .select("*")
    .eq("id", 1)
    .maybeSingle<BusinessSettings>();

  if (error) throw error;
  return data ?? null;
}

export async function saveBusinessSettings(input: {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  defaultCommission: number | null;
  // ----- added by migration 0021 -----
  companyNumber?: string;
  atolLicence?: string;
  iataNumber?: string;
  currency?: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  if (input.businessEmail && !EMAIL_RE.test(input.businessEmail.trim())) {
    return { ok: false, error: "Enter a valid business email." };
  }

  const supabase = await createClient();
  const base = {
    id: 1,
    business_name: input.businessName.trim() || null,
    business_email: input.businessEmail.trim() || null,
    business_phone: input.businessPhone.trim() || null,
    business_address: input.businessAddress.trim() || null,
    default_commission: input.defaultCommission,
    updated_at: new Date().toISOString(),
  };
  const extended = {
    ...base,
    company_number: input.companyNumber?.trim() || null,
    atol_licence: input.atolLicence?.trim() || null,
    iata_number: input.iataNumber?.trim() || null,
    currency: input.currency?.trim() || "GBP",
  };

  const { error } = await supabase
    .from("business_settings")
    .upsert(extended, { onConflict: "id" });

  if (error) {
    if (isMissingColumn(error)) {
      const retry = await supabase
        .from("business_settings")
        .upsert(base, { onConflict: "id" });
      if (retry.error) return { ok: false, error: retry.error.message };
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ----- Danger zone: full portal wipe -----

/** A nil UUID — no real row carries it, so `.neq("id", …)` matches every row. */
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export type ResetSummary = {
  deletedCounts: {
    notifications: number;
    supportTickets: number;
    messages: number;
    assignments: number;
    orders: number;
    conversations: number;
    customers: number;
    accounts: number; // profiles + auth users removed (excludes the acting admin)
    attachments: number; // storage objects removed
  };
  errors: string[];
};

type ResetResult =
  | { ok: true; summary: ResetSummary }
  | { ok: false; error: string };

/** Count every row in a table (head-only — no rows transferred). */
async function countAll(
  admin: ReturnType<typeof createAdminClient>,
  table: string
): Promise<number> {
  const { count } = await admin
    .from(table)
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

/**
 * Recursively collect every object path in a storage bucket. Supabase's `list`
 * is non-recursive and returns folders as entries with a null `id`, so we walk
 * into each folder. Paginates each prefix in pages of 1000.
 */
async function listAllObjects(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix = ""
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });
    if (error || !data || data.length === 0) break;

    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      // Folders come back with a null id (and no file metadata) — recurse in.
      if (item.id === null) {
        paths.push(...(await listAllObjects(admin, bucket, full)));
      } else {
        paths.push(full);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return paths;
}

/**
 * DESTRUCTIVE, IRREVERSIBLE: wipe the portal back to a fresh state, keeping ONLY
 * the acting admin's account + the business_settings (name/email/phone/commission
 * /logo) and the branding bucket.
 *
 * Deletes ALL: notifications, support_tickets, messages, assignments, orders,
 * conversations, customers — then every profile + auth user EXCEPT the acting
 * admin (employees, customers, and other admins all go) — then empties the
 * private "attachments" bucket. business_settings, the branding bucket, and the
 * acting admin (account, profile, notification prefs) are left untouched, so the
 * admin stays logged in and lands on an empty portal.
 *
 * Guards: requireAdmin (only a true role='admin' can call this — semi_admin and
 * all other access levels are rejected by the role check) PLUS a server-side
 * re-authentication of the acting admin's password before anything is deleted.
 *
 * Robustness: a single failed auth-user delete (or any per-step error) is
 * collected into `errors` and the wipe continues, so we never leave a half state
 * silently — the summary reports exactly what was removed and what failed.
 */
export async function resetEverything(password: string): Promise<ResetResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false, error: "Unauthorized" };
  }
  if (!user.email) {
    return { ok: false, error: "Your account has no email to verify against." };
  }
  if (!password) {
    return { ok: false, error: "Password is required." };
  }

  // Re-authenticate the acting admin BEFORE touching anything. A throwaway
  // anon client (no session persistence) verifies the password without
  // disturbing the admin's real cookie session, so they stay logged in.
  const verifier = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: signInErr } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (signInErr) {
    return { ok: false, error: "Incorrect password. Reset aborted." };
  }

  const actingAdminId = user.id;
  const admin = createAdminClient();
  const errors: string[] = [];

  const deletedCounts: ResetSummary["deletedCounts"] = {
    notifications: 0,
    supportTickets: 0,
    messages: 0,
    assignments: 0,
    orders: 0,
    conversations: 0,
    customers: 0,
    accounts: 0,
    attachments: 0,
  };

  // 1) Delete data rows in FK-safe order (children before parents). Service-role
  //    bypasses RLS but NOT foreign keys, so ordering matters.
  const dataSteps: { key: keyof ResetSummary["deletedCounts"]; table: string }[] = [
    { key: "notifications", table: "notifications" },
    { key: "supportTickets", table: "support_tickets" },
    { key: "messages", table: "messages" },
    { key: "assignments", table: "assignments" },
    { key: "orders", table: "orders" },
    { key: "conversations", table: "conversations" },
    { key: "customers", table: "customers" },
  ];

  for (const step of dataSteps) {
    deletedCounts[step.key] = await countAll(admin, step.table);
    const { error } = await admin.from(step.table).delete().neq("id", NIL_UUID);
    if (error) errors.push(`${step.table}: ${error.message}`);
  }

  // 2) Remove every account except the acting admin: employees, portal
  //    customers, AND other admins (profiles + auth users). We delete the
  //    profile row first, then the auth user (mirrors deleteEmployee). A failed
  //    auth-user delete is recorded but doesn't abort the rest.
  const { data: otherProfiles, error: profilesErr } = await admin
    .from("profiles")
    .select("id")
    .neq("id", actingAdminId)
    .returns<{ id: string }[]>();
  if (profilesErr) {
    errors.push(`profiles (list): ${profilesErr.message}`);
  }

  const ids = (otherProfiles ?? []).map((p) => p.id);
  if (ids.length > 0) {
    const { error: profileDelErr } = await admin
      .from("profiles")
      .delete()
      .in("id", ids);
    if (profileDelErr) errors.push(`profiles (delete): ${profileDelErr.message}`);

    for (const id of ids) {
      const { error: authErr } = await admin.auth.admin.deleteUser(id);
      if (authErr) {
        errors.push(`auth user ${id}: ${authErr.message}`);
      } else {
        deletedCounts.accounts += 1;
      }
    }
  }

  // 3) Empty the private attachments bucket. Leave the branding bucket (logo)
  //    completely untouched.
  try {
    const paths = await listAllObjects(admin, ATTACHMENT_BUCKET);
    if (paths.length > 0) {
      // remove() caps at ~1000 keys per call — chunk to be safe.
      for (let i = 0; i < paths.length; i += 1000) {
        const chunk = paths.slice(i, i + 1000);
        const { error: rmErr } = await admin.storage
          .from(ATTACHMENT_BUCKET)
          .remove(chunk);
        if (rmErr) errors.push(`storage: ${rmErr.message}`);
        else deletedCounts.attachments += chunk.length;
      }
    }
  } catch (e) {
    errors.push(`storage: ${e instanceof Error ? e.message : "list/remove failed"}`);
  }

  return { ok: true, summary: { deletedCounts, errors } };
}

/** Save (or clear) the business logo URL after it's uploaded to Storage. */
export async function saveBrandLogo(logoUrl: string | null): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_settings")
    .upsert(
      { id: 1, logo_url: logoUrl, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
