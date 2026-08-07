"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthAlert } from "@/components/auth/auth-alert";
import {
  AuthField,
  AuthLabel,
  AuthSecondaryButton,
  AuthSubmit,
  authLinkClass,
} from "@/components/auth/auth-controls";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { checkPassword, MIN_PASSWORD_LENGTH } from "@/lib/security/password";

type RecoveryStatus = "verifying" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        .then(({ error: exchangeError }) => {
          if (!exchangeError) {
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
    setError(null);

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
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    // Drop the recovery session so the new password is required on next sign-in.
    await supabase.auth.signOut();
    toast.success("Password updated — please sign in.");
    window.location.assign("/login");
  }

  // ---------- Verifying the recovery link ----------
  if (status === "verifying") {
    return (
      <AuthShell screen="reset">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="border-ink-300 border-t-marine-500 size-6 animate-spin rounded-full border-2" />
          <p className="text-ink-500 text-[13.5px] font-normal">
            Verifying your reset link…
          </p>
        </div>
      </AuthShell>
    );
  }

  // ---------- Invalid / expired link ----------
  if (status === "invalid") {
    return (
      <AuthShell screen="reset">
        <span className="bg-alert-bg mb-6 flex size-16 items-center justify-center rounded-full">
          <span className="bg-alert-ink block size-4 rounded-full" />
        </span>
        <AuthHeading title="This link has expired" dot={false} />
        <p className="text-ink-600 mb-8 text-[15px] leading-[1.6] font-normal">
          Reset links can only be used once and stop working after 60 minutes.
          Request a fresh one and we&apos;ll send another straight away.
        </p>

        <AuthSecondaryButton href="/forgot-password">
          Request a new link
        </AuthSecondaryButton>

        <p className="text-ink-600 mt-7 text-[13.5px] font-normal">
          <Link href="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  // ---------- Valid recovery session → set new password ----------
  return (
    <AuthShell screen="reset">
      <AuthHeading
        title="Set a new password"
        dot={false}
        description="Choose something you haven't used on this account before."
      />

      {error ? <AuthAlert>{error}</AuthAlert> : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <AuthField>
          <AuthLabel htmlFor="password">New password</AuthLabel>
          <AuthPasswordField
            id="password"
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={loading}
          />
          <PasswordChecklist password={password} />
        </AuthField>

        <AuthField>
          <AuthLabel htmlFor="confirm">Confirm new password</AuthLabel>
          <AuthPasswordField
            id="confirm"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={loading}
          />
        </AuthField>

        <AuthSubmit loading={loading} loadingLabel="Saving…">
          Save new password
        </AuthSubmit>
      </form>

      <p className="text-ink-600 mt-7 text-[13.5px] font-normal">
        <Link href="/login" className={authLinkClass}>
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
