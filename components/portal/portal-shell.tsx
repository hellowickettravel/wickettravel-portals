"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
  LifeBuoy,
  LayoutDashboard,
  Users,
  Contact,
  ShoppingBag,
  Receipt,
  MessageSquare,
  BarChart3,
  Settings,
  Stamp,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NotificationsBell } from "@/components/portal/notifications-bell";
import { Monogram } from "@/components/brand/monogram";

/**
 * Icon registry. Layouts (Server Components) pass icon NAMES as strings so we
 * never hand non-serializable component references across the server/client
 * boundary; the client resolves the name to a component here.
 */
const ICONS = {
  LayoutDashboard,
  Users,
  Contact,
  ShoppingBag,
  Receipt,
  MessageSquare,
  BarChart3,
  Settings,
  LifeBuoy,
  Stamp,
  HeartHandshake,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Only active on an exact path match (used for the dashboard index). */
  exact?: boolean;
  /** Optional count pill (e.g. new visa enquiries); hidden when 0/undefined. */
  badge?: number;
  /**
   * Section this item belongs to. Consecutive items sharing a group sit under
   * one header; items with no group sit at the top with no header at all.
   */
  group?: string;
};

type PortalShellProps = {
  navItems: NavItem[];
  /** Micro-label under the brand name — "Admin portal", "Employee portal". */
  portalLabel: string;
  userName: string;
  roleLabel: string;
  /** Current user id — powers the realtime notifications bell. */
  userId: string;
  /** Optional business logo URL; falls back to the WT monogram when unset. */
  logoUrl?: string | null;
  children: React.ReactNode;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isActive(pathname: string, item: NavItem) {
  return (
    pathname === item.href ||
    (!item.exact && pathname.startsWith(item.href + "/"))
  );
}

/** Consecutive items with the same `group` become one titled block. */
function groupNav(navItems: NavItem[]) {
  const groups: { label?: string; items: NavItem[] }[] = [];
  for (const item of navItems) {
    const last = groups[groups.length - 1];
    if (last && last.label === item.group) last.items.push(item);
    else groups.push({ label: item.group, items: [item] });
  }
  return groups;
}

/**
 * The page name shown in the topbar. Nav already names every section, so a
 * screen never has to announce itself: the longest matching href wins, which
 * keeps /admin/orders/7343490 under "Orders". Anything off the nav —
 * /admin/notifications, say — falls back to its own last path segment.
 */
function pageTitleFor(pathname: string, navItems: NavItem[], fallback: string) {
  let best: NavItem | undefined;
  for (const item of navItems) {
    if (!isActive(pathname, item)) continue;
    if (!best || item.href.length > best.href.length) best = item;
  }
  if (best) return best.label;

  const segment = pathname.split("/").filter(Boolean).pop();
  if (!segment) return fallback;
  return segment.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/* ══════════════════════════════════════════════════════════════════
   SIDEBAR — 280px of deep ocean ink.

   The v2 rail packed 44px rows onto 4px gaps under a 9px label, which
   is what made it read as a wall of text rather than a set of choices.
   The rhythm here is deliberately looser: 48px rows on 6px gaps, 28px
   between groups, and a label big enough to actually function as one.
   Nothing was removed — it just breathes.
   ══════════════════════════════════════════════════════════════════ */

function NavLinks({
  navItems,
  pathname,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="no-bar flex-1 overflow-y-auto px-4 pt-6 pb-6">
      {groupNav(navItems).map((group, i) => (
        <div key={group.label ?? `group-${i}`} className={cn(i > 0 && "mt-7")}>
          {group.label ? (
            <p className="px-3.5 pb-3 font-mono text-[10px] leading-none font-medium tracking-[0.15em] text-white/45 uppercase">
              {group.label}
            </p>
          ) : null}
          <div className="space-y-1.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-12 items-center gap-3.5 rounded-control px-3.5 text-[14.5px] outline-none transition-colors duration-150 ease-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-vivid [&_svg]:size-[19px] [&_svg]:shrink-0",
                    active
                      ? "bg-surface font-bold text-ocean-deep [&_svg]:text-flame"
                      : "font-medium text-white/80 hover:bg-white/[0.09] hover:text-white"
                  )}
                >
                  <Icon />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span
                      className={cn(
                        "tabular inline-flex min-w-[22px] items-center justify-center rounded-chip px-1.5 py-0.5 text-[11px] leading-none font-bold",
                        active
                          ? "bg-flame text-tx-invert"
                          : "bg-white/16 text-white"
                      )}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand({
  portalLabel,
  logoUrl,
}: {
  portalLabel: string;
  logoUrl?: string | null;
}) {
  return (
    /* The hairline gives the rail a head, so the first nav group starts
       against something instead of floating near the logo. */
    <div className="flex items-center gap-3.5 border-b border-white/10 px-5 pt-6 pb-6">
      {logoUrl ? (
        <span className="inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-icon bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" className="size-full object-cover" />
        </span>
      ) : (
        <Monogram tone="light" />
      )}
      <span className="min-w-0 leading-tight">
        <span className="font-display block truncate text-[19px] font-semibold text-white">
          Wicket Travel
        </span>
        <span className="mt-1 block font-mono text-[9.5px] leading-none font-medium tracking-[0.15em] text-white/55 uppercase">
          {portalLabel}
        </span>
      </span>
    </div>
  );
}

/** Pinned sign-out, behind the hairline at the foot of the rail. */
function SidebarSignOut({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="mt-auto border-t border-white/10 px-4 py-4">
      <form action={signOut}>
        <button
          type="submit"
          onClick={onNavigate}
          className="flex h-12 w-full cursor-pointer items-center gap-3.5 rounded-control px-3.5 text-[14.5px] font-medium text-white/80 outline-none transition-colors duration-150 ease-brand hover:bg-white/[0.09] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-vivid [&_svg]:size-[19px] [&_svg]:shrink-0"
        >
          <LogOut />
          Sign out
        </button>
      </form>
    </div>
  );
}

/** The rail itself — shared by the desktop column and the mobile drawer. */
function SidebarRail({
  navItems,
  pathname,
  portalLabel,
  logoUrl,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  portalLabel: string;
  logoUrl?: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-ocean-ink">
      <SidebarBrand portalLabel={portalLabel} logoUrl={logoUrl} />
      <NavLinks navItems={navItems} pathname={pathname} onNavigate={onNavigate} />
      <SidebarSignOut onNavigate={onNavigate} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TOPBAR — white, sticky, one hairline underneath. No brand colour
   up here; the rail owns it.
   ══════════════════════════════════════════════════════════════════ */

/** Shared skin for the topbar's 46px icon controls. */
const topbarControl =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-icon text-tx-muted outline-none transition-colors duration-150 ease-brand hover:bg-sunk hover:text-tx-head focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

export function PortalShell({
  navItems,
  portalLabel,
  userName,
  roleLabel,
  userId,
  logoUrl,
  children,
}: PortalShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Only admin + employee portals mount this shell; pick the one this is.
  const portal: "admin" | "employee" = navItems[0]?.href.startsWith("/employee")
    ? "employee"
    : "admin";
  const title = pageTitleFor(pathname, navItems, portalLabel);
  // Only offer Help when this user can actually open the support screen — an
  // employee without that section never sees the link.
  const helpHref = navItems.find((i) => i.href.endsWith("/support"))?.href;

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Eleven nav rows plus the topbar controls sit before the content in
          tab order. This is the way past them. */}
      <a
        href="#portal-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:h-11 focus:items-center focus:rounded-control focus:bg-flame focus:px-[18px] focus:text-[15px] focus:font-semibold focus:text-tx-invert focus:outline-2 focus:outline-offset-2 focus:outline-flame"
      >
        Skip to content
      </a>

      {/* ---------- Desktop rail ---------- */}
      <aside className="sticky top-0 hidden h-dvh w-[280px] shrink-0 md:block">
        <SidebarRail
          navItems={navItems}
          pathname={pathname}
          portalLabel={portalLabel}
          logoUrl={logoUrl}
        />
      </aside>

      {/* ---------- Main column ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-surface">
          <div className="flex h-[76px] items-center gap-2 px-6 lg:px-10">
            {/* Mobile: hamburger → slide-in drawer */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                aria-label="Open navigation menu"
                className={cn(topbarControl, "-ml-3 md:hidden")}
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent
                side="left"
                showCloseButton={false}
                /* The variant-scoped width has to be beaten on its own terms —
                   <SheetContent> ships `data-[side=left]:w-3/4`. */
                className="gap-0 border-r-0 p-0 data-[side=left]:w-[280px] data-[side=left]:max-w-[86vw]"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SheetClose
                  aria-label="Close navigation menu"
                  className="absolute top-5 right-3 z-10 inline-flex size-11 items-center justify-center rounded-icon text-white/70 outline-none transition-colors duration-150 ease-brand hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
                >
                  <X className="size-5" />
                </SheetClose>
                <SidebarRail
                  navItems={navItems}
                  pathname={pathname}
                  portalLabel={portalLabel}
                  logoUrl={logoUrl}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            {/*
              Wayfinding, not the page's heading — the screen's own <h1> lives
              in <PageHeader>, where it can carry an eyebrow and a lede. Two
              32px titles twenty pixels apart would just shout twice.
            */}
            {/* Deliberately Manrope, not Fraunces. The screen's real <h1>
                in <PageHeader> is the serif one; if this were too, the two
                would compete twenty pixels apart. */}
            <p className="min-w-0 flex-1 truncate text-[17px] leading-[1.36] font-bold tracking-heading text-tx-head sm:text-[18.5px]">
              {title}
            </p>

            <div className="-mr-2 flex shrink-0 items-center gap-1">
              <NotificationsBell userId={userId} portal={portal} />

              {helpHref ? (
                <Link
                  href={helpHref}
                  aria-label="Help and support"
                  className={cn(topbarControl, "hidden sm:inline-flex")}
                >
                  <LifeBuoy className="size-5" />
                </Link>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-[46px] items-center gap-2.5 rounded-icon pr-2 pl-1 outline-none transition-colors duration-150 ease-brand hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame">
                  {/* The avatar is the one circle in the system. */}
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-sunk text-[13px] font-semibold text-tx-head">
                      {initialsOf(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left leading-tight lg:block">
                    <span className="block text-[14.5px] font-semibold text-tx-head">
                      {userName}
                    </span>
                    <span className="block text-[13px] text-tx-muted">
                      {roleLabel}
                    </span>
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <span className="block text-[14.5px] font-semibold text-tx-head">
                      {userName}
                    </span>
                    <span className="block text-[13px] text-tx-muted">
                      {roleLabel}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <form action={signOut}>
                    <DropdownMenuItem
                      variant="destructive"
                      className="w-full cursor-pointer"
                      render={<button type="submit" />}
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* ---------- Content ---------- */}
        <main
          id="portal-content"
          tabIndex={-1}
          className="flex-1 px-6 py-9 outline-none lg:px-10 lg:py-12"
        >
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
