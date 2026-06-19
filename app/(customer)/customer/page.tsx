import { getUserAndProfile } from "@/lib/auth";
import { CustomerDashboard } from "@/components/customer/dashboard";

export default async function CustomerDashboardPage() {
  const { user, profile } = await getUserAndProfile();
  const fullName = profile?.full_name?.trim() || user?.email || "Traveller";
  const firstName = fullName.split(/\s+/)[0];

  return <CustomerDashboard firstName={firstName} />;
}
