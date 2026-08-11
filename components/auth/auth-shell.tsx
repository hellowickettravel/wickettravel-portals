"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type AuthScreen = "signin" | "signup" | "forgot" | "sent" | "reset" | "helper";

type PanelCopy = { eyebrow: string; headline: string; subcopy: string };

/**
 * Hero copy per auth screen. The panel is not decoration — it tells the user
 * which flow they are in before they read a single form label.
 */
const PANEL_COPY: Record<AuthScreen, PanelCopy> = {
  signin: {
    eyebrow: "Client portal",
    headline: "Every booking, document and invoice — in one calm place.",
    subcopy:
      "Sign in to track live itineraries, approve quotes and download statements without chasing a single email.",
  },
  signup: {
    eyebrow: "New customer",
    headline: "Tell us where you're going. We'll do the searching.",
    subcopy:
      "Create an account to place orders, follow every booking through to ticketed, and keep the whole conversation in one thread.",
  },
  forgot: {
    eyebrow: "Account recovery",
    headline: "Locked out? It takes about a minute to get back in.",
    subcopy:
      "We'll email a single-use link. For everyone's safety the confirmation looks the same whether or not the address is registered.",
  },
  sent: {
    eyebrow: "Account recovery",
    headline: "The link is on its way.",
    subcopy:
      "Open it from the same device where possible. It expires after 60 minutes and stops working once it has been used.",
  },
  reset: {
    eyebrow: "Account recovery",
    headline: "One new password and you're back to work.",
    subcopy:
      "Signing in again on your other devices may be required — changing a password ends every other active session.",
  },
  // The helper is being asked to do something quite unlike buying a flight, so
  // the panel has to say so — the customer's "tell us where you're going"
  // actively contradicts the page beside it.
  helper: {
    eyebrow: "Parents Tickets",
    headline: "Someone's mother is flying alone. You're on that plane anyway.",
    subcopy:
      "Help her through the airport, sit nearby, and be paid for it. Every helper is checked by a person before a family ever sees them.",
  },
};

/**
 * One photograph per screen, exactly as the design maps them.
 *
 * Only hero-flight.jpg ships today: the other four are multi-megabyte
 * originals in the design project and the design tool truncates a file read at
 * 192 KiB, so they could not be pulled intact. Nothing here needs changing to
 * fix that — drop the files into public/auth/ under these names and they take
 * over on their next load. Until then `onError` falls back to the sign-in
 * photo, so no screen ever shows a broken image.
 */
const HERO_IMAGE: Record<AuthScreen, string> = {
  signin: "/auth/hero-flight.jpg",
  signup: "/auth/hero-signup.jpg",
  forgot: "/auth/hero-forgot.png",
  sent: "/auth/hero-sent.jpg",
  reset: "/auth/hero-reset.jpg",
  helper: "/auth/hero-helper.jpg",
};

const HERO_FALLBACK = "/auth/hero-flight.jpg";

/** The design's screen switcher, in its order. */
const SCREEN_NAV: { screen: AuthScreen; label: string; href: string }[] = [
  { screen: "signin", label: "Sign in", href: "/login" },
  { screen: "signup", label: "Sign up", href: "/signup" },
  { screen: "forgot", label: "Reset", href: "/forgot-password" },
  { screen: "sent", label: "Sent", href: "/forgot-password?sent=1" },
  { screen: "reset", label: "New password", href: "/reset-password" },
];

/**
 * Two-pane auth layout: a full-bleed ink-graded photo panel on the left and the
 * form on the right. The panel stays visible on mobile as a shorter banner
 * above the form, so the brand never disappears. Below 900px the two panes
 * stack; below 460px the subcopy drops so the banner can shrink to 330px.
 */
export function AuthShell({
  screen,
  children,
}: {
  screen: AuthScreen;
  children: React.ReactNode;
}) {
  const copy = PANEL_COPY[screen];
  const [heroSrc, setHeroSrc] = useState(HERO_IMAGE[screen]);

  return (
    <main className="auth-root grid min-h-dvh min-[900px]:grid-cols-[1.04fr_1fr]">
      {/* ===================== LEFT / HERO PANEL ===================== */}
      <section className="bg-hero-navy relative flex min-h-[330px] flex-col overflow-hidden px-[22px] pt-[26px] pb-[22px] min-[460px]:min-h-[380px] min-[900px]:min-h-[760px] min-[900px]:px-14 min-[900px]:pt-[60px] min-[900px]:pb-10">
        <Image
          key={heroSrc}
          src={heroSrc}
          alt=""
          fill
          priority
          sizes="(min-width: 900px) 52vw, 100vw"
          onError={() => setHeroSrc(HERO_FALLBACK)}
          className="object-cover object-center"
        />
        {/* Flat tint keeps the photo from competing, then a long vertical ramp
            sinks the bottom into ink so the footer text always has contrast. */}
        <div className="bg-hero-tint absolute inset-0" />
        <div className="auth-hero-scrim absolute inset-0" />

        {/* Brand lockup */}
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-7 flex-none items-center justify-center rounded-[8px] border border-white/22 bg-white/16">
            <span className="bg-ember-500 block size-[9px] rounded-full" />
          </span>
          <span className="font-poppins text-[17px] font-medium tracking-[-0.014em] text-white">
            Wicket Travel
          </span>
        </div>

        {/* Screen message — pinned above the footer */}
        <div className="relative mt-auto mb-[22px] flex max-w-[480px] flex-col gap-4 min-[900px]:mb-12">
          <div className="flex items-center gap-3">
            <span className="bg-ember-500 block h-0.5 w-[26px] flex-none" />
            <span className="text-ember-300 text-[11px] font-semibold tracking-[0.09em] whitespace-nowrap uppercase">
              {copy.eyebrow}
            </span>
          </div>
          <h1 className="font-poppins m-0 text-[clamp(26px,3.2vw,36px)] leading-[1.2] font-medium tracking-[-0.022em] text-pretty text-white">
            {copy.headline}
          </h1>
          <p className="hidden max-w-[430px] text-[15px] leading-[1.6] text-pretty text-white/76 min-[460px]:block">
            {copy.subcopy}
          </p>
        </div>

        {/* Screen switcher + legal footer */}
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pr-1 text-[11px] font-medium tracking-[0.09em] text-white/40 uppercase">
              Screens
            </span>
            {SCREEN_NAV.map((item) => {
              const active = item.screen === screen;
              return (
                <Link
                  key={item.screen}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11.5px] font-medium whitespace-nowrap no-underline transition-colors hover:no-underline",
                    active
                      ? "text-ink-900 bg-white"
                      : "bg-white/12 text-white/78 hover:bg-white/20 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <span className="block h-px bg-white/16" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-white/48">
            <span>© 2026 Wicket Travel Ltd. All rights reserved.</span>
            <a
              href="https://www.wickettravel.com/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/74 transition-colors hover:text-white"
            >
              Terms
            </a>
            <a
              href="https://www.wickettravel.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/74 transition-colors hover:text-white"
            >
              Privacy
            </a>
          </div>
        </div>
      </section>

      {/* ===================== RIGHT / FORM PANEL ===================== */}
      <section className="flex items-center justify-center bg-white px-[clamp(20px,4vw,48px)] py-[clamp(32px,5vw,56px)]">
        <div className="w-full max-w-[404px]">{children}</div>
      </section>
    </main>
  );
}
