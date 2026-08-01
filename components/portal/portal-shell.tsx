"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationsBell } from "@/components/portal/notifications-bell";
import { ThemeToggle } from "@/components/portal/theme-toggle";
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
  /** Optional count (e.g. new visa enquiries); hidden when 0/undefined. */
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

const COLLAPSE_KEY = "wt-rail-collapsed";

/**
 * The rail's collapsed state lives in localStorage, which is an external
 * store — so it is read with `useSyncExternalStore` rather than an effect.
 *
 * That matters for more than lint tidiness: an effect renders the expanded
 * rail first and then immediately re-renders collapsed, so anyone who
 * chose the icon rail sees it flash open on every navigation. The server
 * snapshot is `false`, because the server genuinely cannot know, and the
 * client corrects it during hydration rather than after it.
 */
const railStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    railStore.listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      railStore.listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  },
  // Returns a primitive, so React can compare snapshots by value.
  getSnapshot() {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  },
  getServerSnapshot() {
    return false;
  },
  toggle() {
    const next = !railStore.getSnapshot();
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      // Blocked storage — the toggle still works for this session, it just
      // will not be remembered. Not worth failing over.
    }
    railStore.listeners.forEach((l) => l());
  },
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

/* ══════════════════════════════════════════════════════════════════
   RAIL — 240px of solid marine.

   Rows are 40px on 2px gaps under a real section label. The active row
   is a 3px coral edge bar plus a soft white wash — not a filled pill.
   That keeps the one *solid* coral on the screen reserved for the
   primary action, so navigation never competes with the thing you are
   meant to click.

   Collapses to a 56px icon rail; the choice is remembered per device.
   ══════════════════════════════════════════════════════════════════ */

