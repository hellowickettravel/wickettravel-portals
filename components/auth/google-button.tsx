"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogle}
      disabled={loading}
      className="h-12 w-full gap-3 rounded-full border-border bg-white text-[15px] font-semibold tracking-[-0.008em] text-navy transition-colors hover:border-slate-400 hover:bg-neutral-soft"
    >
      {loading ? (
        <Loader2 className="size-[19px] animate-spin" />
      ) : (
        <GoogleIcon className="size-[19px]" />
      )}
      {label}
    </Button>
  );
}
