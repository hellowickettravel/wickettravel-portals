"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane, LogOut, User } from "lucide-react";
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

const NAV = [
  { label: "Dashboard", href: "/customer", exact: true },
  { label: "Book a Flight", href: "/customer/book" },
  { label: "My Orders", href: "/customer/orders" },
  { label: "Messages", href: "/customer/messages" },
  { label: "Support", href: "/customer/support" },
  { label: "Profile", href: "/customer/profile" },
];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={className}>
      {NAV.map((item) => {
        const active =
          pathname === item.href ||
          (!item.exact && pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-orange/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function CustomerNav({
  userName,
  userId,
}: {
  userName: string;
  userId: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        {/* Logo */}
        <Link href="/customer" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Plane className="size-5 -rotate-45" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-navy">
            Wicket
          </span>
        </Link>

        {/* Desktop nav */}
        <NavLinks className="hidden items-center gap-1 md:flex" />

        {/* Notifications + user menu */}
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
      </div>

      {/* Mobile nav row + pinned Sign out.
          The avatar menu can be hard to find on a phone, so we surface a
          plain form+button sign-out here (same reliable pattern the
          admin/employee sidebar uses) pinned right so it never scrolls away. */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2 md:hidden">
        <NavLinks className="flex flex-1 items-center gap-1 overflow-x-auto" />
        <form action={signOut} className="shrink-0">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/15"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
