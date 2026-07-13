"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

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

      <p className="mt-10 font-label text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Something went wrong
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-navy">
        Unexpected error
      </h1>
      <p className="mt-3 max-w-sm text-sm text-slate-500">
        Sorry — something broke while loading this page. You can try again, or
        head back home.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-white shadow-sm shadow-orange/25 transition-all duration-150 hover:bg-orange-dark hover:shadow-md hover:shadow-orange/30 hover:-translate-y-px"
        >
          <RotateCcw className="size-4" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-border bg-white px-5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
