import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The SERVER half of the order lifecycle.
 *
 * `lib/actions/order-lifecycle.ts` carries `"use server"`, and such a module may
 * only export async functions — a server-only probe exported from there is a
 * build error. The shared constant lives in `lib/orders/display.ts` instead,
 * because the client components need it too and this file is server-only.
 */

/**
 * Does this database carry the delivery columns yet?
 *
 * Cached for the life of the server process: the answer only changes when
 * someone runs a migration, and probing on every request would cost a round
 * trip per page view. Deliberately fail-closed — an unmigrated database simply
 * doesn't show the delivery controls.
 */
let deliveryTracking: boolean | null = null;

export async function hasDeliveryTracking(): Promise<boolean> {
  if (deliveryTracking !== null) return deliveryTracking;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("orders").select("delivered_at").limit(1);
    deliveryTracking = !error;
  } catch {
    deliveryTracking = false;
  }
  return deliveryTracking;
}
