import { notFound } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getOrderById } from "@/lib/db/orders";
import { getPreOrderAttachments } from "@/lib/db/order-messages";
import { CustomerOrderDetail } from "@/components/customer/order-detail";

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // getOrderById runs under RLS (orders_select_customer), so a customer only
  // ever resolves their own order — anything else comes back null.
  const order = await getOrderById(id);
  if (!order) notFound();

  const [attachments, { user, profile }] = await Promise.all([
    getPreOrderAttachments(id),
    getUserAndProfile(),
  ]);
  if (!user) notFound();

  return (
    <CustomerOrderDetail
      order={order}
      attachments={attachments}
      customerName={profile?.full_name?.trim() || user.email || "You"}
    />
  );
}
