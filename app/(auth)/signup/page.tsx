"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plane, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { guardSignup, recordSignup } from "@/lib/actions/auth-guard";
import { checkPassword } from "@/lib/security/password";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthAlert } from "@/components/auth/auth-alert";
import {
  AuthField,
  AuthLabel,
  AuthSecondaryButton,
  AuthSubmit,
  authFieldClass,
  authLinkClass,
} from "@/components/auth/auth-controls";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/or-divider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

    const name = fullName.trim();
    const cleanEmail = email.trim();

    if (!name) {
      setError("Enter your full name.");
      return;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    const pw = checkPassword(password);
    if (!pw.ok) {
      setError(pw.firstError ?? "Meet all the password requirements.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setLoading(true);

    // Server-side flood gate (per-IP bot-signup throttle) before we hit auth.
    const gate = await guardSignup(cleanEmail);
    if (!gate.ok) {
      setLoading(false);
      setError("Too many attempts. Please wait a little while and try again.");
      return;
    }
    void recordSignup(cleanEmail);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
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

    if (signUpError) {
      setLoading(false);
      const msg = signUpError.message.toLowerCase();
      // ENUMERATION PROTECTION: never reveal that an email is already registered.
      // For a "already exists" style error we show the SAME neutral
      // check-your-email screen a fresh signup gets — an attacker can't tell the
      // two apart. Only genuinely unexpected errors surface a generic failure.
      if (msg.includes("already") || msg.includes("registered")) {
        setSentTo(cleanEmail);
        return;
      }
      setError("We couldn't complete sign up. Please try again.");
      return;
    }

    // Supabase returns a user with an EMPTY identities array when the email is
    // already registered (enumeration protection). Show the SAME neutral
    // confirmation screen — do NOT reveal the duplicate — and skip provisioning.
    if (!data.user || (data.user.identities?.length ?? 0) === 0) {
      setLoading(false);
      setSentTo(cleanEmail);
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
      setError("Your account was created but role setup failed. Contact support.");
      return;
    }

    // Email verification required — do NOT log in. Show the confirmation state.
    setLoading(false);
    setSentTo(cleanEmail);
  }

  // ---------- Check-your-email confirmation ----------
  if (sentTo) {
    return (
      <AuthShell screen="sent">
        <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-orange/10 text-orange-dark">
          <MailCheck className="size-7" />
        </span>
        <AuthHeading title="Check your email" dot={false} className="mb-4" />
        <p className="text-[15px] leading-[1.6] text-slate-500">
          We sent a verification link to{" "}
          <span className="font-medium text-navy">{sentTo}</span>. Click it to
          activate your account, then sign in.
        </p>
        <p className="mt-4 mb-8 text-[13.5px] leading-[1.55] text-slate-500">
          Nothing arrived? Check the spam folder before requesting another —
          repeated requests are rate limited.
        </p>

        <AuthSecondaryButton href={loginHref}>Go to sign in</AuthSecondaryButton>
      </AuthShell>
    );
  }

  // ---------- Sign-up form ----------
  return (
    <AuthShell screen="signup">
      <AuthHeading
        title="Create account"
        description="Place orders, track every booking and talk to the team in one place."
      />

      {error ? <AuthAlert>{error}</AuthAlert> : null}

      {resumingBooking ? (
        <div className="mb-5 flex items-start gap-3 rounded-[10px] border border-border bg-chip/60 px-4 py-3 text-[13px] leading-[1.5] text-brand-dark">
          <Plane className="mt-0.5 size-4 shrink-0 -rotate-45" />
          <span>
            Your booking details are saved. Create your free account and
            we&apos;ll take you straight back to place the order.
          </span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <AuthField>
          <AuthLabel htmlFor="fullName">Full name</AuthLabel>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Jane Traveller"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={loading}
            className={authFieldClass}
          />
        </AuthField>

        <AuthField>
          <AuthLabel htmlFor="email">Email address</AuthLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className={authFieldClass}
          />
        </AuthField>

        <AuthField>
          <AuthLabel htmlFor="password">Password</AuthLabel>
          <AuthPasswordField
            id="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <PasswordChecklist password={password} />
        </AuthField>

        <AuthField>
          <AuthLabel htmlFor="confirm">Confirm password</AuthLabel>
          <AuthPasswordField
            id="confirm"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            disabled={loading}
          />
        </AuthField>

        <AuthSubmit loading={loading} loadingLabel="Creating account…">
          Create account
        </AuthSubmit>

        <p className="text-xs leading-[1.55] text-pretty text-slate-500">
          By creating an account you agree to our{" "}
          <a
            href="https://www.wickettravel.com/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className={authLinkClass}
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://www.wickettravel.com/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className={authLinkClass}
          >
            Privacy Policy
          </a>
          .
        </p>
      </form>

      <div className="my-6">
        <OrDivider />
      </div>

      <GoogleButton />

      <p className="mt-6 text-[13.5px] text-slate-500">
        Already have an account?{" "}
        <Link href={loginHref} className={authLinkClass}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
