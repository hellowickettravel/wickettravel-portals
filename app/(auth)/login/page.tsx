"use client";

import { useState } from "react";
import Link from "next/link";
import { Plane, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthAside } from "@/components/auth/auth-aside";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/or-divider";
import { AuthFooter } from "@/components/auth/auth-footer";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      setLoading(false);
      const code = error?.code ?? "";
      const msg = (error?.message ?? "").toLowerCase();

      if (code === "email_not_confirmed" || msg.includes("not confirmed")) {
        toast.error("Please verify your email first.", {
          description: "Check your inbox for the verification link.",
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

    // Read the role to decide where to land.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single<{ role: string | null }>();

    const role = profile?.role;

    if (role === "admin" || role === "employee" || role === "customer") {
      // Full navigation so the server picks up the fresh session cookie.
      window.location.assign(
        role === "admin"
          ? "/admin"
          : role === "employee"
            ? "/employee"
            : "/customer"
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

    const supabase = createClient();
    // Supabase only sends the email if the account exists. We always show the
    // same neutral message so we never reveal whether an email is registered.
    await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    toast.success("If an account exists for that email, a reset link has been sent.");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.2fr_1fr]">
      <AuthAside />

      {/* ===================== RIGHT / FORM PANEL ===================== */}
      <section className="relative flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
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
              <Input
                id="password"
                type="password"
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
                  className="text-xs font-medium text-brand transition-colors hover:text-brand-dark"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-[10px] bg-brand text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-brand-dark hover:shadow-md hover:shadow-brand/20 hover:-translate-y-px"
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
              href="/signup"
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
