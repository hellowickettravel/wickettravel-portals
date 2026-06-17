import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { PortalShell, type NavItem } from "@/components/portal/portal-shell";

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/employee", icon: "LayoutDashboard", exact: true },
  { label: "Messages", href: "/employee/messages", icon: "MessageSquare" },
  { label: "Orders", href: "/employee/orders", icon: "ShoppingBag" },
  { label: "Support", href: "/employee/support", icon: "LifeBuoy" },
  { label: "Settings", href: "/employee/settings", icon: "Settings" },
];

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  if (!user || profile?.role !== "employee") {
    redirect("/login");
  }

  const userName = profile?.full_name?.trim() || user.email || "Employee";

  return (
    <PortalShell
      navItems={NAV}
      portalLabel="Employee Portal"
      userName={userName}
      roleLabel="Employee"
    >
      {children}
    </PortalShell>
  );
}
