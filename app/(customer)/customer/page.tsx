import { getUserAndProfile } from "@/lib/auth";
import { CustomerDashboard } from "@/components/customer/dashboard";

export default async function CustomerDashboardPage() {
  const { user, profile } = await getUserAndProfile();
  const fullName = profile?.full_name?.trim() || user?.email || "Traveller";
  const firstName = fullName.split(/\s+/)[0];

  // Server Component render: reading the request time once is intentional, and
  // keeps the client dashboard's own render pure.
  const nowIso = new Date().toISOString();

  return <CustomerDashboard firstName={firstName} nowIso={nowIso} />;
}
