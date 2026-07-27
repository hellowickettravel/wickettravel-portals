import { getUserAndProfile } from "@/lib/auth";
import { NotificationsView } from "@/components/portal/notifications-view";

export default async function CustomerNotificationsPage() {
  const { user } = await getUserAndProfile();
  return <NotificationsView userId={user?.id ?? ""} portal="customer" />;
}
