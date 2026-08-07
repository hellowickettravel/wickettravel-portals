import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath, isDeactivated } from "@/lib/auth";
import { getBrandLogoUrl } from "@/lib/db/branding";
import { countNewVisaEnquiries } from "@/lib/actions/visa";
import { countNewParentTickets } from "@/lib/actions/parents-tickets";
import {
  AdminShell,
  type AdminNavSection,
} from "@/components/admin/admin-shell";

/**
 * The design's sidebar groups the twelve admin areas into four bands. The two
 * queues carry live unactioned counts; everything else is a plain destination.
 */
function buildNav(
  newVisaCount: number,
  newParentTicketCount: number
): AdminNavSection[] {
  return [
    {
      items: [
        { label: "Dashboard", href: "/admin", icon: "dashboard", exact: true },
      ],
    },
    {
      heading: "Work",
      items: [
        { label: "Orders", href: "/admin/orders", icon: "orders" },
        { label: "Messages", href: "/admin/messages", icon: "messages" },
        {
          label: "Visa Queries",
          href: "/admin/visa-queries",
          icon: "visa",
          count: newVisaCount,
        },
        {
          label: "Parents Tickets",
          href: "/admin/parents-tickets",
          icon: "parents",
          count: newParentTicketCount,
        },
        { label: "Support", href: "/admin/support", icon: "support" },
      ],
    },
    {
      heading: "People",
      items: [
        { label: "Employees", href: "/admin/employees", icon: "employees" },
        { label: "Customers", href: "/admin/customers", icon: "customers" },
      ],
    },
    {
      heading: "Business",
      items: [
        {
          label: "Transactions",
          href: "/admin/transactions",
          icon: "transactions",
        },
        { label: "Analytics", href: "/admin/analytics", icon: "analytics" },
        {
          label: "Notifications",
          href: "/admin/notifications",
          icon: "notifications",
        },
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
  const [logoUrl, newVisaCount, newParentTicketCount] = await Promise.all([
    getBrandLogoUrl(),
    countNewVisaEnquiries(),
    countNewParentTickets(),
  ]);

  return (
    // AdminShell reads ?q= to seed the top-bar search, so it needs a Suspense
    // boundary — useSearchParams opts its subtree out of static rendering.
    <Suspense fallback={null}>
      <AdminShell
        sections={buildNav(newVisaCount, newParentTicketCount)}
        userName={userName}
        userEmail={user.email ?? ""}
        userId={user.id}
        logoUrl={logoUrl}
      >
        {children}
      </AdminShell>
    </Suspense>
  );
}
