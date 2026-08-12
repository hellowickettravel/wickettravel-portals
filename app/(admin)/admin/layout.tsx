import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath, isDeactivated } from "@/lib/auth";
import { getBrandLogoUrl } from "@/lib/db/branding";
import { createClient } from "@/lib/supabase/server";
import { countNewVisaEnquiries } from "@/lib/actions/visa";
import { countNewParentTickets } from "@/lib/actions/parents-tickets";
import { countPendingVerifications } from "@/lib/actions/parents-marketplace";
import { countPendingListings } from "@/lib/actions/parents-listings";
import { countOpenMatches } from "@/lib/actions/parents-matches";
import { countUnsettledPayments } from "@/lib/actions/parents-payments";
import {
  AdminShell,
  type AdminNavSection,
  type NavCounts,
} from "@/components/admin/admin-shell";

/**
 * The design's sidebar: Dashboard on its own, then Work / Enquiries / Peoples
 * / Admin. Orders, Messages, the two enquiry queues and Support each carry a
 * live unactioned count; everything else is a plain destination.
 *
 * The counts are referenced by KEY, not by value: they stream in separately
 * (see `navCounts` in admin-shell.tsx) so the sidebar renders instantly rather
 * than waiting on nine `count(*)` queries.
 */
function buildNav(): AdminNavSection[] {
  return [
    {
      items: [
        {
          label: "Dashboard",
          href: "/admin",
          icon: "dashboard",
          exact: true,
          emphasize: true,
        },
      ],
    },
    {
      heading: "Work",
      items: [
        { label: "Orders", href: "/admin/orders", icon: "orders", countKey: "orders" },
        {
          label: "Messages",
          href: "/admin/messages",
          icon: "messages",
          countKey: "messages",
        },
        { label: "Analytics", href: "/admin/analytics", icon: "analytics" },
        {
          label: "Transactions",
          href: "/admin/transactions",
          icon: "transactions",
        },
      ],
    },
    {
      heading: "Enquiries",
      items: [
        {
          label: "Visa queries",
          href: "/admin/visa-queries",
          icon: "visa",
          countKey: "visa",
        },
        {
          label: "Parent tickets",
          href: "/admin/parents-tickets",
          icon: "parents",
          countKey: "parents",
        },
        {
          label: "Parent listings",
          href: "/admin/parents-listings",
          icon: "board",
          countKey: "listings",
        },
        {
          label: "Matches",
          href: "/admin/parents-matches",
          icon: "match",
          countKey: "matches",
        },
        {
          label: "Verifications",
          href: "/admin/parents-verification",
          icon: "shield",
          countKey: "verifications",
        },
        {
          label: "Parent payments",
          href: "/admin/parents-payments",
          icon: "transactions",
          countKey: "payments",
        },
      ],
    },
    {
      heading: "Peoples",
      items: [
        { label: "Employees", href: "/admin/employees", icon: "employees" },
        { label: "Customers", href: "/admin/customers", icon: "customers" },
      ],
    },
    {
      heading: "Admin",
      items: [
        { label: "Support", href: "/admin/support", icon: "support", countKey: "support" },
        { label: "Settings", href: "/admin/settings", icon: "settings" },
      ],
    },
  ];
}

/**
 * Every sidebar badge in one unawaited promise.
 *
 * Deliberately NOT awaited by the layout. Each of these is its own round trip
 * to Supabase; awaiting them held the entire shell — sidebar, top bar, page —
 * behind nine queries that only decorate five nav rows. Handing the promise to
 * the shell lets React stream the numbers in after the UI is already usable.
 *
 * `.catch()` per group: a failing count must never take the portal down. A
 * missing badge is a far smaller problem than a blank screen.
 */
async function loadNavCounts(): Promise<NavCounts> {
  try {
    return await readNavCounts();
  } catch {
    // An unhandled rejection here would surface through `use()` in the shell
    // and take the whole sidebar down. Badges are decoration; an empty map
    // renders no badge, which is the correct degraded state.
    return {};
  }
}

async function readNavCounts(): Promise<NavCounts> {
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const zero = () => 0;

  const [
    visa,
    parents,
    verifications,
    listings,
    matches,
    payments,
    orders,
    messages,
    support,
  ] = await Promise.all([
    countNewVisaEnquiries().catch(zero),
    countNewParentTickets().catch(zero),
    countPendingVerifications().catch(zero),
    countPendingListings().catch(zero),
    countOpenMatches().catch(zero),
    countUnsettledPayments().catch(zero),
    supabase
      .from("orders")
      .select("id", head)
      .in("status", ["new", "in_progress"])
      .then((r) => r.count ?? 0, zero),
    supabase
      .from("conversations")
      .select("id", head)
      .eq("status", "open")
      .then((r) => r.count ?? 0, zero),
    supabase
      .from("support_tickets")
      .select("id", head)
      .eq("status", "open")
      .then((r) => r.count ?? 0, zero),
  ]);

  return {
    orders,
    messages,
    visa,
    parents,
    verifications,
    listings,
    matches,
    payments,
    support,
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* Started before the auth round trips, because the company logo does not
     depend on who is asking. Awaiting it after the guard cost a serial ~180ms
     on top of auth's two hops. */
  const logoPromise = getBrandLogoUrl();

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

  // Started, NOT awaited — the shell renders while these are still in flight.
  const navCounts = loadNavCounts();
  const logoUrl = await logoPromise;

  return (
    // AdminShell reads ?q= to seed the top-bar search, so it needs a Suspense
    // boundary — useSearchParams opts its subtree out of static rendering.
    <Suspense fallback={null}>
      <AdminShell
        sections={buildNav()}
        navCounts={navCounts}
        userName={userName}
        userEmail={user.email ?? ""}
        userId={user.id}
        logoUrl={logoUrl}
        /* The COMPANY mark above; the PERSON's picture here. Two different
           images from two different tables, and that separation is the point. */
        avatarUrl={profile?.avatar_url ?? null}
      >
        {children}
      </AdminShell>
    </Suspense>
  );
}
