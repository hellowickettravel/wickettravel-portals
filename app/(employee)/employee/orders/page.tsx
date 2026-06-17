import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { normalizeAccess, canAccessSection } from "@/lib/access";
import { EmployeeOrders } from "@/components/employee/orders-view";

export default async function EmployeeOrdersPage() {
  const { profile } = await getUserAndProfile();
  const access = normalizeAccess(profile?.access_level);

  // Route-level guard: chat_only has NO orders access. Hiding the nav link is
  // not enough — block direct navigation to this route too.
  if (!canAccessSection("orders", access)) {
    redirect("/employee");
  }

  return <EmployeeOrders accessLevel={access} />;
}
