import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath, isDeactivated } from "@/lib/auth";
import { getBrandLogoUrl } from "@/lib/db/branding";
import { countNewVisaEnquiries } from "@/lib/actions/visa";
import { PortalShell, type NavItem } from "@/components/portal/portal-shell";

function buildNav(newVisaCount: number): NavItem[] {
  return [
    { label: "Dashboard", href: "/admin", icon: "LayoutDashboard", exact: true },
    { label: "Employees", href: "/admin/employees", icon: "Users" },
    { label: "Customers", href: "/admin/customers", icon: "Contact" },
    { label: "Orders", href: "/admin/orders", icon: "ShoppingBag" },
    { label: "Transactions", href: "/admin/transactions", icon: "Receipt" },
    { label: "Messages", href: "/admin/messages", icon: "MessageSquare" },
    {
      label: "Visa Queries",
      href: "/admin/visa-queries",
      icon: "Stamp",
      badge: newVisaCount,
    },
    { label: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
    { label: "Support", href: "/admin/support", icon: "LifeBuoy" },
    { label: "Settings", href: "/admin/settings", icon: "Settings" },
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
  const [logoUrl, newVisaCount] = await Promise.all([
    getBrandLogoUrl(),
    countNewVisaEnquiries(),
  ]);

  return (
    <PortalShell
      navItems={buildNav(newVisaCount)}
      portalLabel="Admin Panel"
      userName={userName}
      roleLabel="Administrator"
      userId={user.id}
      logoUrl={logoUrl}
    >
      {children}
    </PortalShell>
  );
}
