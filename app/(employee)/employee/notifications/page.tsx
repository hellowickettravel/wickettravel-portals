import { getUserAndProfile } from "@/lib/auth";
import { AdminNotifications } from "@/components/admin/admin-notifications";

export default async function EmployeeNotificationsPage() {
  const { user } = await getUserAndProfile();
  // The same screen /admin renders — `listAllMyNotifications` is already
  // per-user, so an employee only ever sees their own. Only the destinations
  // change, which is what basePath is for.
  return (
    <AdminNotifications userId={user?.id ?? ""} basePath="/employee" />
  );
}
