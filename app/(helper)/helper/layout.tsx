import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath, isDeactivated } from "@/lib/auth";
import { HelperPortalShell } from "@/components/helper/helper-portal-shell";

/**
 * The helper portal is role-gated exactly like the other three: signed out →
 * login, deactivated → out, wrong role → their own dashboard rather than a
 * dead end. A customer who lands here is sent to /customer, not shown a 403.
 */
export default async function HelperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  if (!user) redirect("/login");
  if (isDeactivated(profile)) redirect("/login?error=account_deactivated");
  if (profile?.role !== "helper") {
    redirect(roleDashboardPath(profile?.role) ?? "/login");
  }

  return (
    <HelperPortalShell
      userId={user.id}
      userName={profile?.full_name?.trim() || user.email || "Helper"}
      userEmail={user.email ?? ""}
    >
      {children}
    </HelperPortalShell>
  );
}
