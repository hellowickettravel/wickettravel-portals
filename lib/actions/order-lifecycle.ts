"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify, notifyAdmins } from "@/lib/notify";
import { normalizeAccess, canEditOrders } from "@/lib/access";
import { hasDeliveryTracking } from "@/lib/orders/lifecycle";
import { AUTO_COMPLETE_HOURS } from "@/lib/orders/display";
import type { OrderStatus } from "@/lib/db/types";

/**
 * The order lifecycle — the rules that move an order between statuses on their
 * own, rather than waiting for somebody to remember.
 *
 *   new ──(an employee is assigned)──▶ in_progress
 *   in_progress ──(staff mark it delivered)──▶ awaiting the customer
 *   awaiting ──(customer approves | 24h elapses)──▶ completed
 *
 * Two deliberate choices:
 *
 * **The 24-hour close is swept lazily, not scheduled.** There is no pg_cron on
 * this project and no worker to run one, so a "background job" would be a job
 * that never runs. Instead every read of the order list settles anything that
 * has fallen due. The clock is `delivered_at` in the database, so the outcome
 * is identical whether the sweep fires at 24h or at 30h because nobody opened
 * the portal — the order still completes, and it completes once.
 *
 * **`delivered_at` is optional at the type level.** It arrives with
 * APPLY_ADMIN_ROUND3.sql; until that is run, `hasDeliveryTracking()` reports
 * false, the "Mark as delivered" control does not render, and the sweep is a
 * no-op. Nothing here breaks a database that has not been migrated — the same
 * contract every other additive change in this project follows.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Complete every order whose 24-hour approval window has run out.
 *
 * Runs with the service role because it acts for nobody in particular — it is
 * the clock, not a user. Never throws: a sweep that fails must not take the
 * page that triggered it down with it.
 *
 * Returns how many orders it closed, so a caller can decide whether to
 * re-fetch.
 */
export async function sweepAutoCompleteOrders(): Promise<number> {
  if (!(await hasDeliveryTracking())) return 0;
  try {
    const admin = createAdminClient();
    const cutoff = new Date(
      Date.now() - AUTO_COMPLETE_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await admin
      .from("orders")
      .update({ status: "completed", closed_at: new Date().toISOString() })
      .lt("delivered_at", cutoff)
      .not("delivered_at", "is", null)
      .in("status", ["new", "in_progress"])
      .select("id, order_number, customer_id");

    if (error || !data?.length) return 0;

    // Tell each customer their order closed itself, so a completed order is
    // never something they discover by accident.
    await Promise.all(
      data.map((o) =>
        o.customer_id
          ? notify({
              recipientId: o.customer_id,
              type: "status_change",
              title: `Order ${o.order_number} completed`,
              body: `We didn't hear back within ${AUTO_COMPLETE_HOURS} hours, so this order closed automatically. Reply on the order if anything is wrong.`,
              link: `/customer/orders`,
            })
          : Promise.resolve()
      )
    );
    return data.length;
  } catch {
    return 0;
  }
}

/**
 * Staff mark an order delivered: tickets issued, customer notified, 24-hour
 * approval clock started. Admins always; employees at semi_admin, and only on
 * an order RLS already lets them write.
 */
export async function markOrderDelivered(orderId: string): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };

  const isAdmin = profile?.role === "admin";
  if (!isAdmin) {
    if (profile?.role !== "employee") return { ok: false, error: "Unauthorized" };
    if (!canEditOrders(normalizeAccess(profile?.access_level))) {
      return {
        ok: false,
        error: "Your access level can't mark orders as delivered.",
      };
    }
  }

  if (!(await hasDeliveryTracking())) {
    return {
      ok: false,
      error:
        "Delivery tracking isn't enabled on this database yet — run APPLY_ADMIN_ROUND3.sql.",
    };
  }

  // The RLS-aware client is the gate: an employee who cannot see this order
  // updates zero rows and gets told so.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ delivered_at: new Date().toISOString(), status: "in_progress" })
    .eq("id", orderId)
    .in("status", ["new", "in_progress"])
    .select("id, order_number, customer_id");

  if (error) return { ok: false, error: error.message };
  if (!data?.length) {
    return {
      ok: false,
      error: "This order can't be marked delivered — it may already be closed.",
    };
  }

  const order = data[0];
  if (order.customer_id) {
    await notify({
      recipientId: order.customer_id,
      type: "status_change",
      title: `Order ${order.order_number} is ready`,
      body: `Your booking is confirmed. Approve it to close the order — otherwise it completes automatically in ${AUTO_COMPLETE_HOURS} hours.`,
      link: `/customer/orders`,
      actorId: user.id,
      actorName: profile?.full_name ?? null,
    });
  }
  return { ok: true };
}

/**
 * The customer's own "Approve & close" button.
 *
 * Deliberately a service-role write after an ownership check rather than a new
 * RLS policy: `orders_update_*` is written for staff, and widening it so a
 * customer can UPDATE the row would open every other column on it — price,
 * commission, assignment — to the browser. Here the customer decides exactly
 * one thing, and this function is the only thing that can act on it.
 */
export async function approveMyOrder(orderId: string): Promise<ActionResult> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "customer") {
    return { ok: false, error: "Unauthorized" };
  }

  const admin = createAdminClient();

  // Ownership: orders.customer_id is the customers row, which carries the
  // profile link. Resolve it rather than trusting anything from the client.
  const { data: mine } = await admin
    .from("customers")
    .select("id")
    .eq("profile_id", user.id)
    .returns<{ id: string }[]>();
  const customerIds = (mine ?? []).map((c) => c.id);
  if (customerIds.length === 0) {
    return { ok: false, error: "We couldn't find your customer record." };
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, status, customer_id, assigned_employee_id")
    .eq("id", orderId)
    .maybeSingle<{
      id: string;
      order_number: string;
      status: OrderStatus;
      customer_id: string | null;
      assigned_employee_id: string | null;
    }>();

  if (!order || !order.customer_id || !customerIds.includes(order.customer_id)) {
    return { ok: false, error: "That order isn't yours." };
  }
  if (order.status === "completed") return { ok: true };
  if (order.status === "cancelled") {
    return { ok: false, error: "This order was cancelled." };
  }

  const { error } = await admin
    .from("orders")
    .update({ status: "completed", closed_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };

  const who = profile?.full_name ?? "The customer";
  if (order.assigned_employee_id) {
    await notify({
      recipientId: order.assigned_employee_id,
      type: "status_change",
      title: `approved order ${order.order_number}`,
      body: "The customer confirmed everything is correct. The order is now complete.",
      link: `/employee/orders/${order.id}`,
      actorId: user.id,
      actorName: who,
    });
  }
  await notifyAdmins({
    type: "status_change",
    title: `approved order ${order.order_number}`,
    body: "Closed by the customer, not by staff.",
    link: `/admin/orders/${order.id}`,
    actorId: user.id,
    actorName: who,
  });

  return { ok: true };
}
