"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plane, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/portal/password-input";
import { AuthAside } from "@/components/auth/auth-aside";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/or-divider";
import { AuthFooter } from "@/components/auth/auth-footer";

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // A guest who started the booking wizard arrives with ?redirect= — keep it
  // through the sign-in links so they land back on their filled wizard.
  const [redirectParam, setRedirectParam] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL (external system), client-only
    setRedirectParam(new URLSearchParams(window.location.search).get("redirect"));
  }, []);

  const loginHref = redirectParam
    ? `/login?redirect=${encodeURIComponent(redirectParam)}`
    : "/login";

  // Guest arrived mid-booking — reassure them their wizard entries are safe.
  const resumingBooking = redirectParam?.startsWith("/customer/book") ?? false;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const name = fullName.trim();
    const cleanEmail = email.trim();

    if (!name) {
      toast.error("Enter your full name");
      return;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      toast.error("Password too short", {
        description: `Use at least ${MIN_PASSWORD} characters.`,
      });
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: name },
        // Carry the pending destination (e.g. the half-filled booking wizard)
        // through the verification email so the customer resumes it after
        // clicking the link, instead of landing on the bare dashboard.
        emailRedirectTo: `${window.location.origin}/auth/callback${
          redirectParam ? `?next=${encodeURIComponent(redirectParam)}` : ""
        }`,
      },
    });

    if (error) {
      setLoading(false);
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        toast.error("An account with this email already exists.", {
          description: "Try signing in instead.",
        });
      } else {
        toast.error("Sign up failed", { description: error.message });
      }
      return;
    }

    // Supabase returns a user with an EMPTY identities array when the email is
    // already registered (enumeration protection). Treat that as a duplicate.
    if (!data.user || (data.user.identities?.length ?? 0) === 0) {
      setLoading(false);
      toast.error("An account with this email already exists.", {
        description: "Try signing in instead.",
      });
      return;
    }

    // Provision the customer role server-side (service role). The user is not
    // logged in yet — they must verify their email first.
    const res = await fetch("/api/signup-profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: data.user.id, fullName: name }),
    });

    if (!res.ok) {
      setLoading(false);
      toast.error("Couldn't finish setup", {
        description: "Your account was created but role setup failed.",
      });
      return;
    }

    // Email verification required — do NOT log in. Show the confirmation state.
    setLoading(false);
    setSentTo(cleanEmail);
    toast.success("Check your email to verify your account.");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.2fr_1fr]">
      <AuthAside
        headline="Book and track every flight in one place."
        supporting="Create your Wicket account to manage bookings and chat with our team — all from one simple dashboard."
      />

      {/* ===================== RIGHT / FORM PANEL ===================== */}
      <section className="relative flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
          {/* Mobile brand */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="size-5 -rotate-45" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-navy">
              Wicket
            </span>
          </div>

          {sentTo ? (
            /* ---------- Check-your-email confirmation ---------- */
            <div className="text-center">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-chip text-brand-dark">
                <MailCheck className="size-7" />
              </div>
              <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-navy">
                Check your email
              </h2>
              <p className="mt-3 text-sm text-slate-500">
                We sent a verification link to{" "}
                <span className="font-medium text-foreground">{sentTo}</span>.
                Click it to activate your account, then sign in.
              </p>
              <Link
                href={loginHref}
                className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-white shadow-sm shadow-orange/25 transition-all duration-150 hover:bg-orange-dark hover:shadow-md hover:shadow-orange/30 hover:-translate-y-px"
              >
                Go to sign in
              </Link>
              <p className="mt-5 text-xs text-slate-500">
                Didn&apos;t get it? Check spam, or wait a minute and try again.
              </p>
            </div>
          ) : (
            /* ---------- Sign-up form ---------- */
            <>
              <p className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Sign up
              </p>
              <h2 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-tight text-navy">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Book and track your flights with Wicket.
              </p>

              {resumingBooking ? (
                <div className="mt-5 flex items-start gap-2.5 rounded-[10px] border border-outline bg-chip/60 px-3.5 py-3 text-sm text-brand-dark">
                  <Plane className="mt-0.5 size-4 shrink-0 -rotate-45" />
                  <span>
                    Your booking details are saved. Create your free account
                    and we&apos;ll take you straight back to place the order.
                  </span>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="fullName"
                    className="font-label text-xs font-medium uppercase tracking-wider text-slate-600"
                  >
                    Full name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Traveller"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 rounded-[10px] bg-neutral-soft"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="font-label text-xs font-medium uppercase tracking-wider text-slate-600"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 rounded-[10px] bg-neutral-soft"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="font-label text-xs font-medium uppercase tracking-wider text-slate-600"
                  >
                    Password
                  </Label>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 rounded-[10px] bg-neutral-soft"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirm"
                    className="font-label text-xs font-medium uppercase tracking-wider text-slate-600"
                  >
                    Confirm password
                  </Label>
                  <PasswordInput
                    id="confirm"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 rounded-[10px] bg-neutral-soft"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-[10px] bg-primary text-sm font-semibold text-white shadow-sm shadow-orange/25 transition-all duration-150 hover:bg-orange-dark hover:shadow-md hover:shadow-orange/30 hover:-translate-y-px"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>

              <div className="my-6">
                <OrDivider />
              </div>

              <GoogleButton />

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link
                  href={loginHref}
                  className="font-medium text-brand transition-colors hover:text-brand-dark"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>

        <AuthFooter />
      </section>
    </main>
  );
}
