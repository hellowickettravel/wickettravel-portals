import { getBrandLogoUrl } from "@/lib/db/branding";
import { getCustomerNavCounts } from "@/lib/db/customer-portal";
import {
  AdminShell,
  type AdminNavSection,
  type MobileTab,
  type SearchScreen,
} from "@/components/admin/admin-shell";

/**
 * The customer portal's chrome. It is the same shell the admin and employee
 * portals render — one design system for the whole product — configured for a
 * traveller rather than a member of staff:
 *
 * - the eleven staff areas become six, grouped Dashboard / My travel / Account
 * - below 1024px the off-canvas rail is replaced by a bottom tab bar, because
 *   customers reach this portal from a phone far more often than staff do
 * - "Book a flight" is the one ember action, in the rail and on the tab bar
 *
 * Both the private customer layout and the public /customer/book layout render
 * this, so a signed-in traveller sees identical chrome either side of the
 * booking wizard.
 */

const NAV: AdminNavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/customer",
        icon: "dashboard",
        exact: true,
        emphasize: true,
      },
    ],
  },
  {
    heading: "My travel",
    items: [
      { label: "Book a flight", href: "/customer/book", icon: "book" },
      { label: "My orders", href: "/customer/orders", icon: "orders" },
      { label: "Messages", href: "/customer/messages", icon: "messages" },
    ],
  },
  {
    heading: "Parents Tickets",
    items: [
      { label: "My listings", href: "/customer/parents", icon: "board", exact: true },
      { label: "Get verified", href: "/customer/parents/verify", icon: "shield" },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Support", href: "/customer/support", icon: "support" },
      { label: "Profile", href: "/customer/profile", icon: "profile" },
    ],
  },
];

/**
 * Five thumb-reachable destinations with the booking CTA elevated in the
 * centre. Profile sits in the account menu and Notifications on the bell, so
 * everything the rail lists is still reachable without it.
 */
const TABS: MobileTab[] = [
  { label: "Home", href: "/customer", icon: "dashboard", exact: true },
  { label: "Orders", href: "/customer/orders", icon: "orders" },
  { label: "Book", href: "/customer/book", icon: "book", primary: true },
  { label: "Messages", href: "/customer/messages", icon: "messages" },
  { label: "Support", href: "/customer/support", icon: "support" },
];

/** The customer only has one list worth searching. */
const SEARCH: SearchScreen[] = [
  {
    prefix: "/customer/orders",
    exact: true,
    placeholder: "Search my orders",
    label: "Search my orders",
  },
];

export async function CustomerPortalShell({
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
  const [counts, logoUrl] = await Promise.all([
    getCustomerNavCounts(userId).catch(() => ({ orders: 0, messages: 0 })),
    getBrandLogoUrl(),
  ]);

  const sections: AdminNavSection[] = NAV.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      count:
        item.href === "/customer/orders"
          ? counts.orders
          : item.href === "/customer/messages"
            ? counts.messages
            : undefined,
    })),
  }));

  return (
    <AdminShell
      sections={sections}
      userName={userName}
      userEmail={userEmail}
      userId={userId}
      logoUrl={logoUrl}
      avatarUrl={avatarUrl}
      roleLabel="Traveller"
      homeHref="/customer"
      settingsHref="/customer/profile"
      settingsLabel="Profile"
      supportHref="/customer/support"
      searchScreens={SEARCH}
      mobileTabs={TABS}
    >
      {children}
    </AdminShell>
  );
}
