import { getUserAndProfile } from "@/lib/auth";
import { NotificationsView } from "@/components/portal/notifications-view";

export default async function AdminNotificationsPage() {
  const { user } = await getUserAndProfile();
  return <NotificationsView userId={user?.id ?? ""} portal="admin" />;
}
