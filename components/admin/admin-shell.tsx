"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { AdminBell } from "@/components/admin/admin-bell";
import { shadowE3 } from "@/components/admin/ui";
import {
  LifebuoyIcon,
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
  /** Live unactioned count — rendered as a small warm figure, per the design. */
  count?: number;
  /** The design weights Dashboard at 600 even when it is not the active row. */
  emphasize?: boolean;
};

export type AdminNavSection = { heading?: string; items: AdminNavItem[] };

/**
 * One destination in the bottom tab bar. Staff portals don't use these — they
 * get the off-canvas sidebar — but the customer portal is a phone-first product
 * for people who are not at a desk, so it navigates from the thumb instead.
 */
export type MobileTab = {
  label: string;
  href: string;
  icon: NavIconName;
  exact?: boolean;
  /** The single elevated centre action. At most one tab should set this. */
  primary?: boolean;
};

export type SearchScreen = {
  prefix: string;
  exact?: boolean;
  placeholder: string;
  label: string;
};

/**
 * Per-screen search, exactly as the design's `searchScreens` map declares it:
 * the field only appears on the screens listed, and each one names what it
 * searches. Longest prefix wins so detail routes fall through to no search,
 * which is what the design does.
 */
const SEARCH: { prefix: string; exact?: boolean; placeholder: string; label: string }[] = [
  { prefix: "/admin", exact: true, placeholder: "Search orders, customers…", label: "Search" },
  { prefix: "/admin/orders", exact: true, placeholder: "Search orders", label: "Search orders" },
  { prefix: "/admin/customers", exact: true, placeholder: "Search customers", label: "Search customers" },
  { prefix: "/admin/employees", exact: true, placeholder: "Search staff", label: "Search staff" },
  { prefix: "/admin/transactions", exact: true, placeholder: "Search transactions", label: "Search transactions" },
  { prefix: "/admin/messages", exact: true, placeholder: "Search conversations", label: "Search conversations" },
  { prefix: "/admin/visa-queries", exact: true, placeholder: "Search visa queries", label: "Search visa queries" },
  { prefix: "/admin/parents-tickets", exact: true, placeholder: "Search tickets", label: "Search parent tickets" },
  { prefix: "/admin/parents-verification", exact: true, placeholder: "Search people", label: "Search verifications" },
  { prefix: "/admin/parents-listings", exact: true, placeholder: "Search listings", label: "Search parent listings" },
  { prefix: "/admin/parents-matches", exact: true, placeholder: "Search matches", label: "Search matches" },
  { prefix: "/admin/support", exact: true, placeholder: "Search tickets", label: "Search support tickets" },
];

