import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath, isDeactivated } from "@/lib/auth";
import { CustomerPortalShell } from "@/components/customer/customer-portal-shell";
import { GuestBookShell } from "@/components/customer/guest-shell";

/**
 * Layout for the ONE public customer page: /customer/book. Unlike the rest of
 * /customer (see app/(customer)/customer/layout.tsx), a signed-out visitor may
 * view and fill the booking wizard — placing the order is what requires an
 * account. Signed-in customers get the normal portal shell; staff are bounced
 * to their own portal exactly like the private customer layout does.
 */
export default async function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  if (!user) {
    return <GuestBookShell>{children}</GuestBookShell>;
  }

  // Deactivated mid-session → lose access on the next request.
  if (isDeactivated(profile)) {
    redirect("/login?error=account_deactivated");
  }
  if (profile?.role !== "customer") {
    // Logged in but wrong portal → send to their own dashboard, not /login.
    redirect(roleDashboardPath(profile?.role) ?? "/login");
  }

  const name = profile?.full_name?.trim() || user.email || "Traveller";

  return (
    <CustomerPortalShell
      userId={user.id}
      userName={name}
      userEmail={user.email ?? ""}
      avatarUrl={profile?.avatar_url ?? null}
    >
      {children}
    </CustomerPortalShell>
  );
}
