"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plane, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthAside } from "@/components/auth/auth-aside";
import { AuthFooter } from "@/components/auth/auth-footer";

const MIN_PASSWORD = 8;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Recovery links arrive as ?code=… (PKCE). Exchange it for a session so
  // updateUser() can set the new password. Auto-detection may also handle this;
  // exchanging again simply no-ops/errors harmlessly.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).catch(() => {
      /* already exchanged or invalid — handled on submit */
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

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

    toast.success("Password updated — please sign in.");
    window.location.assign("/login");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.2fr_1fr]">
      <AuthAside
        headline="Reset your password securely."
        supporting="Choose a new password to get back into your Wicket workspace."
      />

      <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="size-5 -rotate-45" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-navy">
              Wicket
            </span>
          </div>

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
                className="font-label text-[11px] font-medium uppercase tracking-wider text-slate-500"
              >
                New password
              </Label>
              <Input
                id="password"
                type="password"
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
                className="font-label text-[11px] font-medium uppercase tracking-wider text-slate-500"
              >
                Confirm new password
              </Label>
              <Input
                id="confirm"
                type="password"
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
              className="h-11 w-full rounded-[10px] bg-brand text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
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

          <AuthFooter />
        </div>
      </section>
    </main>
  );
}
