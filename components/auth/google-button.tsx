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
      variant="secondary"
      onClick={handleGoogle}
      disabled={loading}
      className="w-full"
    >
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <GoogleIcon className="size-[18px]" />
      )}
      {label}
    </Button>
  );
}
