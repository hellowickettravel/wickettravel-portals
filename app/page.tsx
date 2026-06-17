import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath } from "@/lib/auth";

export default async function RootPage() {
  const { user, profile } = await getUserAndProfile();

  if (!user) {
    redirect("/login");
  }

  // Logged in → send to the role dashboard, or back to login if no valid role.
  redirect(roleDashboardPath(profile?.role) ?? "/login");
}
