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
      <section className="hidden bg-ocean lg:flex lg:flex-col lg:justify-between lg:p-11 xl:p-14">

        <div>
          <BrandLogo variant="white" className="h-9 w-auto" priority />
        </div>

        <div className="max-w-xl">
          <p className="font-micro text-white/60">Driver partner</p>
          <h1 className="mt-3.5 max-w-[15ch] text-[29px] leading-[1.2] font-bold tracking-display text-balance text-white">
            Drive with Wicket. Earn on every airport ride.
          </h1>
          <p className="mt-3 max-w-[34ch] text-[15.5px] leading-[1.6] text-tx-invert-2">
            Accept airport pickups across Hyderabad, Chennai & Bengaluru, track
            your trips, and get weekly payouts — all from your phone.
          </p>
        </div>

        <div className="flex max-w-md items-center gap-3">
          <div className="flex size-[34px] shrink-0 items-center justify-center rounded-control bg-white/13">
            <Star className="size-[17px] text-tx-invert" />
          </div>
          <p className="text-[13.5px] leading-[1.6] text-tx-invert-3">
            <span className="font-semibold text-tx-invert-2">Trusted by 2,000+ drivers</span>{" "}
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

          <div className="mb-1 inline-flex items-center gap-1.5 rounded-chip bg-sky-tint px-2.5 py-1 text-xs font-medium text-ocean">
            <Car className="size-3.5" />
            Driver Partner
          </div>
          <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-tx-head">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-tx-muted">
            Sign in to see available rides and your earnings.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-medium uppercase tracking-wider text-tx-muted">
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
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-tx-muted">
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

          <p className="mt-6 text-center text-sm text-tx-muted">
            New driver?{" "}
            <Link href="/driver/apply" className="font-medium text-ocean transition-colors hover:text-ocean-deep">
              Become a partner
            </Link>
          </p>

          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-tx-faint">
            <ShieldCheck className="size-3.5" />
            Secure driver sign-in
          </div>
        </div>
      </section>
    </main>
  );
}
