import { notFound } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getOrderById } from "@/lib/db/orders";
import { getPreOrderAttachments } from "@/lib/db/order-messages";
import { getEmployees } from "@/lib/db/profiles";
import { getCustomerSnapshot } from "@/lib/db/customers";
import { OrderDetail } from "@/components/admin/order-detail";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [order, employees, attachments, { user, profile }] = await Promise.all([
    getOrderById(id),
    getEmployees(),
    getPreOrderAttachments(id),
    getUserAndProfile(),
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
    />
  );
}
