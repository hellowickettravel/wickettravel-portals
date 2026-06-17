"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plane,
  LogOut,
  Menu,
  LayoutDashboard,
  Users,
  ShoppingBag,
  MessageSquare,
  BarChart3,
  Settings,
  LifeBuoy,
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
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NotificationsBell } from "@/components/portal/notifications-bell";

/**
 * Icon registry. Layouts (Server Components) pass icon NAMES as strings so we
 * never hand non-serializable component references across the server/client
 * boundary; the client resolves the name to a component here.
 */
const ICONS = {
  LayoutDashboard,
  Users,
  ShoppingBag,
  MessageSquare,
  BarChart3,
  Settings,
  LifeBuoy,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Only active on an exact path match (used for the dashboard index). */
  exact?: boolean;
};

type PortalShellProps = {
  navItems: NavItem[];
  portalLabel: string;
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Shared nav link list, used by both the desktop sidebar and the mobile sheet. */
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
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const active =
          pathname === item.href ||
          (!item.exact && pathname.startsWith(item.href + "/"));
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
            )}
          >
            <Icon className="size-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand({ portalLabel }: { portalLabel: string }) {
  return (
    <div className="flex h-16 items-center gap-2.5 px-6">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Plane className="size-5 -rotate-45" />
      </div>
      <div className="leading-tight">
        <p className="font-heading text-base font-semibold text-white">Wicket</p>
        <p className="text-[11px] font-medium text-sidebar-foreground/70">
          {portalLabel}
        </p>
      </div>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="px-6 py-4 text-[11px] text-sidebar-foreground/60">
      © 2026 Wicket · Powered by{" "}
      <a
        href="https://www.getgrowthnexus.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-sidebar-foreground/80 underline-offset-2 transition-colors hover:text-white hover:underline"
      >
        Growth Nexus
      </a>
    </div>
  );
}

export function PortalShell({
  navItems,
  portalLabel,
  userName,
  roleLabel,
  children,
}: PortalShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <SidebarBrand portalLabel={portalLabel} />
        <NavLinks navItems={navItems} pathname={pathname} />
        <SidebarFooter />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-surface px-5 md:px-8">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger → nav sheet */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                aria-label="Open navigation menu"
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-brand/25 md:hidden"
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent
                side="left"
                showCloseButton={false}
                className="flex w-[280px] flex-col gap-0 bg-sidebar text-sidebar-foreground"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarBrand portalLabel={portalLabel} />
                <NavLinks
                  navItems={navItems}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
                <div className="px-3 pb-4">
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-white"
                    >
                      <LogOut className="size-[18px]" />
                      Sign out
                    </button>
                  </form>
                </div>
                <SidebarFooter />
              </SheetContent>
            </Sheet>

            <span className="font-heading text-sm font-semibold text-navy md:hidden">
              Wicket
            </span>
          </div>

          <div className="flex items-center gap-1">
            <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-brand/25">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-chip text-sm font-semibold text-brand-dark">
                    {initialsOf(userName)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-medium text-foreground">
                    {userName}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {roleLabel}
                  </span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{userName}</span>
                  <span className="block text-xs text-muted-foreground">
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
        </header>

        {/* Content */}
        <main className="flex-1 px-5 py-7 md:px-8 md:py-9">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
