import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath, isDeactivated } from "@/lib/auth";
import {
  normalizeAccess,
  canAccessSection,
  type EmployeeSection,
} from "@/lib/access";
import { getBrandLogoUrl } from "@/lib/db/branding";
import { PortalShell, type NavItem } from "@/components/portal/portal-shell";

// Nav items, each tagged with the section it belongs to. Visibility is derived
// from the access matrix in lib/access.ts (the single source of truth) — items
// the employee can't open are filtered out entirely (not greyed). The matching
// route is ALSO guarded server-side on its page, so hiding the link is not the
// only line of defence.
const NAV: (NavItem & { section: EmployeeSection })[] = [
  { label: "Dashboard", href: "/employee", icon: "LayoutDashboard", exact: true, section: "dashboard" },
  { label: "Messages", href: "/employee/messages", icon: "MessageSquare", section: "messages" },
  { label: "Orders", href: "/employee/orders", icon: "ShoppingBag", section: "orders" },
  { label: "Support", href: "/employee/support", icon: "LifeBuoy", section: "support" },
  { label: "Settings", href: "/employee/settings", icon: "Settings", section: "settings" },
];

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  if (!user) {
    redirect("/login");
  }
  // Deactivated mid-session → lose access on the next request.
  if (isDeactivated(profile)) {
    redirect("/login?error=account_deactivated");
  }
  if (profile?.role !== "employee") {
    // Logged in but wrong portal → send to their own dashboard, not /login.
    redirect(roleDashboardPath(profile?.role) ?? "/login");
  }

  const access = normalizeAccess(profile?.access_level);
  const navItems: NavItem[] = NAV.filter((item) =>
    canAccessSection(item.section, access)
  ).map(({ section: _section, ...item }) => item);

  const userName = profile?.full_name?.trim() || user.email || "Employee";
  const logoUrl = await getBrandLogoUrl();

  return (
    <PortalShell
      navItems={navItems}
      portalLabel="Employee Portal"
      userName={userName}
      roleLabel="Employee"
      userId={user.id}
      logoUrl={logoUrl}
    >
      {children}
    </PortalShell>
  );
}
