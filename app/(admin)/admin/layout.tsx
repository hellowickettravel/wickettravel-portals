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
} from "@/components/admin/admin-shell";

type NavCounts = {
  orders: number;
  messages: number;
  visa: number;
  parents: number;
  verifications: number;
  listings: number;
  matches: number;
  payments: number;
  support: number;
};

/**
 * The design's sidebar: Dashboard on its own, then Work / Enquiries / Peoples
 * / Admin. Orders, Messages, the two enquiry queues and Support each carry a
 * live unactioned count; everything else is a plain destination.
 */
function buildNav(c: NavCounts): AdminNavSection[] {
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
        { label: "Orders", href: "/admin/orders", icon: "orders", count: c.orders },
        {
          label: "Messages",
          href: "/admin/messages",
          icon: "messages",
          count: c.messages,
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
          count: c.visa,
        },
        {
          label: "Parent tickets",
          href: "/admin/parents-tickets",
          icon: "parents",
          count: c.parents,
        },
        {
          label: "Parent listings",
          href: "/admin/parents-listings",
          icon: "board",
          count: c.listings,
        },
        {
          label: "Matches",
          href: "/admin/parents-matches",
          icon: "match",
          count: c.matches,
        },
        {
          label: "Verifications",
          href: "/admin/parents-verification",
          icon: "shield",
          count: c.verifications,
        },
        {
          label: "Parent payments",
          href: "/admin/parents-payments",
          icon: "transactions",
          count: c.payments,
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
        { label: "Support", href: "/admin/support", icon: "support", count: c.support },
        { label: "Settings", href: "/admin/settings", icon: "settings" },
      ],
    },
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
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [
    logoUrl,
    newVisaCount,
    newParentTicketCount,
    pendingVerifications,
    pendingListings,
    openMatches,
    unsettledPayments,
    activeOrders,
    openConversations,
    openTickets,
  ] = await Promise.all([
    getBrandLogoUrl(),
    countNewVisaEnquiries(),
    countNewParentTickets(),
    countPendingVerifications(),
    countPendingListings(),
    countOpenMatches(),
    countUnsettledPayments(),
    supabase
      .from("orders")
      .select("id", head)
      .in("status", ["new", "in_progress"])
      .then((r) => r.count ?? 0),
    supabase
      .from("conversations")
      .select("id", head)
      .eq("status", "open")
      .then((r) => r.count ?? 0),
    supabase
      .from("support_tickets")
      .select("id", head)
      .eq("status", "open")
      .then((r) => r.count ?? 0),
  ]);

  return (
    // AdminShell reads ?q= to seed the top-bar search, so it needs a Suspense
    // boundary — useSearchParams opts its subtree out of static rendering.
    <Suspense fallback={null}>
      <AdminShell
        sections={buildNav({
          orders: activeOrders,
          messages: openConversations,
          visa: newVisaCount,
          parents: newParentTicketCount,
          verifications: pendingVerifications,
          listings: pendingListings,
          matches: openMatches,
          payments: unsettledPayments,
          support: openTickets,
        })}
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
