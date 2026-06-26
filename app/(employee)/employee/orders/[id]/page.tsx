import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { normalizeAccess, canAccessSection, canEditOrders } from "@/lib/access";
import { getOrderById } from "@/lib/db/orders";
import { getPreOrderAttachments } from "@/lib/db/order-messages";
import { EmployeeOrderDetail } from "@/components/employee/order-detail";

export default async function EmployeeOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await getUserAndProfile();
  const access = normalizeAccess(profile?.access_level);

  // Route-level guard: chat_only has NO orders access at all.
  if (!canAccessSection("orders", access)) {
    redirect("/employee");
  }

  // getOrderById runs as the signed-in user, so RLS (orders_select_employee)
  // returns null for any order this employee can't see — the server-side guard.
  const order = await getOrderById(id);
  if (!order) {
    redirect("/employee/orders");
  }

  const attachments = await getPreOrderAttachments(id);

  // Edit/status controls only for semi_admin; everyone else sees it read-only.
  return (
    <EmployeeOrderDetail
      order={order}
      canEdit={canEditOrders(access)}
      attachments={attachments}
    />
  );
}
