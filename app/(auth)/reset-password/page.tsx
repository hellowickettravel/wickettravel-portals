"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { IconChip } from "@/components/ui/icon-chip";
import { PasswordInput } from "@/components/portal/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { AuthShell, AuthHeading } from "@/components/auth/auth-shell";
import { checkPassword, MIN_PASSWORD_LENGTH } from "@/lib/security/password";

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
      eyebrow="Wicket Travel"
      headline="A new password, and you're back in."
      lede="Reset links are single-use, which is exactly why they're safe."
    >
      {status === "verifying" ? (
        /* ---------- Verifying the recovery link ---------- */
        <div className="flex flex-col items-start gap-3 py-6">
          <Loader2 className="size-6 animate-spin text-ocean" />
          <p className="text-[14.5px] leading-[1.6] text-tx-muted">
            Checking your reset link…
          </p>
        </div>
      ) : status === "invalid" ? (
        /* ---------- Invalid / expired link ---------- */
        <>
          <IconChip tone="ruby">
            <ShieldAlert />
          </IconChip>
          <h1 className="mt-5 text-[25px] leading-[1.26] font-bold tracking-heading text-tx-head">
            That link has expired
          </h1>
          <p className="mt-3.5 text-[14.5px] leading-[1.6] text-tx-muted">
            Reset links work once and only for a short while. Request a fresh
            one from the sign-in screen and it will land in your inbox.
          </p>
          <Button
            variant="accent"
            className="mt-8 w-full"
            render={<Link href="/login" />}
          >
            Back to sign in
          </Button>
          <p className="mt-5 text-[13px] leading-[1.5] text-tx-faint">
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
            <FieldGroup>
              <Field
                label="New password"
                htmlFor="password"
                required
                error={errors.password}
              >
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={errors.password ? true : undefined}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  disabled={loading}
                />
                <PasswordStrength password={password} />
              </Field>

              <Field
                label="Confirm new password"
                htmlFor="confirm"
                required
                error={errors.confirm}
              >
                <PasswordInput
                  id="confirm"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={errors.confirm ? true : undefined}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  disabled={loading}
                />
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              disabled={loading}
              variant="accent"
              className="mt-8 w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Updating…
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>

          <p className="mt-6 text-[14.5px] leading-[1.6] text-tx-muted">
            Remembered it?{" "}
            <Link
              href="/login"
              className="font-semibold text-ocean underline-offset-[3px] transition-colors duration-150 ease-brand hover:underline"
            >
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
