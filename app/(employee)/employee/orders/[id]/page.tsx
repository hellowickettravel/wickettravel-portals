import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { normalizeAccess, canAccessSection, canEditOrders } from "@/lib/access";
import { getOrderById } from "@/lib/db/orders";
import { getPreOrderAttachments } from "@/lib/db/order-messages";
import { getCustomerSnapshot } from "@/lib/db/customers";
import { OrderDetail } from "@/components/admin/order-detail";

export default async function EmployeeOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await getUserAndProfile();
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

  const [attachments, customer] = await Promise.all([
    getPreOrderAttachments(id),
    order.customer?.id ? getCustomerSnapshot(order.customer.id) : null,
  ]);

  /**
   * The same screen /admin renders — the design belongs to the portal, not the
   * role. What differs is what this employee may do with it: editing and the
   * status controls need semi_admin, reassignment is an admin action, and
   * there is no employee-facing customer profile to link to.
   */
  return (
    <OrderDetail
      order={order}
      employees={[]}
      attachments={attachments}
      customer={customer}
      currentUserId={user?.id ?? ""}
      currentUserName={profile?.full_name ?? "Support"}
      basePath="/employee"
      canEdit={canEditOrders(access)}
      canAssign={false}
      canViewCustomer={false}
    />
  );
}
