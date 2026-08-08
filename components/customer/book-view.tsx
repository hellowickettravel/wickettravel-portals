"use client";

import { createCustomerOrder } from "@/lib/actions/customer";
import type { BookPrefill } from "@/lib/orders/book-link";
import { AdminOrderForm } from "@/components/admin/admin-order-form";

/**
 * The customer's booking wizard — the same three-step wizard the staff portals
 * create orders with, in its customer audience.
 *
 * The order is filed against the signed-in customer by `createCustomerOrder`,
 * which resolves their own customers row server-side; there is no customer
 * field to pick and nothing client-side names an account. A signed-out visitor
 * fills the whole thing and is routed through sign-up at the last step, with
 * their answers kept.
 */
export function CustomerBook({
  prefill,
  contactEmail,
  contactPhone,
  isGuest,
}: {
  prefill?: BookPrefill;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isGuest: boolean;
}) {
  return (
    <AdminOrderForm
      audience="customer"
      basePath="/customer"
      isGuest={isGuest}
      prefill={prefill}
      contactEmail={contactEmail}
      contactPhone={contactPhone}
      onCreate={async (input) => {
        const res = await createCustomerOrder(input);
        return res.ok
          ? {
              ok: true as const,
              data: {
                orderId: res.data.orderId,
                orderNumber: res.data.orderNumber,
              },
            }
          : res;
      }}
    />
  );
}
