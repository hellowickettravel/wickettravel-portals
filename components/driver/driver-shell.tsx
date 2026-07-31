"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  ListChecks,
  Wallet,
  MessageSquare,
  User,
  LogOut,
  Star,
  type LucideIcon,
} from "lucide-react";
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
import { BrandLogo } from "@/components/brand/brand-logo";
import { OnlineToggle } from "@/components/driver/online-toggle";
import { DRIVER } from "@/lib/driver/mock";

type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean };

/** Desktop sidebar nav (full set). */
const NAV: NavItem[] = [
  { label: "Home", href: "/driver", icon: LayoutDashboard, exact: true },
  { label: "Job Board", href: "/driver/jobs", icon: Car },
  { label: "My Rides", href: "/driver/rides", icon: ListChecks },
  { label: "Earnings", href: "/driver/earnings", icon: Wallet },
  { label: "Messages", href: "/driver/messages", icon: MessageSquare },
  { label: "Profile", href: "/driver/profile", icon: User },
];

/** Mobile bottom tabs — five is the app-standard max. */
const TABS: NavItem[] = [
  { label: "Home", href: "/driver", icon: LayoutDashboard, exact: true },
  { label: "Jobs", href: "/driver/jobs", icon: Car },
  { label: "Rides", href: "/driver/rides", icon: ListChecks },
  { label: "Earnings", href: "/driver/earnings", icon: Wallet },
  { label: "Profile", href: "/driver/profile", icon: User },
];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return pathname === href || (!exact && pathname.startsWith(href + "/"));
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <Link href="/driver" className="flex h-16 flex-col justify-center px-6">
        <BrandLogo variant="white" className="h-7 w-auto" priority />
        <p className="mt-1 text-[11px] font-medium text-sidebar-foreground/70">
          Driver Partner
        </p>
      </Link>

      {/* Driver card */}
      <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-inset ring-white/10">
        <Avatar className="size-10">
          <AvatarFallback className="bg-coral-deep text-sm font-semibold text-white">
            {initialsOf(DRIVER.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-white">{DRIVER.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-sidebar-foreground/70">
            <Star className="size-3 fill-coral-deep text-coral-deep" />
            {DRIVER.rating} · {DRIVER.vehicle.type}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
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
                  ? "bg-primary text-primary-foreground shadow-sm shadow-coral-deep/30"
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
        <Link
          href="/driver/login"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <LogOut className="size-[18px]" />
          Sign out
        </Link>
      </div>
      <div className="px-6 py-4 text-[11px] text-sidebar-foreground/60">
        © 2026 Wicket Travel
      </div>
    </aside>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around gap-0.5 px-1.5 pt-1">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href, t.exact);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
                active ? "text-coral-press" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg transition-colors",
                  active && "bg-coral-deep/10"
                )}
              >
                <Icon className="size-[20px]" />
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DriverShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-background">
      <DesktopSidebar pathname={pathname} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-white/90 px-4 backdrop-blur sm:px-6">
          {/* Mobile brand */}
          <Link href="/driver" className="flex items-center lg:hidden">
            <BrandLogo className="h-6 w-auto" priority />
          </Link>
          {/* Desktop spacer */}
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2 sm:gap-3">
            <OnlineToggle />

            <Link
              href="/driver/messages"
              aria-label="Messages"
              className="relative flex size-10 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <MessageSquare className="size-[18px]" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-coral-deep ring-2 ring-white" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-primary/30 sm:pr-2">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-sky-tint text-sm font-semibold text-ocean-deep">
                    {initialsOf(DRIVER.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium text-foreground sm:block">
                  {DRIVER.name.split(" ")[0]}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{DRIVER.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {DRIVER.vehicle.makeModel} · {DRIVER.vehicle.plate}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" render={<Link href="/driver/profile" />}>
                  <User className="size-4" />
                  Profile & vehicle
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" render={<Link href="/driver/messages" />}>
                  <MessageSquare className="size-4" />
                  Messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  render={<Link href="/driver/login" />}
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content — bottom padding clears the fixed tab bar on mobile */}
        <main className="flex-1 px-4 py-5 pb-28 sm:px-6 sm:py-7 lg:pb-9">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
      </div>

      <MobileTabBar pathname={pathname} />
    </div>
  );
}
