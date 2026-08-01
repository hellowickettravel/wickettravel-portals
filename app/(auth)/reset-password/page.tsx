"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { IconChip } from "@/components/ui/icon-chip";
import { PasswordStrength } from "@/components/auth/password-strength";
import { AuthShell, AuthHeading } from "@/components/auth/auth-shell";
import {
  AuthField,
  AuthFieldGroup,
  AuthPasswordInput,
} from "@/components/auth/auth-field";
import { AuthSubmit, authSecondaryClassName } from "@/components/auth/auth-submit";
import { checkPassword, MIN_PASSWORD_LENGTH } from "@/lib/security/password";
import { cn } from "@/lib/utils";

type RecoveryStatus = "verifying" | "ready" | "invalid";

/** Which field, if any, the last submit attempt tripped on. */
type FieldErrors = Partial<Record<"password" | "confirm", string>>;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
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

    setErrors({});

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
    <AuthShell
      eyebrow="Wicket Travel Portal"
      headline="A new password, and you're back in."
    >
      {status === "verifying" ? (
        /* ---------- Verifying the recovery link ---------- */
        <div className="flex flex-col items-start gap-3 py-6">
          <Loader2 className="size-6 animate-spin text-marine" />
          <p className="text-[15.5px] leading-[1.6] text-tx-muted">
            Checking your reset link…
          </p>
        </div>
      ) : status === "invalid" ? (
        /* ---------- Invalid / expired link ---------- */
        <>
          <IconChip tone="ruby" className="size-12 [&_svg]:size-6">
            <ShieldAlert />
          </IconChip>
          <h1 className="font-display mt-6 text-[32px] text-tx-head sm:text-[36px]">
            That link has expired
          </h1>
          <p className="mt-3 text-[15.5px] leading-[1.6] text-tx-muted">
            Reset links work once and only for a short while. Request a fresh
            one from the sign-in screen and it will land in your inbox.
          </p>
          <Link href="/login" className={cn(authSecondaryClassName, "mt-8")}>
            Back to sign in
          </Link>
          <p className="mt-5 text-[13px] leading-[1.5] text-tx-muted">
            Use “Forgot password?” there to send yourself a new link.
          </p>
        </>
      ) : (
        /* ---------- Valid recovery session → set new password ---------- */
        <>
          <AuthHeading
            eyebrow="Reset password"
            title="Set a new password"
            lede="Choose something you haven't used here before."
          />

          <form onSubmit={handleSubmit}>
            <AuthFieldGroup>
              <AuthField
                label="New password"
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
                  minLength={MIN_PASSWORD_LENGTH}
                  disabled={loading}
                />
                <PasswordStrength password={password} />
              </AuthField>

              <AuthField
                label="Confirm new password"
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
                  minLength={MIN_PASSWORD_LENGTH}
                  disabled={loading}
                />
              </AuthField>
            </AuthFieldGroup>

            <AuthSubmit
              loading={loading}
              loadingLabel="Updating…"
              className="mt-8"
            >
              Update password
            </AuthSubmit>
          </form>

          <p className="mt-7 text-[14px] leading-[1.6] text-tx-muted">
            Remembered it?{" "}
            <Link
              href="/login"
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
