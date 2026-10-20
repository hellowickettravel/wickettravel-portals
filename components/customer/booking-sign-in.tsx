"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { guardLogin, recordLogin } from "@/lib/actions/auth-guard";
import { setKeepSignedIn } from "@/lib/auth/session-persistence";
import { Sheet, SheetFoot, SheetHead } from "@/components/admin/sheet";
import { Btn, Field, FieldLabel, focusRing, inputClass } from "@/components/admin/ui";
import { LockIcon, MailIcon } from "@/components/admin/icons";
import { cn } from "@/lib/utils";

/**
 * Sign-in popup for the booking wizard. A signed-out visitor who presses send
 * with an email that already has an account signs in here, on top of their
 * filled wizard, and the booking goes straight through — no trip to /login,
 * nothing retyped. Same checks as the login page: the server-side brute-force
 * gate, deactivated accounts refused, and only a customer account can book.
 */
export function BookingSignIn({
  open,
  email,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  email: string;
  onClose: () => void;
  /** Called once the session exists and belongs to an active customer. */
  onSignedIn: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);

  function close() {
    if (busy) return;
    setPassword("");
    setError(null);
    setUnverified(false);
    onClose();
  }

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    setError(null);
    setUnverified(false);

    const gate = await guardLogin(email);
    if (!gate.ok) {
      setBusy(false);
      setError("Too many attempts. Please wait a few minutes and try again.");
      return;
    }

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      void recordLogin(email, false);
      setBusy(false);
      const code = signInError?.code ?? "";
      const msg = (signInError?.message ?? "").toLowerCase();
      if (code === "email_not_confirmed" || msg.includes("not confirmed")) {
        setUnverified(true);
        setError("Please verify your email address before signing in.");
      } else if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
        setError("That password doesn't match this account. Try again, or reset it.");
      } else {
        setError(signInError?.message ?? "Sign in failed. Please try again.");
      }
      return;
    }

    void recordLogin(email, true);
    setKeepSignedIn(true);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .maybeSingle<{ role: string | null; is_active: boolean | null }>();

    if (profileError) {
      setBusy(false);
      setError("We couldn't load your account. Check your connection and try again.");
      return;
    }
    if (profile?.is_active === false || profile?.role !== "customer") {
      await supabase.auth.signOut();
      setBusy(false);
      setError(
        profile?.is_active === false
          ? "This account has been deactivated. Please contact us to re-enable it."
          : "This email belongs to a staff account, which can't place a booking. Use a different email."
      );
      return;
    }

    setBusy(false);
    setPassword("");
    onSignedIn();
  }

  async function resend() {
    const { error: resendError } = await createClient().auth.resend({
      type: "signup",
      email,
    });
    setError(
      resendError
        ? `Couldn't resend the email: ${resendError.message}`
        : "Verification email sent — check your inbox, then sign in here."
    );
  }

  return (
    <Sheet open={open} onClose={close} labelledBy="book-signin-title" width={460}>
      <form onSubmit={signIn} className="flex min-h-0 flex-col">
        <SheetHead
          icon={<LockIcon size={18} />}
          title="You already have an account"
          subtitle="Sign in to send this booking. Everything you've filled in is kept."
          titleId="book-signin-title"
          onClose={close}
        />
        <div className="flex flex-col gap-4 overflow-y-auto p-[20px_24px]">
          <Field>
            <FieldLabel htmlFor="book-signin-email" icon={<MailIcon size={15} />}>
              Email
            </FieldLabel>
            <input
              id="book-signin-email"
              type="email"
              value={email}
              readOnly
              className={cn(inputClass, "bg-surface-2 text-ink-600")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="book-signin-password" icon={<LockIcon size={15} />}>
              Password
            </FieldLabel>
            <input
              id="book-signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error && !unverified) setError(null);
              }}
              className={cn(inputClass, focusRing, error && !unverified && "border-danger-edge")}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-danger-ink m-0 text-[12px] leading-[1.45] font-medium">
              {error}{" "}
              {unverified ? (
                <button
                  type="button"
                  onClick={resend}
                  className="text-marine-600 cursor-pointer border-0 bg-transparent p-0 font-medium underline"
                >
                  Resend the verification email
                </button>
              ) : null}
            </p>
          ) : null}
          <Link
            href="/forgot-password"
            target="_blank"
            className="text-marine-600 self-start text-[12px] font-medium"
          >
            Forgot your password?
          </Link>
        </div>
        <SheetFoot note="Wrong email? Close this and change it on the form.">
          <Btn onClick={close} disabled={busy}>
            Cancel
          </Btn>
          <Btn variant="ember" type="submit" pending={busy}>
            Sign in & send
          </Btn>
        </SheetFoot>
      </form>
    </Sheet>
  );
}
