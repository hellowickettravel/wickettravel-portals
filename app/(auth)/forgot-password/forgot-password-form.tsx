"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthSentHalo } from "@/components/auth/auth-sent-halo";
import {
  AuthField,
  AuthInput,
  AuthLabel,
  AuthSecondaryButton,
  AuthSubmit,
  authLinkClass,
} from "@/components/auth/auth-controls";

export function ForgotPasswordForm({
  initialSent = false,
}: {
  /** True when the page was opened at ?sent=1 — the design's "Sent" screen. */
  initialSent?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(initialSent);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return; // a double-tap must not fire two emails

    setLoading(true);
    const supabase = createClient();
    // Supabase only sends the email if the account exists, and applies its own
    // send rate limit. We ignore the result and always show the same neutral
    // confirmation so this page never reveals whether an email is registered.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setSent(true);
  }

  // ---------- Link sent ----------
  if (sent) {
    return (
      <AuthShell screen="sent">
        <AuthSentHalo />
        <AuthHeading title="Check your email" dot={false} />
        <p className="text-ink-600 mb-4 text-[15px] leading-[1.6] font-normal">
          If an account exists for that address, a link is on its way. It
          expires in 60 minutes and can only be used once.
        </p>
        <p className="text-ink-500 mb-8 text-[13.5px] leading-[1.55] font-normal">
          Nothing arrived? Check the spam folder before requesting another —
          repeated requests are rate limited.
        </p>

        <AuthSecondaryButton onClick={() => setSent(false)}>
          Send it again
        </AuthSecondaryButton>

        <p className="text-ink-600 mt-7 text-[13.5px] font-normal">
          <Link href="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  // ---------- Request a link ----------
  return (
    <AuthShell screen="forgot">
      <AuthHeading
        title="Reset password"
        description="Enter the email address on your account and we'll send a link to set a new password."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthField>
          <AuthLabel htmlFor="email">Email address</AuthLabel>
          <AuthInput
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </AuthField>

        <AuthSubmit loading={loading} loadingLabel="Sending…">
          Send reset link
        </AuthSubmit>
      </form>

      <p className="text-ink-600 mt-7 text-[13.5px] font-normal">
        Remembered it?{" "}
        <Link href="/login" className={authLinkClass}>
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
