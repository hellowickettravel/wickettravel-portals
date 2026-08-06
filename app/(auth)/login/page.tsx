"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plane } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { guardLogin, recordLogin } from "@/lib/actions/auth-guard";
import { safeInternalPath } from "@/lib/security/redirect";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthAlert } from "@/components/auth/auth-alert";
import {
  AuthField,
  AuthLabel,
  AuthSubmit,
  authFieldClass,
  authLinkClass,
} from "@/components/auth/auth-controls";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/or-divider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Inline form error. Sign-in failures are the user's next action, so they
  // stay on the panel rather than expiring in a toast.
  const [error, setError] = useState<string | null>(null);
  // Set when sign-in failed only because the address is unverified — lets the
  // alert offer a resend instead of dead-ending.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  // Carried into the Sign up link so a guest mid-booking who creates an
  // account still lands back on their filled wizard afterwards.
  const [redirectParam, setRedirectParam] = useState<string | null>(null);

  // Surface redirect errors handed back by the auth callback (e.g. an OAuth
  // user with no portal role), then clean them out of the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL (external system), client-only
    setRedirectParam(params.get("redirect"));
    const err = params.get("error");
    if (err === "no_access") {
      setError("This account isn't allowed to sign in to the portal.");
    } else if (err === "account_deactivated") {
      setError(
        "Your account has been deactivated. Contact your administrator to get it re-enabled."
      );
    } else if (err === "auth") {
      setError("We couldn't complete that sign-in link. Please try again.");
    }
    if (err) {
      // Clean the error out of the URL but keep a ?redirect= target alive.
      const keep = params.get("redirect");
      window.history.replaceState(
        {},
        "",
        keep ? `/login?redirect=${encodeURIComponent(keep)}` : "/login"
      );
    }
  }, []);

  async function resendVerification(targetEmail: string) {
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
    });
    if (resendError) {
      toast.error("Couldn't resend email", { description: resendError.message });
    } else {
      toast.success("Verification email sent — check your inbox.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverifiedEmail(null);

    const cleanEmail = email.trim();

    // Server-side brute-force gate BEFORE we touch auth. Generic message so a
    // locked state never reveals whether an email is registered.
    const gate = await guardLogin(cleanEmail);
    if (!gate.ok) {
      setLoading(false);
      setError("Too many attempts. Please wait a few minutes and try again.");
      return;
    }

    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signInError || !data.user) {
      // Log the failure so the sliding-window limiter can lock repeated abuse.
      void recordLogin(cleanEmail, false);
      setLoading(false);
      const code = signInError?.code ?? "";
      const msg = (signInError?.message ?? "").toLowerCase();

      if (code === "email_not_confirmed" || msg.includes("not confirmed")) {
        setUnverifiedEmail(cleanEmail);
        setError("Please verify your email address before signing in.");
      } else if (
        code === "invalid_credentials" ||
        msg.includes("invalid login credentials")
      ) {
        setError(
          "That email and password don't match an account. Check both and try again."
        );
      } else {
        setError(signInError?.message ?? "Sign in failed. Please try again.");
      }
      return;
    }

    // Successful auth — clears this email/IP toward the sliding-window limit.
    void recordLogin(cleanEmail, true);

    // Read the role to decide where to land. maybeSingle() returns null (no
    // error) when the row is genuinely absent, and an error only on a real
    // read failure — so we can tell "no access" apart from a transient glitch.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .maybeSingle<{ role: string | null; is_active: boolean | null }>();

    if (profileError) {
      // Transient read failure — keep the session, don't bounce the user.
      setLoading(false);
      setError(
        "We couldn't load your profile. Check your connection and try again."
      );
      return;
    }

    // Deactivated account → drop the session immediately, never land in a portal.
    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        "Your account has been deactivated. Contact your administrator to get it re-enabled."
      );
      return;
    }

    const role = profile?.role;

    if (role === "admin" || role === "employee" || role === "customer") {
      // Honour a safe ?redirect= target (e.g. a shared booking link) so the user
      // lands where they were headed; otherwise their role dashboard. Only same-
      // origin relative paths are allowed; the destination's own layout guards
      // the role. Full navigation so the server picks up the fresh session.
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      const safeRedirect = safeInternalPath(redirect);
      window.location.assign(
        safeRedirect ??
          (role === "admin"
            ? "/admin"
            : role === "employee"
              ? "/employee"
              : "/customer")
      );
      return;
    }

    // No recognised role — drop the session and explain.
    await supabase.auth.signOut();
    setLoading(false);
    setError("This account isn't allowed to sign in to the portal.");
  }

  return (
    <AuthShell screen="signin">
      <AuthHeading
        title="Welcome back"
        description="Use your work email to access the portal."
      />

      {error ? (
        <AuthAlert>
          {error}
          {unverifiedEmail ? (
            <button
              type="button"
              onClick={() => void resendVerification(unverifiedEmail)}
              className="mt-1.5 block font-medium underline underline-offset-2"
            >
              Resend the verification email
            </button>
          ) : null}
        </AuthAlert>
      ) : null}

      {redirectParam?.startsWith("/customer/book") ? (
        <div className="mb-5 flex items-start gap-3 rounded-[10px] border border-border bg-chip/60 px-4 py-3 text-[13px] leading-[1.5] text-brand-dark">
          <Plane className="mt-0.5 size-4 shrink-0 -rotate-45" />
          <span>
            Your booking details are saved. Sign in and we&apos;ll take you
            straight back to place the order.
          </span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </AuthField>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className={`text-[13.5px] ${authLinkClass}`}
          >
            Forgot password?
          </Link>
        </div>

        <AuthSubmit loading={loading} loadingLabel="Signing in…">
          Sign in
        </AuthSubmit>
      </form>

      <div className="my-7">
        <OrDivider />
      </div>

      <GoogleButton />

      <p className="mt-8 text-[13.5px] text-slate-500">
        Don&apos;t have an account yet?{" "}
        <Link
          href={
            redirectParam
              ? `/signup?redirect=${encodeURIComponent(redirectParam)}`
              : "/signup"
          }
          className={authLinkClass}
        >
          Sign up now
        </Link>
      </p>
    </AuthShell>
  );
}
