import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath, isDeactivated } from "@/lib/auth";
import { getBrandLogoUrl } from "@/lib/db/branding";
import { countNewVisaEnquiries } from "@/lib/actions/visa";
import { countNewParentTickets } from "@/lib/actions/parents-tickets";
import { PortalShell, type NavItem } from "@/components/portal/portal-shell";

/**
 * Admin nav, in five blocks: where you land, the day's work, the two enquiry
 * queues, the people behind them, and the account. Consecutive items sharing a
 * `group` render under one Plex Mono header in the rail.
 */
function buildNav(newVisaCount: number, newParentTicketCount: number): NavItem[] {
  return [
    { label: "Dashboard", href: "/admin", icon: "LayoutDashboard", exact: true },

    { label: "Orders", href: "/admin/orders", icon: "ShoppingBag", group: "Work" },
    { label: "Transactions", href: "/admin/transactions", icon: "Receipt", group: "Work" },
    { label: "Messages", href: "/admin/messages", icon: "MessageSquare", group: "Work" },

    {
      label: "Visa Queries",
      href: "/admin/visa-queries",
      icon: "Stamp",
      badge: newVisaCount,
      group: "Enquiries",
    },
    {
      label: "Parents Tickets",
      href: "/admin/parents-tickets",
      icon: "HeartHandshake",
      badge: newParentTicketCount,
      group: "Enquiries",
    },

    { label: "Employees", href: "/admin/employees", icon: "Users", group: "People" },
    { label: "Customers", href: "/admin/customers", icon: "Contact", group: "People" },

    { label: "Analytics", href: "/admin/analytics", icon: "BarChart3", group: "Account" },
    { label: "Support", href: "/admin/support", icon: "LifeBuoy", group: "Account" },
    { label: "Settings", href: "/admin/settings", icon: "Settings", group: "Account" },
  ];
}

export default async function AdminLayout({
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
  if (profile?.role !== "admin") {
    // Logged in but wrong portal → send to their own dashboard, not /login.
    redirect(roleDashboardPath(profile?.role) ?? "/login");
  }

  const userName = profile?.full_name?.trim() || user.email || "Admin";
  const [logoUrl, newVisaCount, newParentTicketCount] = await Promise.all([
    getBrandLogoUrl(),
    countNewVisaEnquiries(),
    countNewParentTickets(),
  ]);

  return (
    <PortalShell
      navItems={buildNav(newVisaCount, newParentTicketCount)}
      portalLabel="Admin portal"
      userName={userName}
      roleLabel="Administrator"
      userId={user.id}
      logoUrl={logoUrl}
    >
      {children}
    </PortalShell>
  );
}
