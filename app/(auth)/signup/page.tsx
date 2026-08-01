"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plane, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { guardSignup, recordSignup } from "@/lib/actions/auth-guard";
import { checkPassword } from "@/lib/security/password";
import { IconChip } from "@/components/ui/icon-chip";
import { PasswordStrength } from "@/components/auth/password-strength";
import { AuthShell, AuthHeading } from "@/components/auth/auth-shell";
import {
  AuthField,
  AuthFieldGroup,
  AuthInput,
  AuthPasswordInput,
} from "@/components/auth/auth-field";
import { AuthSubmit, authSecondaryClassName } from "@/components/auth/auth-submit";
import { cn } from "@/lib/utils";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/or-divider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Which field, if any, the last submit attempt tripped on. */
type FieldErrors = Partial<
  Record<"fullName" | "email" | "password" | "confirm", string>
>;

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
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

    // Same gates as before, now also reported against the field they belong
    // to. The copy says what to do next, never "invalid input".
    setErrors({});

    if (!name) {
      setErrors({
        fullName: "Add your full name so we know who we're booking for.",
      });
      toast.error("Enter your full name");
      return;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      setErrors({ email: "Use the format you@example.com so we can reach you." });
      toast.error("Enter a valid email address");
      return;
    }
    const pw = checkPassword(password);
    if (!pw.ok) {
      setErrors({
        password: pw.firstError ?? "Meet every requirement listed below.",
      });
      toast.error("Choose a stronger password", {
        description: pw.firstError ?? "Meet all the password requirements.",
      });
      return;
    }
    if (password !== confirm) {
      setErrors({ confirm: "Re-type the same password to confirm it." });
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);

    // Server-side flood gate (per-IP bot-signup throttle) before we hit auth.
    const gate = await guardSignup(cleanEmail);
    if (!gate.ok) {
      setLoading(false);
      toast.error("Too many attempts", {
        description: "Please wait a little while and try again.",
      });
      return;
    }
    void recordSignup(cleanEmail);

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
      // ENUMERATION PROTECTION: never reveal that an email is already registered.
      // For a "already exists" style error we show the SAME neutral
      // check-your-email screen a fresh signup gets — an attacker can't tell the
      // two apart. Only genuinely unexpected errors surface a generic failure.
      if (msg.includes("already") || msg.includes("registered")) {
        setSentTo(cleanEmail);
        return;
      }
      toast.error("Sign up failed", {
        description: "We couldn't complete sign up. Please try again.",
      });
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
    <AuthShell
      eyebrow="Wicket Travel Portal"
      headline="Tell us where. We'll find the fare."
    >
      {sentTo ? (
        /* ---------- Check-your-email confirmation ---------- */
        <>
          <IconChip tone="marine" className="size-12 [&_svg]:size-6">
            <MailCheck />
          </IconChip>
          <h1 className="font-display mt-6 text-[32px] text-tx-head sm:text-[36px]">
            Check your email
          </h1>
          <p className="mt-3 text-[15.5px] leading-[1.6] text-tx-muted">
            We sent a verification link to{" "}
            <span className="font-bold text-tx-head">{sentTo}</span>. Open it to
            activate your account, then sign in.
          </p>
          <Link href={loginHref} className={cn(authSecondaryClassName, "mt-8")}>
            Go to sign in
          </Link>
          <p className="mt-5 text-[13px] leading-[1.5] text-tx-muted">
            Nothing yet? Check your spam folder, or wait a minute and try again.
          </p>
        </>
      ) : (
        /* ---------- Sign-up form ---------- */
        <>
          <AuthHeading
            eyebrow="Sign up"
            title="Create your account"
            lede="Book and track your flights with Wicket Travel."
          />

          {resumingBooking ? (
            <div className="mb-7 flex items-start gap-3 rounded-card border border-marine-line bg-marine-tint px-4 py-3.5 text-[14px] leading-[1.6] text-marine-ink">
              <Plane className="mt-0.5 size-[18px] shrink-0 -rotate-45" />
              <span>
                Your booking details are saved. Create your free account and
                we&apos;ll take you straight back to place the order.
              </span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <AuthFieldGroup>
              <AuthField
                label="Full name"
                htmlFor="fullName"
                error={errors.fullName}
              >
                <AuthInput
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Traveller"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-invalid={errors.fullName ? true : undefined}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  required
                  disabled={loading}
                />
              </AuthField>

              <AuthField label="Email address" htmlFor="email" error={errors.email}>
                <AuthInput
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  required
                  disabled={loading}
                />
              </AuthField>

              <AuthField
                label="Password"
                htmlFor="password"
                error={errors.password}
              >
                <AuthPasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  required
                  disabled={loading}
                />
                <PasswordStrength password={password} />
              </AuthField>

              <AuthField
                label="Confirm password"
                htmlFor="confirm"
                error={errors.confirm}
              >
                <AuthPasswordInput
                  id="confirm"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={errors.confirm ? true : undefined}
                  aria-describedby={errors.confirm ? "confirm-error" : undefined}
                  required
                  disabled={loading}
                />
              </AuthField>
            </AuthFieldGroup>

            <AuthSubmit
              loading={loading}
              loadingLabel="Creating account…"
              className="mt-8"
            >
              Create account
            </AuthSubmit>
          </form>

          <div className="my-7">
            <OrDivider />
          </div>

          <GoogleButton label="Sign up with Google" />

          <p className="mt-7 text-[14px] leading-[1.6] text-tx-muted">
            Already have an account?{" "}
            <Link
              href={loginHref}
              className="font-bold text-marine-ink underline-offset-[3px] transition-colors duration-150 ease-brand hover:underline"
            >
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
