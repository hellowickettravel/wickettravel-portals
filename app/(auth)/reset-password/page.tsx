"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plane, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/portal/password-input";
import { AuthAside } from "@/components/auth/auth-aside";
import { AuthFooter } from "@/components/auth/auth-footer";

const MIN_PASSWORD = 8;

type RecoveryStatus = "verifying" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RecoveryStatus>("verifying");

  // Only allow a password change inside a genuine recovery flow. We mark the
  // page "ready" when EITHER the PKCE recovery code exchanges successfully OR
  // Supabase emits a PASSWORD_RECOVERY event (hash-token flow). A user who lands
  // here with no recovery link — including an already-logged-in user — stays
  // "invalid" and never sees the form, so we can't silently re-password them.
  useEffect(() => {
    const supabase = createClient();
    let resolved = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        resolved = true;
        setStatus("ready");
      }
    });

    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (!error) {
            resolved = true;
            setStatus("ready");
          } else if (!resolved) {
            setStatus("invalid");
          }
        })
        .catch(() => {
          if (!resolved) setStatus("invalid");
        });
    } else {
      // No PKCE code in the URL. Give the hash-token flow a brief moment to fire
      // PASSWORD_RECOVERY; if nothing arrives, treat the link as invalid.
      const timer = setTimeout(() => {
        if (!resolved) setStatus("invalid");
      }, 1200);
      return () => {
        clearTimeout(timer);
        sub.subscription.unsubscribe();
      };
    }

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (status !== "ready") return;

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
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      toast.error("Couldn't update password", {
        description: error.message,
      });
      return;
    }

    // Drop the recovery session so the new password is required on next sign-in.
    await supabase.auth.signOut();
    toast.success("Password updated — please sign in.");
    window.location.assign("/login");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.2fr_1fr]">
      <AuthAside
        headline="Reset your password securely."
        supporting="Choose a new password to get back into your Wicket workspace."
      />

      <section className="relative flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="size-5 -rotate-45" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-navy">
              Wicket
            </span>
          </div>

          {status === "verifying" ? (
            /* ---------- Verifying the recovery link ---------- */
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="size-6 animate-spin text-brand" />
              <p className="text-sm text-slate-500">Verifying your reset link…</p>
            </div>
          ) : status === "invalid" ? (
            /* ---------- Invalid / expired link ---------- */
            <div className="text-center">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <ShieldAlert className="size-7" />
              </div>
              <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-navy">
                Reset link invalid or expired
              </h2>
              <p className="mt-3 text-sm text-slate-500">
                This password reset link is no longer valid. Reset links can only
                be used once and expire after a short time. Please request a new
                one.
              </p>
              <Link
                href="/login"
                className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-white shadow-sm shadow-orange/25 transition-all duration-150 hover:bg-orange-dark hover:shadow-md hover:shadow-orange/30 hover:-translate-y-px"
              >
                Back to sign in
              </Link>
              <p className="mt-5 text-xs text-slate-500">
                On the sign-in screen, use “Forgot password?” to get a fresh link.
              </p>
            </div>
          ) : (
            /* ---------- Valid recovery session → set new password ---------- */
            <>
              <p className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Reset password
              </p>
              <h2 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-tight text-navy">
                Set a new password
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Enter and confirm your new password below.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="font-label text-xs font-medium uppercase tracking-wider text-slate-600"
                  >
                    New password
                  </Label>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={MIN_PASSWORD}
                    disabled={loading}
                    className="h-11 rounded-[10px] bg-neutral-soft"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirm"
                    className="font-label text-xs font-medium uppercase tracking-wider text-slate-600"
                  >
                    Confirm new password
                  </Label>
                  <PasswordInput
                    id="confirm"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={MIN_PASSWORD}
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
                      Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Back to{" "}
                <Link
                  href="/login"
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
