import { Plane } from "lucide-react";

const STATS = [
  { value: "3", label: "Portals" },
  { value: "1", label: "Shared Inbox" },
  { value: "24/7", label: "Coverage" },
];

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
    <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#1e3a5f_0%,#0a4a76_52%,#0066a1_100%)] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      {/* Texture: faint dot-grid + soft radial glows */}
      <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(120%_120%_at_30%_0%,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.28),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-[360px] rounded-full bg-[radial-gradient(circle,rgba(13,110,170,0.35),transparent_70%)] blur-2xl" />

      {/* Brand lockup */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/25 backdrop-blur-sm">
          <Plane className="size-5 -rotate-45 text-white" />
        </div>
        <span className="font-display text-xl font-semibold tracking-tight text-white">
          Wicket
        </span>
      </div>

      {/* Centered messaging */}
      <div className="relative z-10 max-w-xl">
        <p className="font-label text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/90">
          Travel Operations
        </p>
        <h1 className="mt-5 max-w-md font-display text-4xl font-semibold leading-[1.15] tracking-tight text-balance text-white xl:text-5xl">
          {headline}
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
          {supporting}
        </p>
      </div>

      {/* Bottom mini-stats */}
      <div className="relative z-10 flex items-center gap-8">
        {STATS.map((stat, i) => (
          <div key={stat.label} className="flex items-center gap-8">
            {i > 0 && <div className="h-9 w-px bg-white/15" />}
            <div>
              <p className="font-display text-2xl font-semibold text-white">
                {stat.value}
              </p>
              <p className="font-label mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/55">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
