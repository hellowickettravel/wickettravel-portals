import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath, isDeactivated } from "@/lib/auth";
import {
  normalizeAccess,
  canAccessSection,
  type EmployeeSection,
} from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getBrandLogoUrl } from "@/lib/db/branding";
import {
  AdminShell,
  type AdminNavSection,
  type NavCounts,
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
    /** Which live count, if any, sits on this row — resolved by the shell. */
    countKey?: "messages" | "orders";
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
        countKey: "orders",
      },
      {
        label: "Messages",
        href: "/employee/messages",
        icon: "messages",
        section: "messages",
        countKey: "messages",
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

/**
 * The rail's warm figures: what is actually waiting on this employee.
 *
 * This used to `await getInboxForEmployee()` AND `getMyVisibleOrders()` — the
 * entire inbox and every order this employee can see, every row and every
 * column of both — to produce two small numbers, before a single pixel of the
 * shell was allowed to render. Now they are `count(*)` head queries (the rows
 * are never transferred) and, more importantly, the promise is handed to
 * `AdminShell` UNAWAITED and unwrapped with `use()` inside a `<Suspense>`.
 * The sidebar, top bar and page paint immediately; the badges arrive after.
 *
 * Never `await` decoration.
 *
 * A count that throws must not take the portal down, so each one falls back to
 * zero and the whole thing is wrapped again — an empty map renders no badge,
 * which is the right degraded state.
 */
async function loadNavCounts(userId: string): Promise<NavCounts> {
  try {
    const supabase = await createClient();
    const zero = () => 0;

    const [messages, orders] = await Promise.all([
      // Conversations assigned to this employee that are still open. RLS
      // already scopes the table, but the assignment join is what makes this
      // "mine" rather than "everyone's".
      supabase
        .from("assignments")
        .select("conversation_id, conversations!inner(status)", {
          count: "exact",
          head: true,
        })
        .eq("employee_id", userId)
        .eq("conversations.status", "open")
        .then((r) => r.count ?? 0, zero),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "in_progress"])
        .then((r) => r.count ?? 0, zero),
    ]);

    return { messages, orders };
  } catch {
    return {};
  }
}

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

  // Started, NOT awaited — see loadNavCounts below.
  const navCounts = loadNavCounts(user.id);
  const logoUrl = await getBrandLogoUrl();

  const sections: AdminNavSection[] = NAV.map((group) => ({
    heading: group.heading,
    items: group.items
      .filter((item) => canAccessSection(item.section, access))
      .map(({ section: _section, ...item }) => item),
  })).filter((group) => group.items.length > 0);

  const userName = profile?.full_name?.trim() || user.email || "Employee";

  return (
    <AdminShell
      sections={sections}
      userName={userName}
      userEmail={user.email ?? ""}
      userId={user.id}
      logoUrl={logoUrl}
      navCounts={navCounts}
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