function NavRow({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center rounded-control text-[13.5px] outline-none transition-colors duration-150 ease-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rail-accent [&_svg]:size-[18px] [&_svg]:shrink-0",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "bg-white/[0.11] font-semibold text-tx-rail"
          : "font-medium text-tx-rail-dim hover:bg-white/[0.06] hover:text-tx-rail"
      )}
    >
      {/* The 3px coral edge. Sits inside the row's radius, hence the inset
          and its own rounding. */}
      {active ? (
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-rail-accent"
        />
      ) : null}
      <Icon />
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.badge ? (
            <span className="tabular inline-flex min-w-[20px] items-center justify-center rounded-chip bg-white/15 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-tx-rail">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          ) : null}
        </>
      )}
      {/* Collapsed, the count has nowhere to go, so it becomes a dot. */}
      {collapsed && item.badge ? (
        <span
          aria-hidden
          className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-rail-accent"
        />
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  // Collapsed, the label is the only thing identifying the row, so it has to
  // be reachable — by pointer and by keyboard focus.
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
        {item.badge ? ` · ${item.badge}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

function NavLinks({
  navItems,
  pathname,
  collapsed,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav
      className={cn(
        "no-bar flex-1 overflow-y-auto py-4",
        collapsed ? "px-2" : "px-3"
      )}
    >
      {groupNav(navItems).map((group, i) => (
        <div key={group.label ?? `group-${i}`} className={cn(i > 0 && "mt-5")}>
          {group.label ? (
            collapsed ? (
              // A label cannot survive a 56px rail, so the group becomes a
              // hairline instead — the grouping is kept, the words are not.
              i > 0 ? (
                <div aria-hidden className="mx-2 mb-3 border-t border-white/10" />
              ) : null
            ) : (
              <p className="px-3 pb-2 font-micro text-tx-rail-dim/85">
                {group.label}
              </p>
            )
          ) : null}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                active={isActive(pathname, item)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand({
  portalLabel,
  logoUrl,
  collapsed,
  onToggle,
}: {
  portalLabel: string;
  logoUrl?: string | null;
  collapsed: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-white/10",
        collapsed ? "justify-center px-2" : "gap-2.5 px-4"
      )}
    >
      {logoUrl ? (
        <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-icon bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" className="size-full object-cover" />
        </span>
      ) : (
        <Monogram tone="light" />
      )}
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[14px] font-semibold text-tx-rail">
              Wicket Travel
            </span>
            <span className="mt-0.5 block truncate text-[11px] leading-none text-tx-rail-dim">
              {portalLabel}
            </span>
          </span>
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="hidden size-7 shrink-0 cursor-pointer items-center justify-center rounded-chip text-tx-rail-dim outline-none transition-colors duration-150 ease-brand hover:bg-white/10 hover:text-tx-rail focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rail-accent md:inline-flex"
            >
              <PanelLeftClose className="size-[17px]" />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Pinned sign-out, behind the hairline at the foot of the rail. */
function SidebarFoot({
  collapsed,
  onExpand,
  onNavigate,
}: {
  collapsed: boolean;
  onExpand?: () => void;
  onNavigate?: () => void;
}) {
  const rowClass = cn(
    "flex h-10 w-full cursor-pointer items-center rounded-control text-[13.5px] font-medium text-tx-rail-dim outline-none transition-colors duration-150 ease-brand hover:bg-white/[0.06] hover:text-tx-rail focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rail-accent [&_svg]:size-[18px] [&_svg]:shrink-0",
    collapsed ? "justify-center px-0" : "gap-3 px-3"
  );

  return (
    <div
      className={cn(
        "mt-auto shrink-0 space-y-0.5 border-t border-white/10 py-3",
        collapsed ? "px-2" : "px-3"
      )}
    >
      {collapsed && onExpand ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onExpand}
                aria-label="Expand sidebar"
                className={rowClass}
              >
                <PanelLeftOpen />
              </button>
            }
          />
          <TooltipContent side="right" sideOffset={8}>
            Expand sidebar
          </TooltipContent>
        </Tooltip>
      ) : null}

      <form action={signOut}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="submit"
                  onClick={onNavigate}
                  aria-label="Sign out"
                  className={rowClass}
                >
                  <LogOut />
                </button>
              }
            />
            <TooltipContent side="right" sideOffset={8}>
              Sign out
            </TooltipContent>
          </Tooltip>
        ) : (
          <button type="submit" onClick={onNavigate} className={rowClass}>
            <LogOut />
            Sign out
          </button>
        )}
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
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  portalLabel: string;
  logoUrl?: string | null;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-rail">
      <SidebarBrand
        portalLabel={portalLabel}
        logoUrl={logoUrl}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      <NavLinks
        navItems={navItems}
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
      <SidebarFoot
        collapsed={collapsed}
        onExpand={onToggle}
        onNavigate={onNavigate}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TOPBAR — 56px, white, sticky, one hairline underneath. No brand
   colour up here; the rail owns it. The page's own name lives in
   <PageHeader> below, so nothing is stated twice.
   ══════════════════════════════════════════════════════════════════ */

const topbarControl =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-icon text-tx-muted outline-none transition-colors duration-150 ease-brand hover:bg-sunk hover:text-tx-head focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Global search. Submits to the portal's orders list as `?q=`, which that
 * screen reads on mount — this is a real search, not a decorative field.
 */
function TopbarSearch({ portal }: { portal: "admin" | "employee" }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (!q) return;
        router.push(`/${portal}/orders?q=${encodeURIComponent(q)}`);
      }}
      className="relative hidden min-w-0 flex-1 sm:block sm:max-w-[320px]"
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-[15px] -translate-y-1/2 text-tx-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search orders…"
        aria-label="Search orders"
        className="h-9 w-full rounded-control border border-field-border bg-field pr-3 pl-[34px] text-[13.5px] text-tx-head outline-none transition-colors duration-150 ease-brand placeholder:text-tx-muted hover:border-line-hover focus-visible:border-marine focus-visible:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/25 [&::-webkit-search-cancel-button]:hidden"
      />
    </form>
  );
}

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
  const collapsed = useSyncExternalStore(
    railStore.subscribe,
    railStore.getSnapshot,
    railStore.getServerSnapshot
  );
  const toggleCollapsed = railStore.toggle;

  // Only admin + employee portals mount this shell; pick the one this is.
  const portal: "admin" | "employee" = navItems[0]?.href.startsWith("/employee")
    ? "employee"
    : "admin";
  // Only offer Help when this user can actually open the support screen — an
  // employee without that section never sees the link.
  const helpHref = navItems.find((i) => i.href.endsWith("/support"))?.href;

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* A dozen nav rows plus the topbar controls sit before the content in
          tab order. This is the way past them. */}
      <a
        href="#portal-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:h-9 focus:items-center focus:rounded-control focus:bg-coral focus:px-3.5 focus:text-[13.5px] focus:font-semibold focus:text-tx-invert focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to content
      </a>

      {/* ---------- Desktop rail ---------- */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 ease-brand md:block",
          collapsed ? "w-14" : "w-60"
        )}
      >
        <SidebarRail
          navItems={navItems}
          pathname={pathname}
          portalLabel={portalLabel}
          logoUrl={logoUrl}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
        />
      </aside>

      {/* ---------- Main column ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-surface">
          <div className="flex h-14 items-center gap-2 px-4 lg:px-6">
            {/* Mobile: hamburger → slide-over. The rail is never collapsed
                here; on a phone it is a drawer, and a drawer of icons is
                worse than no drawer. */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                aria-label="Open navigation menu"
                className={cn(topbarControl, "-ml-2 size-11 sm:size-9 md:hidden")}
              >
                <Menu className="size-[18px]" />
              </SheetTrigger>
              <SheetContent
                side="left"
                showCloseButton={false}
                /* The variant-scoped width has to be beaten on its own terms —
                   <SheetContent> ships `data-[side=left]:w-3/4`. */
                className="gap-0 border-r-0 p-0 data-[side=left]:w-60 data-[side=left]:max-w-[86vw]"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SheetClose
                  aria-label="Close navigation menu"
                  className="absolute top-2.5 right-2.5 z-10 inline-flex size-9 items-center justify-center rounded-icon text-tx-rail-dim outline-none transition-colors duration-150 ease-brand hover:bg-white/10 hover:text-tx-rail focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rail-accent"
                >
                  <X className="size-[18px]" />
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

            <TopbarSearch portal={portal} />

            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              <ThemeToggle />

              <NotificationsBell userId={userId} portal={portal} />

              {helpHref ? (
                <Link
                  href={helpHref}
                  aria-label="Help and support"
                  className={cn(topbarControl, "hidden sm:inline-flex")}
                >
                  <LifeBuoy className="size-[18px]" />
                </Link>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger className="ml-1 flex h-9 items-center gap-2 rounded-icon pr-1.5 pl-1 outline-none transition-colors duration-150 ease-brand hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  {/* The avatar is the one circle in the system. */}
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-marine-chip text-[11px] font-semibold text-marine-ink">
                      {initialsOf(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[140px] truncate text-[13px] font-semibold text-tx-head lg:block">
                    {userName}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <span className="block text-[13.5px] font-semibold text-tx-head">
                      {userName}
                    </span>
                    <span className="block text-[12.5px] text-tx-muted">
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
          className="flex-1 px-4 py-6 outline-none lg:px-6 lg:py-8"
        >
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
