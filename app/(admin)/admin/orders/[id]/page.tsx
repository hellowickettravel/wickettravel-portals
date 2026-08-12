import { notFound } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getOrderById } from "@/lib/db/orders";
import { getPreOrderAttachments } from "@/lib/db/order-messages";
import { getEmployees } from "@/lib/db/profiles";
import { getCustomerSnapshot } from "@/lib/db/customers";
import { hasDeliveryTracking } from "@/lib/orders/lifecycle";
import { sweepAutoCompleteOrders } from "@/lib/actions/order-lifecycle";
import { OrderDetail } from "@/components/admin/order-detail";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Settle anything whose 24-hour approval window has run out before reading
  // the record, so the screen never shows a stale "In progress" for an order
  // the clock has already closed. No-ops on an unmigrated database.
  await sweepAutoCompleteOrders();

  const [order, employees, attachments, { user, profile }, canDeliver] =
    await Promise.all([
      getOrderById(id),
      getEmployees(),
      getPreOrderAttachments(id),
      getUserAndProfile(),
      hasDeliveryTracking(),
    ]);

  if (!order) notFound();

  // The design's Customer card reads email and a lifetime summary, neither of
  // which rides along on the order row.
  const customer = order.customer?.id
    ? await getCustomerSnapshot(order.customer.id)
    : null;

  return (
    <OrderDetail
      order={order}
      employees={employees}
      attachments={attachments}
      customer={customer}
      currentUserId={user?.id ?? ""}
      currentUserName={profile?.full_name ?? "Admin"}
      canDeliver={canDeliver}
    />
  );
}
