import { getUserAndProfile } from "@/lib/auth";
import { normalizeAccess } from "@/lib/access";
import { EmployeeOrders } from "@/components/employee/orders-view";

export default async function EmployeeOrdersPage() {
  const { profile } = await getUserAndProfile();
  const access = normalizeAccess(profile?.access_level);
  return <EmployeeOrders accessLevel={access} />;
}
