import Image from "next/image";
import { BrandLogo } from "@/components/brand/brand-logo";
import heroImage from "@/public/auth/hero-flight.jpg";

export type AuthScreen = "signin" | "signup" | "forgot" | "sent" | "reset";

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
};

/**
 * Two-pane auth layout: a full-bleed navy-graded photo panel on the left and
 * the form on the right. Unlike the old aside, the hero stays visible on
 * mobile as a shorter banner above the form, so the brand never disappears.
 */
export function AuthShell({
  screen,
  children,
}: {
  screen: AuthScreen;
  children: React.ReactNode;
}) {
  const copy = PANEL_COPY[screen];

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.04fr_1fr]">
      {/* ===================== LEFT / HERO PANEL ===================== */}
      <section className="relative flex min-h-[330px] flex-col overflow-hidden bg-navy px-[22px] pt-[26px] pb-[22px] min-[460px]:min-h-[380px] lg:min-h-dvh lg:px-14 lg:pt-15 lg:pb-10">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 52vw, 100vw"
          className="object-cover"
        />
        {/* Flat tint keeps the photo from competing, then a long vertical ramp
            sinks the bottom into navy so the footer text always has contrast.
            The stacked layout gets a heavier tint: the ramp is spread over a
            ~380px banner instead of a full column, so its bright midpoint would
            otherwise land straight under the eyebrow. */}
        <div className="absolute inset-0 bg-navy/45 lg:bg-navy/20" />
        <div className="absolute inset-0 bg-[linear-gradient(176deg,rgb(21_44_73/0.62)_0%,rgb(30_58_95/0.12)_30%,rgb(21_44_73/0.66)_50%,rgb(21_44_73/0.88)_72%,rgb(16_33_55/0.96)_88%,rgb(14_29_49)_100%)]" />

        {/* Brand lockup */}
        <div className="relative z-10">
          <BrandLogo variant="white" className="h-8 w-auto" priority />
        </div>

        {/* Screen message — pinned above the footer */}
        <div className="relative z-10 mt-auto mb-[22px] flex max-w-[480px] flex-col gap-4 lg:mb-12">
          <div className="flex items-center gap-3">
            <span className="h-0.5 w-[26px] shrink-0 bg-orange" />
            <span className="font-label text-[11px] font-semibold tracking-[0.09em] whitespace-nowrap text-orange-light uppercase">
              {copy.eyebrow}
            </span>
          </div>
          <h1 className="font-display text-[clamp(26px,3.2vw,36px)] leading-[1.2] font-semibold tracking-[-0.022em] text-balance text-white">
            {copy.headline}
          </h1>
          <p className="hidden max-w-[430px] text-[15px] leading-[1.6] text-pretty text-white/75 min-[460px]:block">
            {copy.subcopy}
          </p>
        </div>

        {/* Legal footer */}
        <div className="relative z-10 flex flex-col gap-4">
          <span className="h-px bg-white/15" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-white/50">
            <span>© 2026 Wicket Travel Ltd. All rights reserved.</span>
            <a
              href="https://www.wickettravel.com/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/75 transition-colors hover:text-white"
            >
              Terms
            </a>
            <a
              href="https://www.wickettravel.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/75 transition-colors hover:text-white"
            >
              Privacy
            </a>
          </div>
        </div>
      </section>

      {/* ===================== RIGHT / FORM PANEL ===================== */}
      <section className="flex items-center justify-center bg-white px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
        <div className="w-full max-w-[404px]">{children}</div>
      </section>
    </main>
  );
}
