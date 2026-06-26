import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { normalizeAccess, canAccessSection, canCreateOrders } from "@/lib/access";
import { EmployeeOrderCreate } from "@/components/employee/order-create";

export default async function EmployeeNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { profile } = await getUserAndProfile();
  const access = normalizeAccess(profile?.access_level);

  // Route-level guard: chat_only has no orders access; view_only can't create.
  if (!canAccessSection("orders", access) || !canCreateOrders(access)) {
    redirect("/employee/orders");
  }

  const { c } = await searchParams;
  return <EmployeeOrderCreate presetConversationId={c} />;
}
