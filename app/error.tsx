"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for logging/monitoring; replace with a real reporter later.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <BrandLogo className="h-9 w-auto" />

      <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-marine">
        Something went wrong
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-tx-head">
        Unexpected error
      </h1>
      <p className="mt-3 max-w-sm text-sm text-tx-muted">
        Sorry — something broke while loading this page. You can try again, or
        head back home.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button type="button" variant="accent" onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
        <Button variant="outline" render={<Link href="/" />}>
          Back to home
        </Button>
      </div>
    </main>
  );
}
