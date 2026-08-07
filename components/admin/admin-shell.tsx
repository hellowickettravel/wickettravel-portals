"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { AdminBell } from "@/components/admin/admin-bell";
import { shadowE3 } from "@/components/admin/ui";
import {
  LifebuoyIcon,
  MenuIcon,
  NAV_ICONS,
  SearchIcon,
  SignOutIcon,
  type NavIconName,
} from "@/components/admin/icons";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: NavIconName;
  /** Active only on an exact match (the dashboard index). */
  exact?: boolean;
  /** Live unactioned count — rendered as a small ember figure, per the design. */
  count?: number;
};

export type AdminNavSection = { heading?: string; items: AdminNavItem[] };

/**
 * The Admin Portal shell, ported from the Claude Design "Admin Portal All
 * Pages" file: a 260px ink sidebar with grouped nav, and a 64px sticky top bar
 * carrying the platform-wide order search, the notification bell, a support
 * shortcut and the account menu.
 *
 * The design collapses the sidebar off-canvas below 1024px behind a hamburger
 * and a scrim; nothing about the content column changes.
 */
export function AdminShell({
  sections,
  userName,
  userEmail,
  userId,
  logoUrl,
  children,
}: {
  sections: AdminNavSection[];
  userName: string;
  userEmail: string;
  userId: string;
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const acctRef = useRef<HTMLDivElement>(null);

  // Route change closes every transient surface — the design does the same in
  // its own `go()`.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavOpen(false);
    setAcctOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavOpen(false);
        setAcctOpen(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!acctRef.current?.contains(e.target as Node)) setAcctOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const initials = initialsOf(userName);

  return (
    <div className="admin-root flex min-h-dvh items-stretch">
      {navOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="bg-ink-950/[0.38] fixed inset-0 z-40 lg:hidden"
        />
      ) : null}

      {/* ======================== SIDEBAR ======================== */}
      <aside
        className={cn(
          "bg-ink-950 fixed inset-y-0 left-0 z-50 flex w-[260px] flex-none flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 flex-none items-center justify-between gap-3 border-b border-white/[0.13] px-6">
          <Link
            href="/admin"
            className="flex min-w-0 items-center gap-3 no-underline hover:no-underline"
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt=""
                width={22}
                height={22}
                className="size-[22px] flex-none rounded-[6px] object-cover"
              />
            ) : (
              <span className="bg-ember-500 block size-2.5 flex-none rounded-full" />
            )}
            <span className="font-poppins truncate text-[15px] font-medium tracking-[-0.012em] text-white">
              Wicket Travel
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
            className="flex size-10 flex-none items-center justify-center rounded-[10px] border-0 bg-white/[0.12] text-[13.5px] leading-none text-white outline-none lg:hidden"
          >
            ×
          </button>
        </div>

        <div className="om-noscroll min-h-0 flex-1 overflow-y-auto px-4 pt-[22px] pb-5">
          {sections.map((section, i) => (
            <div key={section.heading ?? `s${i}`}>
              {section.heading ? (
                <span className="text-nav-heading block px-3 pt-4 pb-2 text-[10.5px] font-semibold tracking-[0.14em] uppercase">
                  {section.heading}
                </span>
              ) : null}
              <nav className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                  const Icon = NAV_ICONS[item.icon];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-[13.5px] tracking-[0.4px] no-underline transition-[background-color,color,box-shadow] duration-[130ms] hover:no-underline",
                        active
                          ? "bg-marine-500 font-semibold text-white shadow-[0_4px_12px_oklch(0.205_0.038_258_/_0.35)]"
                          : "text-nav-ink font-medium hover:bg-white/[0.10] hover:text-white"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-[18px] flex-none items-center justify-center",
                          active ? "opacity-100" : "opacity-70"
                        )}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="flex min-w-0 flex-1 items-start gap-0.5">
                        <span className="min-w-0 truncate">{item.label}</span>
                        {item.count ? (
                          <span
                            className={cn(
                              "-mt-0.5 flex-none text-[10px] leading-none font-bold tracking-normal tabular-nums",
                              active ? "text-white" : "text-ember-500"
                            )}
                          >
                            {item.count}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="flex-none border-t border-white/[0.13] p-3">
          <form action={signOut}>
            <button
              type="submit"
              className="text-nav-ink flex h-[42px] w-full items-center gap-2.5 rounded-[10px] px-3 text-[13.5px] font-medium tracking-[0.4px] transition-colors hover:bg-white/[0.10] hover:text-white"
            >
              <span className="flex size-[18px] flex-none items-center justify-center opacity-85">
                <SignOutIcon size={18} />
              </span>
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ==================== CONTENT COLUMN ==================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line-soft sticky top-0 z-30 flex h-16 flex-none items-center gap-3 border-b bg-white/[0.88] px-[clamp(16px,2.4vw,32px)] backdrop-blur-[10px]">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            className="border-line-field text-ink-700 flex size-10 flex-none items-center justify-center rounded-[10px] border bg-white outline-none lg:hidden"
          >
            <MenuIcon size={18} />
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = query.trim();
              router.push(q ? `/admin/orders?q=${encodeURIComponent(q)}` : "/admin/orders");
            }}
            className="relative flex min-w-0 max-w-[480px] flex-1"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders"
              aria-label="Search orders"
              className="border-line-field bg-surface-1 text-ink-800 focus:border-marine-500 focus:shadow-[0_0_0_3px_var(--color-marine-200)] h-10 w-full rounded-[10px] border pr-3 pl-9 text-[13px] font-normal outline-none transition-[border-color,box-shadow,background-color] duration-[130ms] focus:bg-white"
            />
            <span className="text-ink-500 pointer-events-none absolute top-[11px] left-3 block size-4">
              <SearchIcon size={16} />
            </span>
          </form>

          <div className="flex-1" />

          <AdminBell userId={userId} />

          <Link
            href="/admin/support"
            aria-label="Support"
            className="border-line-field text-ink-700 hover:bg-surface-1 hover:border-ink-300 flex size-10 flex-none items-center justify-center rounded-[10px] border bg-white no-underline transition-colors hover:no-underline"
          >
            <LifebuoyIcon size={18} />
          </Link>

          <div ref={acctRef} className="relative flex-none">
            <button
              type="button"
              onClick={() => setAcctOpen((v) => !v)}
              aria-expanded={acctOpen}
              className="border-line-field hover:bg-surface-1 flex h-11 items-center gap-2.5 rounded-full border bg-white py-0 pr-3 pl-[5px] outline-none"
            >
              <span className="bg-marine-500 flex size-[34px] flex-none items-center justify-center rounded-full text-[12px] font-medium text-white">
                {initials}
              </span>
              <span className="hidden flex-col items-start leading-[1.2] sm:flex">
                <span className="text-ink-800 max-w-[140px] truncate text-[12.5px] font-medium tracking-[-0.005em] whitespace-nowrap">
                  {userName}
                </span>
                <span className="text-ink-600 text-[11px] font-normal whitespace-nowrap">
                  Administrator
                </span>
              </span>
            </button>

            {acctOpen ? (
              <div
                className={cn(
                  "border-line-base absolute top-12 right-0 z-50 w-[236px] overflow-hidden rounded-[12px] border bg-white",
                  shadowE3
                )}
              >
                <div className="border-line-soft flex flex-col gap-1 border-b p-4">
                  <span className="text-[12.5px] font-medium">{userName}</span>
                  <span className="text-ink-600 text-[11.5px] font-normal break-all">
                    {userEmail}
                  </span>
                  <span className="bg-marine-tint text-marine-600 mt-1.5 self-start rounded-full px-2 py-1 text-[11px] font-medium tracking-[0.04em] uppercase">
                    Administrator
                  </span>
                </div>
                <Link
                  href="/admin/settings"
                  className="text-ink-800 hover:bg-surface-1 block w-full px-4 py-3 text-left text-[12.5px] font-normal no-underline hover:no-underline"
                >
                  Settings
                </Link>
                <Link
                  href="/admin/notifications"
                  className="text-ink-800 hover:bg-surface-1 block w-full px-4 py-3 text-left text-[12.5px] font-normal no-underline hover:no-underline"
                >
                  Notifications
                </Link>
                <form action={signOut} className="border-line-soft border-t">
                  <button
                    type="submit"
                    className="text-danger-ink hover:bg-surface-1 block w-full px-4 py-3 text-left text-[12.5px] font-medium"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </header>

        <main className="om-scroll min-w-0 flex-1 px-[clamp(16px,2.4vw,32px)] pt-[clamp(20px,2.6vw,34px)] pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "WT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
