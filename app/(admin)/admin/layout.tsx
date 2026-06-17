import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { PortalShell, type NavItem } from "@/components/portal/portal-shell";

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "LayoutDashboard", exact: true },
  { label: "Employees", href: "/admin/employees", icon: "Users" },
  { label: "Orders", href: "/admin/orders", icon: "ShoppingBag" },
  { label: "Messages", href: "/admin/messages", icon: "MessageSquare" },
  { label: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
  { label: "Settings", href: "/admin/settings", icon: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  if (!user || profile?.role !== "admin") {
    redirect("/login");
  }

  const userName = profile?.full_name?.trim() || user.email || "Admin";

  return (
    <PortalShell
      navItems={NAV}
      portalLabel="Admin Panel"
      userName={userName}
      roleLabel="Administrator"
    >
      {children}
    </PortalShell>
  );
}
