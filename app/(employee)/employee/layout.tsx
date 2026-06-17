import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { normalizeAccess, type AccessLevel } from "@/lib/access";
import { PortalShell, type NavItem } from "@/components/portal/portal-shell";

// Nav with the access levels allowed to see each item. Items the employee
// can't use are filtered out entirely (not greyed). To test levels, set the
// employee's profiles.access_level to 'chat_only' or 'view_only'.
const ALL: AccessLevel[] = ["full", "chat_only", "view_only"];

const NAV: (NavItem & { access: AccessLevel[] })[] = [
  { label: "Dashboard", href: "/employee", icon: "LayoutDashboard", exact: true, access: ALL },
  { label: "Messages", href: "/employee/messages", icon: "MessageSquare", access: ALL },
  { label: "Orders", href: "/employee/orders", icon: "ShoppingBag", access: ["full", "view_only"] },
  { label: "Support", href: "/employee/support", icon: "LifeBuoy", access: ALL },
  { label: "Settings", href: "/employee/settings", icon: "Settings", access: ALL },
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

  const access = normalizeAccess(profile?.access_level);
  const navItems: NavItem[] = NAV.filter((item) => item.access.includes(access)).map(
    ({ access: _access, ...item }) => item
  );

  const userName = profile?.full_name?.trim() || user.email || "Employee";

  return (
    <PortalShell
      navItems={navItems}
      portalLabel="Employee Portal"
      userName={userName}
      roleLabel="Employee"
    >
      {children}
    </PortalShell>
  );
}
