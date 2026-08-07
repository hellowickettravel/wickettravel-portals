import { getUserAndProfile } from "@/lib/auth";
import { AdminNotifications } from "@/components/admin/admin-notifications";

export default async function AdminNotificationsPage() {
  const { user } = await getUserAndProfile();
  return <AdminNotifications userId={user?.id ?? ""} />;
}
