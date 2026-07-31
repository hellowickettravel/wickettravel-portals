import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

type AuthAsideProps = {
  headline?: string;
  supporting?: string;
};

/**
 * Left-hand brand/hero panel shared by the login and signup screens.
 * Hidden below lg; the form panels render full-width on small screens.
 */
export function AuthAside({
  headline = "One clean inbox for every booking and chat.",
  supporting = "Run your flight desk from a single shared workspace — conversations, orders and your team, all in one calm place.",
}: AuthAsideProps) {
  return (
    <section className="relative hidden overflow-hidden bg-[linear-gradient(165deg,var(--ocean)_0%,var(--ocean-deep)_58%,var(--ocean-night)_100%)] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      {/* Texture: faint dot-grid + soft radial glows (navy depth + orange accent) */}
      <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(120%_120%_at_30%_0%,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,111,77,0.34),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-[360px] rounded-full bg-[radial-gradient(circle,rgba(15,76,129,0.55),transparent_70%)] blur-2xl" />

      {/* Brand lockup */}
      <div className="relative z-10">
        <BrandLogo variant="white" className="h-9 w-auto" priority />
      </div>

      {/* Centered messaging */}
      <div className="relative z-10 max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-coral">
          Travel Operations
        </p>
        <h1 className="mt-5 max-w-md text-4xl font-semibold leading-[1.15] tracking-tight text-balance text-white xl:text-5xl">
          {headline}
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
          {supporting}
        </p>
      </div>

      {/* Bottom trust line */}
      <div className="relative z-10 flex max-w-md items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15">
          <ShieldCheck className="size-4 text-coral" />
        </div>
        <p className="text-[13px] leading-snug text-white/70">
          <span className="font-medium text-white/90">Secure sign-in.</span>{" "}
          Your bookings and conversations are encrypted and visible only to you
          and our team.
        </p>
      </div>
    </section>
  );
}
