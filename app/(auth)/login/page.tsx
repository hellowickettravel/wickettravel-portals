"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plane, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { guardLogin, recordLogin } from "@/lib/actions/auth-guard";
import { safeInternalPath } from "@/lib/security/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/portal/password-input";
import { AuthAside } from "@/components/auth/auth-aside";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/or-divider";
import { AuthFooter } from "@/components/auth/auth-footer";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
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
      toast.error("No portal access", {
        description: "This account isn't allowed to sign in to the portal.",
      });
    } else if (err === "account_deactivated") {
      toast.error("Account deactivated", {
        description: "Your account has been deactivated. Contact your administrator.",
      });
    } else if (err === "auth") {
      toast.error("Sign in link failed", {
        description: "We couldn't complete that link. Please try again.",
      });
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
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
    });
    if (error) {
      toast.error("Couldn't resend email", { description: error.message });
    } else {
      toast.success("Verification email sent — check your inbox.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim();

    // Server-side brute-force gate BEFORE we touch auth. Generic message so a
    // locked state never reveals whether an email is registered.
    const gate = await guardLogin(cleanEmail);
    if (!gate.ok) {
      setLoading(false);
      toast.error("Too many attempts", {
        description: "Please wait a few minutes and try again.",
      });
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data.user) {
      // Log the failure so the sliding-window limiter can lock repeated abuse.
      void recordLogin(cleanEmail, false);
      setLoading(false);
      const code = error?.code ?? "";
      const msg = (error?.message ?? "").toLowerCase();

      if (code === "email_not_confirmed" || msg.includes("not confirmed")) {
        toast.error("Please verify your email first.", {
          description: "Check your inbox for the verification link.",
          action: {
            label: "Resend",
            onClick: () => void resendVerification(email.trim()),
          },
        });
      } else if (
        code === "invalid_credentials" ||
        msg.includes("invalid login credentials")
      ) {
        toast.error("Invalid email or password.");
      } else {
        toast.error("Sign in failed", {
          description: error?.message ?? "Please try again.",
        });
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
      toast.error("Couldn't load your profile", {
        description: "Please check your connection and try again.",
      });
      return;
    }

    // Deactivated account → drop the session immediately, never land in a portal.
    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Account deactivated", {
        description: "Your account has been deactivated. Contact your administrator.",
      });
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
    toast.error("No portal access", {
      description: "This account isn't allowed to sign in to the portal.",
    });
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Enter your email first", {
        description: "Type your email above, then tap “Forgot password?”.",
      });
      return;
    }

    if (sendingReset) return; // guard against a double-tap firing two emails

    setSendingReset(true);
    const supabase = createClient();
    // Supabase only sends the email if the account exists. We always show the
    // same neutral message so we never reveal whether an email is registered.
    await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);

    toast.success("If an account exists for that email, a reset link has been sent.");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.2fr_1fr]">
      <AuthAside />

      {/* ===================== RIGHT / FORM PANEL ===================== */}
      <section className="relative flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
          {/* Mobile brand (left panel hidden on small screens) */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="size-5 -rotate-45" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-navy">
              Wicket
            </span>
          </div>

          <p className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Sign in
          </p>
          <h2 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-tight text-navy">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage chats and orders.
          </p>

          {redirectParam?.startsWith("/customer/book") ? (
            <div className="mt-5 flex items-start gap-2.5 rounded-[10px] border border-outline bg-chip/60 px-3.5 py-3 text-sm text-brand-dark">
              <Plane className="mt-0.5 size-4 shrink-0 -rotate-45" />
              <span>
                Your booking details are saved. Sign in and we&apos;ll take you
                straight back to place the order.
              </span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                placeholder="you@wicket.co.uk"
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
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-[10px] bg-neutral-soft"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={sendingReset || loading}
                  className="text-xs font-medium text-brand transition-colors hover:text-brand-dark disabled:opacity-50"
                >
                  {sendingReset ? "Sending…" : "Forgot password?"}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-[10px] bg-primary text-sm font-semibold text-white shadow-sm shadow-orange/25 transition-all duration-150 hover:bg-orange-dark hover:shadow-md hover:shadow-orange/30 hover:-translate-y-px"
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

          <div className="my-6">
            <OrDivider />
          </div>

          <GoogleButton />

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href={
                redirectParam
                  ? `/signup?redirect=${encodeURIComponent(redirectParam)}`
                  : "/signup"
              }
              className="font-medium text-brand transition-colors hover:text-brand-dark"
            >
              Sign up
            </Link>
          </p>
        </div>

        <AuthFooter />
      </section>
    </main>
  );
}
