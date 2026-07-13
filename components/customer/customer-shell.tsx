"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plane,
  LogOut,
  User,
  LayoutDashboard,
  Ticket,
  MessageSquare,
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
import { NotificationsBell } from "@/components/portal/notifications-bell";
import { BrandLogo } from "@/components/brand/brand-logo";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

/** Full nav — drives the desktop sidebar. */
const NAV: NavItem[] = [
  { label: "Dashboard", href: "/customer", icon: LayoutDashboard, exact: true },
  { label: "Book a Flight", href: "/customer/book", icon: Plane },
  { label: "My Orders", href: "/customer/orders", icon: Ticket },
  { label: "Messages", href: "/customer/messages", icon: MessageSquare },
  { label: "Support", href: "/customer/support", icon: LifeBuoy },
  { label: "Profile", href: "/customer/profile", icon: User },
];

/**
 * Mobile bottom tab bar items. Five is the app-standard max; "Book" sits in the
 * centre as an elevated primary action (the portal's key CTA). Profile + sign
 * out live in the top-bar avatar menu, so they're intentionally omitted here.
 */
const TABS = {
  left: [
    { label: "Home", href: "/customer", icon: LayoutDashboard, exact: true },
    { label: "Orders", href: "/customer/orders", icon: Ticket },
  ],
  center: { label: "Book", href: "/customer/book", icon: Plane },
  right: [
    { label: "Messages", href: "/customer/messages", icon: MessageSquare },
    { label: "Support", href: "/customer/support", icon: LifeBuoy },
  ],
} as const;

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return pathname === href || (!exact && pathname.startsWith(href + "/"));
}

/** Navy desktop sidebar (md+). */
function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      {/* Brand */}
      <Link href="/customer" className="flex h-16 flex-col justify-center px-6">
        <BrandLogo variant="white" className="h-7 w-auto" priority />
        <p className="mt-1 text-[11px] font-medium text-sidebar-foreground/70">
          Travel Portal
        </p>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40",
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-orange/30"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
              )}
            >
              <Icon className="size-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-foreground/10 px-3 py-3">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <LogOut className="size-[18px]" />
            Sign out
          </button>
        </form>
      </div>
      <div className="px-6 py-4 text-[11px] text-sidebar-foreground/60">
        © 2026 Wicket Travel
      </div>
    </aside>
  );
}

/** Fixed mobile bottom tab bar with an elevated centre CTA. */
function MobileTabBar({ pathname }: { pathname: string }) {
  function Tab({
    href,
    label,
    icon: Icon,
    exact,
  }: {
    href: string;
    label: string;
    icon: LucideIcon;
    exact?: boolean;
  }) {
    const active = isActive(pathname, href, exact);
    return (
      <Link
        href={href}
        className={cn(
          "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
          active ? "text-orange" : "text-muted-foreground"
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className={cn("size-[22px]", active && "fill-orange/10")} />
        {label}
      </Link>
    );
  }

  const bookActive = isActive(pathname, TABS.center.href);
  const CenterIcon = TABS.center.icon;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around gap-1 px-2 pt-1">
        {TABS.left.map((t) => (
          <Tab key={t.href} {...t} />
        ))}

        {/* Elevated centre CTA */}
        <div className="flex flex-1 justify-center">
          <Link
            href={TABS.center.href}
            aria-label={TABS.center.label}
            aria-current={bookActive ? "page" : undefined}
            className={cn(
              "-mt-6 flex size-14 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-orange/40 outline-none ring-4 ring-white transition-transform active:scale-95 focus-visible:ring-primary/50"
            )}
          >
            <CenterIcon className="size-6 -rotate-45" />
          </Link>
        </div>

        {TABS.right.map((t) => (
          <Tab key={t.href} {...t} />
        ))}
      </div>
    </nav>
  );
}

export function CustomerShell({
  userName,
  userId,
  children,
}: {
  userName: string;
  userId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-background">
      <DesktopSidebar pathname={pathname} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-white/85 px-5 backdrop-blur md:px-8">
          {/* Mobile brand (sidebar is hidden below md) */}
          <Link href="/customer" className="flex items-center md:hidden">
            <BrandLogo className="h-7 w-auto" priority />
          </Link>
          {/* Desktop spacer keeps the account cluster right-aligned */}
          <div className="hidden md:block" />

          <div className="flex items-center gap-1">
            <NotificationsBell userId={userId} portal="customer" />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-primary/30">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-chip text-sm font-semibold text-brand-dark">
                    {initialsOf(userName)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium text-foreground sm:block">
                  {userName}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{userName}</span>
                  <span className="block text-xs text-muted-foreground">Customer</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  render={<Link href="/customer/profile" />}
                >
                  <User className="size-4" />
                  Profile
                </DropdownMenuItem>
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

        {/* Content — extra bottom padding on mobile clears the fixed tab bar */}
        <main className="flex-1 px-5 py-7 pb-28 md:px-8 md:py-9 md:pb-9">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <MobileTabBar pathname={pathname} />
    </div>
  );
}
