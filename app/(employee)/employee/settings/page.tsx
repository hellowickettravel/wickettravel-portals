import { getUserAndProfile } from "@/lib/auth";
import { SettingsForm } from "@/components/employee/settings-form";

export default async function EmployeeSettingsPage() {
  const { user, profile } = await getUserAndProfile();
  const initialName = profile?.full_name?.trim() || "";
  const email = user?.email ?? "";

  return <SettingsForm initialName={initialName} email={email} />;
}
