import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath, isDeactivated } from "@/lib/auth";
import {
  normalizeAccess,
  canAccessSection,
  type EmployeeSection,
} from "@/lib/access";
import { getBrandLogoUrl } from "@/lib/db/branding";
import { getInboxForEmployee } from "@/lib/db/conversations";
import { getMyVisibleOrders } from "@/lib/db/orders";
import {
  AdminShell,
  type AdminNavSection,
  type SearchScreen,
} from "@/components/admin/admin-shell";
import type { NavIconName } from "@/components/admin/icons";

/**
 * Nav items, each tagged with the section it belongs to. Visibility comes from
 * the access matrix in lib/access.ts (the single source of truth) — items the
 * employee cannot open are filtered out entirely, not greyed. The matching
 * route is ALSO guarded server-side on its page, so hiding the link is never
 * the only line of defence.
 *
 * Grouped the way the admin design groups its eleven areas: an ungrouped
 * Dashboard, then the work, then the account.
 */
const NAV: {
  heading?: string;
  items: {
    label: string;
    href: string;
    icon: NavIconName;
    exact?: boolean;
    emphasize?: boolean;
    section: EmployeeSection;
    /** Which live count, if any, sits on this row. */
    count?: "messages" | "orders";
  }[];
}[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/employee",
        icon: "dashboard",
        exact: true,
        emphasize: true,
        section: "dashboard",
      },
    ],
  },
  {
    heading: "Work",
    items: [
      {
        label: "Orders",
        href: "/employee/orders",
        icon: "orders",
        section: "orders",
        count: "orders",
      },
      {
        label: "Messages",
        href: "/employee/messages",
        icon: "messages",
        section: "messages",
        count: "messages",
      },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Support", href: "/employee/support", icon: "support", section: "support" },
      { label: "Settings", href: "/employee/settings", icon: "settings", section: "settings" },
    ],
  },
];

/** The employee portal's own per-screen search map. */
const SEARCH: SearchScreen[] = [
  { prefix: "/employee", exact: true, placeholder: "Search orders, chats…", label: "Search" },
  { prefix: "/employee/orders", exact: true, placeholder: "Search orders", label: "Search orders" },
  { prefix: "/employee/messages", exact: true, placeholder: "Search conversations", label: "Search conversations" },
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

  // The rail's warm figures: what is actually waiting on this employee.
  const [inbox, orders, logoUrl] = await Promise.all([
    getInboxForEmployee(user.id).catch(() => []),
    getMyVisibleOrders().catch(() => []),
    getBrandLogoUrl(),
  ]);
  const counts = {
    messages: inbox.filter((c) => (c.unreadCount ?? 0) > 0).length,
    orders: orders.filter(
      (o) => o.status === "new" || o.status === "in_progress"
    ).length,
  };

  const sections: AdminNavSection[] = NAV.map((group) => ({
    heading: group.heading,
    items: group.items
      .filter((item) => canAccessSection(item.section, access))
      .map(({ section: _section, count, ...item }) => ({
        ...item,
        count: count ? counts[count] : undefined,
      })),
  })).filter((group) => group.items.length > 0);

  const userName = profile?.full_name?.trim() || user.email || "Employee";

  return (
    <AdminShell
      sections={sections}
      userName={userName}
      userEmail={user.email ?? ""}
      userId={user.id}
      logoUrl={logoUrl}
      avatarUrl={profile?.avatar_url ?? null}
      roleLabel="Employee"
      homeHref="/employee"
      settingsHref="/employee/settings"
      supportHref="/employee/support"
      searchScreens={SEARCH}
    >
      {children}
    </AdminShell>
  );
}
