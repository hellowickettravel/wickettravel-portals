"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Car, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/portal/password-input";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function DriverLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // UI only — no real auth yet. Simulate a brief sign-in then enter the app.
    setLoading(true);
    setTimeout(() => router.push("/driver"), 650);
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand / hero — hidden on phones */}
      <section className="relative hidden overflow-hidden bg-[linear-gradient(165deg,var(--ocean)_0%,var(--ocean-deep)_58%,var(--ocean-night)_100%)] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(120%_120%_at_30%_0%,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,111,77,0.34),transparent_70%)] blur-2xl" />

        <div className="relative z-10">
          <BrandLogo variant="white" className="h-9 w-auto" priority />
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-coral">
            Driver Partner
          </p>
          <h1 className="mt-5 max-w-md text-4xl font-semibold leading-[1.15] tracking-tight text-balance text-white xl:text-5xl">
            Drive with Wicket. Earn on every airport ride.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
            Accept airport pickups across Hyderabad, Chennai & Bengaluru, track
            your trips, and get weekly payouts — all from your phone.
          </p>
        </div>

        <div className="relative z-10 flex max-w-md items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15">
            <Star className="size-4 text-coral" />
          </div>
          <p className="text-[13px] leading-snug text-white/70">
            <span className="font-medium text-white/90">Trusted by 2,000+ drivers</span>{" "}
            across South India.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="relative flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
          <div className="mb-10 lg:hidden">
            <BrandLogo className="h-8 w-auto" priority />
          </div>

          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-sky-tint px-2.5 py-1 text-xs font-medium text-ocean-deep">
            <Car className="size-3.5" />
            Driver Partner
          </div>
          <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-tx-head">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to see available rides and your earnings.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Phone or email
              </Label>
              <Input
                id="phone"
                type="text"
                inputMode="text"
                autoComplete="username"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Password
              </Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <div className="flex justify-end">
                <button type="button" className="text-xs font-medium text-ocean transition-colors hover:text-ocean-deep">
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="accent" className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New driver?{" "}
            <Link href="/driver/apply" className="font-medium text-ocean transition-colors hover:text-ocean-deep">
              Become a partner
            </Link>
          </p>

          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="size-3.5" />
            Secure driver sign-in
          </div>
        </div>
      </section>
    </main>
  );
}