/**
 * The Admin Portal shell, ported from the Claude Design "Admin Portal All
 * Pages" file: a 256px sidebar on the design's vertical ink ramp with grouped
 * nav, and a 64px sticky top bar carrying the per-screen search, the
 * notification bell, a support shortcut and the account menu.
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
  /* Defaults are the admin portal's. The employee portal renders the same
     shell with its own nav, search map and destinations — the design system
     is the portal's, not the role's. */
  roleLabel = "Administrator",
  homeHref = "/admin",
  settingsHref = "/admin/settings",
  settingsLabel = "Settings",
  supportHref = "/admin/support",
  searchScreens = SEARCH,
  mobileTabs,
  topBarExtra,
  showBell = true,
  signOutHref,
}: {
  sections: AdminNavSection[];
  userName: string;
  userEmail: string;
  userId: string;
  logoUrl?: string | null;
  children: React.ReactNode;
  roleLabel?: string;
  homeHref?: string;
  settingsHref?: string;
  /** The account menu's first row. "Profile" in the customer portal. */
  settingsLabel?: string;
  supportHref?: string;
  searchScreens?: SearchScreen[];
  /**
   * Supply these and the shell swaps its mobile navigation: the hamburger and
   * the off-canvas sidebar go away below 1024px and a bottom tab bar takes
   * over. Everything the tabs omit stays reachable from the bell and the
   * account menu, so no destination is ever stranded.
   */
  mobileTabs?: MobileTab[];
  /** Rendered in the top bar, left of the bell. The driver's availability
      switch lives here — it has to be reachable from every screen. */
  topBarExtra?: React.ReactNode;
  /** The driver portal has no notifications table behind it yet. */
  showBell?: boolean;
  /** Set when the portal has no real session to end (the driver portal is
      still UI-only): renders a link instead of the signOut server action. */
  signOutHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const acctRef = useRef<HTMLDivElement>(null);

  const search = useMemo(
    () =>
      searchScreens.find((s) =>
        s.exact ? pathname === s.prefix : pathname.startsWith(s.prefix)
      ),
    [pathname, searchScreens]
  );

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

  const hasTabs = !!mobileTabs?.length;

  return (
    <div className="admin-root flex min-h-dvh items-stretch">
      {navOpen && !hasTabs ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="bg-ink-950/[0.38] fixed inset-0 z-40 lg:hidden"
        />
      ) : null}

      {/* ======================== SIDEBAR ======================== */}
      <aside
        style={{
          background:
            "linear-gradient(180deg, var(--color-sidebar-top), var(--color-sidebar-bottom))",
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-none flex-col text-white shadow-[0_24px_60px_oklch(0.205_0.038_258_/_0.42)] transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 lg:self-start lg:shadow-none",
          navOpen && !hasTabs ? "translate-x-0" : "-translate-x-[110%]",
          // With a tab bar there is no way to open the rail below lg, so keep
          // it out of the tab order entirely rather than merely off-screen.
          hasTabs && "max-lg:hidden"
        )}
      >
        <div className="flex h-16 flex-none items-center justify-between gap-3 border-b border-white/[0.13] px-6">
          <Link
            href={homeHref}
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
                        /* leading-normal so the label box is 16px tall, as
                           it is in the design (its nav item is a <button>).
                           The count is positioned off that box, so at 1.5 it
                           floated too far above the word. */
                        "flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-[13.5px] leading-[normal] tracking-[0.4px] no-underline transition-[background-color,color,box-shadow] duration-[130ms] hover:no-underline",
                        active
                          ? "bg-white/[0.10] font-semibold text-white shadow-[inset_3px_0_0_var(--color-ember-500)] hover:bg-white/[0.14]"
                          : cn(
                              "text-nav-ink hover:bg-white/[0.11] hover:text-white hover:shadow-[inset_3px_0_0_rgb(255_255_255_/_0.22)]",
                              item.emphasize ? "font-semibold" : "font-medium"
                            )
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-[18px] flex-none items-center justify-center",
                          active ? "opacity-100" : "opacity-[0.78]"
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
                              active ? "text-nav-count-on" : "text-nav-count"
                            )}
                          >
                            {item.count > 9 ? "9+" : item.count}
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
          {signOutHref ? (
            <Link
              href={signOutHref}
              className="text-nav-ink flex h-[42px] w-full items-center gap-2.5 rounded-[10px] px-3 text-[13.5px] font-medium tracking-[0.4px] no-underline transition-colors hover:bg-white/[0.10] hover:text-white hover:no-underline"
            >
              <span className="flex size-[18px] flex-none items-center justify-center opacity-85">
                <SignOutIcon size={18} />
              </span>
              <span>Sign out</span>
            </Link>
          ) : (
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
          )}
        </div>
      </aside>

      {/* ==================== CONTENT COLUMN ==================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line-soft sticky top-0 z-30 flex h-16 flex-none items-center gap-3 border-b bg-white/[0.88] px-[clamp(16px,2.4vw,32px)] backdrop-blur-[10px]">
          {hasTabs ? (
            <Link
              href={homeHref}
              aria-label="Wicket Travel"
              className="flex flex-none items-center gap-2.5 no-underline hover:no-underline lg:hidden"
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
              <span className="font-poppins text-ink-800 truncate text-[15px] font-medium tracking-[-0.012em]">
                Wicket Travel
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              className="border-line-field flex size-10 flex-none flex-col items-center justify-center gap-1 rounded-[10px] border bg-white outline-none lg:hidden"
            >
              <span className="bg-ink-700 block h-[1.5px] w-[15px]" />
              <span className="bg-ink-700 block h-[1.5px] w-[15px]" />
              <span className="bg-ink-700 block h-[1.5px] w-[15px]" />
            </button>
          )}

          {search ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = query.trim();
                const base =
                  search.exact && search.prefix === homeHref
                    ? `${homeHref}/orders`
                    : search.prefix;
                router.push(q ? `${base}?q=${encodeURIComponent(q)}` : base);
              }}
              className="relative flex min-w-0 max-w-[480px] flex-1"
            >
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={search.placeholder}
                aria-label={search.label}
                className="border-line-field bg-surface-1 text-ink-800 focus:border-marine-500 focus:shadow-[0_0_0_3px_var(--color-marine-200)] h-10 w-full rounded-[10px] border pr-3 pl-9 text-[13px] font-normal outline-none transition-[border-color,box-shadow,background-color] duration-[130ms] focus:bg-white"
              />
              <span className="text-ink-500 pointer-events-none absolute top-[11px] left-3 block size-4">
                <SearchIcon size={16} />
              </span>
            </form>
          ) : null}

          <div className="flex-1" />

          {topBarExtra ? (
            <div className="flex flex-none items-center">{topBarExtra}</div>
          ) : null}

          {showBell ? <AdminBell userId={userId} /> : null}

          <Link
            href={supportHref}
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
              <span className="hidden flex-col items-start leading-[1.2] min-[1180px]:flex">
                <span className="text-ink-800 max-w-[140px] truncate text-[12.5px] font-medium tracking-[-0.005em] whitespace-nowrap">
                  {userName}
                </span>
                <span className="text-ink-600 text-[11px] font-normal whitespace-nowrap">
                  {roleLabel}
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
                    {roleLabel}
                  </span>
                </div>
                <Link
                  href={settingsHref}
                  className="text-ink-800 hover:bg-surface-1 block w-full px-4 py-3 text-left text-[12.5px] font-normal no-underline hover:no-underline"
                >
                  {settingsLabel}
                </Link>
                {signOutHref ? (
                  <Link
                    href={signOutHref}
                    className="border-line-soft text-danger-ink hover:bg-surface-1 block w-full border-t px-4 py-3 text-left text-[12.5px] font-medium no-underline hover:no-underline"
                  >
                    Sign out
                  </Link>
                ) : (
                  <form action={signOut} className="border-line-soft border-t">
                    <button
                      type="submit"
                      className="text-danger-ink hover:bg-surface-1 block w-full px-4 py-3 text-left text-[12.5px] font-medium"
                    >
                      Sign out
                    </button>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        </header>

        <main
          className={cn(
            "om-scroll min-w-0 flex-1 px-[clamp(16px,2.4vw,32px)] pt-[clamp(20px,2.6vw,34px)] pb-16",
            // Clear the fixed tab bar (60px + the elevated CTA's overhang).
            hasTabs && "max-lg:pb-32"
          )}
        >
          {children}
        </main>
      </div>

      {hasTabs ? <TabBar tabs={mobileTabs!} pathname={pathname} /> : null}
    </div>
  );
}

/**
 * The customer portal's bottom navigation. Same palette as the rest of the
 * system — marine marks the active destination, and the single ember circle is
 * the portal's one primary action, exactly as ember is used everywhere else.
 */
function TabBar({ tabs, pathname }: { tabs: MobileTab[]; pathname: string }) {
  const isOn = (t: MobileTab) =>
    t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/");

  return (
    <nav
      aria-label="Primary"
      className="border-line-soft fixed inset-x-0 bottom-0 z-40 border-t bg-white/[0.94] pb-[env(safe-area-inset-bottom)] backdrop-blur-[10px] lg:hidden"
    >
      <div className="mx-auto flex max-w-[520px] items-stretch justify-around gap-1 px-2 pt-1.5 pb-1">
        {tabs.map((t) => {
          const active = isOn(t);
          const Icon = NAV_ICONS[t.icon];

          if (t.primary) {
            return (
              <div key={t.href} className="flex flex-1 justify-center">
                <Link
                  href={t.href}
                  aria-label={t.label}
                  aria-current={active ? "page" : undefined}
                  className="bg-ember-600 hover:bg-ember-700 -mt-7 flex size-[56px] flex-none items-center justify-center rounded-full text-white no-underline shadow-[0_8px_20px_oklch(0.565_0.172_47_/_0.34)] ring-4 ring-white transition-colors hover:no-underline active:scale-95"
                >
                  <Icon size={24} />
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[10px] px-1 text-[10.5px] leading-[normal] font-medium no-underline transition-colors hover:no-underline",
                active ? "text-marine-600" : "text-ink-500"
              )}
            >
              <Icon size={21} />
              <span className="truncate">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "WT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
