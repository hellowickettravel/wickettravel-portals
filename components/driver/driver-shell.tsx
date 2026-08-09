"use client";

import { Suspense } from "react";
import {
  AdminShell,
  type AdminNavSection,
  type MobileTab,
} from "@/components/admin/admin-shell";
import { OnlineToggle } from "@/components/driver/online-toggle";
import { DRIVER } from "@/lib/driver/mock";

/**
 * The Driver Partner portal's chrome — the same shell /admin, /employee and
 * /customer render, configured for someone working from the driver's seat.
 *
 * Like the customer portal it is phone-first, so below 1024px the rail is
 * replaced by a bottom tab bar. What is unique here is the availability switch
 * in the top bar: going on and offline is the driver's most frequent action and
 * has to be one tap from every screen, so it sits in the chrome rather than on
 * a page.
 *
 * There is no auth behind this portal yet (`lib/driver/store` is a mock), which
 * is why the bell is off and Sign out is a link to the driver login rather than
 * the signOut action.
 */

const NAV: AdminNavSection[] = [
  {
    items: [
      {
        label: "Home",
        href: "/driver",
        icon: "dashboard",
        exact: true,
        emphasize: true,
      },
    ],
  },
  {
    heading: "Driving",
    items: [
      { label: "Job board", href: "/driver/jobs", icon: "car" },
      { label: "My rides", href: "/driver/rides", icon: "rides" },
      { label: "Messages", href: "/driver/messages", icon: "messages" },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Earnings", href: "/driver/earnings", icon: "earnings" },
      { label: "Profile", href: "/driver/profile", icon: "profile" },
    ],
  },
];

const TABS: MobileTab[] = [
  { label: "Home", href: "/driver", icon: "dashboard", exact: true },
  { label: "Rides", href: "/driver/rides", icon: "rides" },
  { label: "Jobs", href: "/driver/jobs", icon: "car", primary: true },
  { label: "Earnings", href: "/driver/earnings", icon: "earnings" },
  { label: "Profile", href: "/driver/profile", icon: "profile" },
];

export function DriverShell({
  children,
  jobCount,
}: {
  children: React.ReactNode;
  /** Live count of rides on the board — the driver's one warm figure. */
  jobCount?: number;
}) {
  const sections: AdminNavSection[] = NAV.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.href === "/driver/jobs" ? { ...item, count: jobCount } : item
    ),
  }));

  // AdminShell reads useSearchParams (the per-screen search hand-off). The
  // other three portals sit behind an auth layout that already opts them out
  // of prerendering; the driver portal has no auth yet, so its pages are
  // statically generated and need the boundary here to bail out to the client.
  return (
    <Suspense>
      <AdminShell
        sections={sections}
        userName={DRIVER.name}
        userEmail={DRIVER.email}
        userId=""
        roleLabel="Driver partner"
        homeHref="/driver"
        settingsHref="/driver/profile"
        settingsLabel="Profile & vehicle"
        supportHref="/driver/messages"
        searchScreens={[]}
        mobileTabs={TABS}
        topBarExtra={<OnlineToggle />}
        showBell={false}
        signOutHref="/driver/login"
      >
        {children}
      </AdminShell>
    </Suspense>
  );
}
