"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons/google";

export function GoogleButton({
  label = "Continue with Google",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    const supabase = createClient();
    // Keep the pending destination (e.g. a half-filled booking wizard) alive
    // through the OAuth round-trip — the callback honours a safe ?next=.
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    const next =
      redirect && redirect.startsWith("/") && !redirect.startsWith("//")
        ? `?next=${encodeURIComponent(redirect)}`
        : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback${next}` },
    });

    // On success the browser is redirected to Google, so we only land here on error.
    if (error) {
      setLoading(false);
      toast.error("Google sign-in unavailable", {
        description: error.message,
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={loading}
      className="border-ink-300 text-ink-900 hover:border-ink-400 hover:bg-ink-100 focus:border-marine-500 flex h-12 w-full items-center justify-center gap-3 rounded-full border bg-white text-[15px] font-semibold tracking-[-0.008em] outline-none [transition:background-color_140ms_ease,border-color_140ms_ease] focus:shadow-[0_0_0_3px_var(--color-marine-200)] disabled:pointer-events-none disabled:opacity-[0.62]"
    >
      <GoogleIcon className="block size-[19px]" />
      {loading ? "Redirecting…" : label}
    </button>
  );
}
