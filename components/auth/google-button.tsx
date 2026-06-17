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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
      className="h-11 w-full rounded-[10px] border-border bg-white text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <GoogleIcon className="size-4" />
      )}
      {label}
    </Button>
  );
}
