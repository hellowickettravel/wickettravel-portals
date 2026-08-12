import { getBrandLogoUrl } from "@/lib/db/branding";
import {
  AdminShell,
  type AdminNavSection,
  type MobileTab,
} from "@/components/admin/admin-shell";

/**
 * The Parents Tickets helper portal's chrome.
 *
 * A helper is a SERVICE PROVIDER, not a customer: they never book a flight,
 * never place an order, and have no use for a booking wizard. Giving them the
 * customer portal put three sections in front of them they would never open,
 * and filed them in the business's own Customers list — so they get their own
 * portal, their own role, and a nav with only the four things they do.
 *
 * It is the same shell the other four portals render — one design system for
 * the whole product — configured for someone who is offering the service
 * rather than buying it. Phone-first like the customer portal, because a
 * helper is a traveller and will be looking at this in an airport.
 */

const NAV: AdminNavSection[] = [
  {
    items: [
      {
        label: "My trips",
        href: "/helper",
        icon: "board",
        exact: true,
        emphasize: true,
      },
    ],
  },
  {
    heading: "Helping",
    items: [
      { label: "Post a trip", href: "/helper/new", icon: "book" },
      { label: "Get verified", href: "/helper/verify", icon: "shield" },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Support", href: "/helper/support", icon: "support" },
      { label: "Profile", href: "/helper/profile", icon: "profile" },
    ],
  },
];

const TABS: MobileTab[] = [
  { label: "Trips", href: "/helper", icon: "board", exact: true },
  { label: "Verify", href: "/helper/verify", icon: "shield" },
  { label: "Post", href: "/helper/new", icon: "book", primary: true },
  { label: "Support", href: "/helper/support", icon: "support" },
  { label: "Profile", href: "/helper/profile", icon: "profile" },
];

export async function HelperPortalShell({
  userId,
  userName,
  userEmail,
  avatarUrl,
  children,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  /** The signed-in person's own picture. Never the company logo. */
  avatarUrl?: string | null;
  children: React.ReactNode;
}) {
  const logoUrl = await getBrandLogoUrl();

  return (
    <AdminShell
      sections={NAV}
      userName={userName}
      userEmail={userEmail}
      userId={userId}
      logoUrl={logoUrl}
      avatarUrl={avatarUrl}
      roleLabel="Helper"
      homeHref="/helper"
      settingsHref="/helper/profile"
      settingsLabel="Profile"
      supportHref="/helper/support"
      // Nothing here is long enough to search yet — one person's own trips fit
      // on a screen. The top bar simply doesn't render a search field.
      searchScreens={[]}
      mobileTabs={TABS}
    >
      {children}
    </AdminShell>
  );
}
