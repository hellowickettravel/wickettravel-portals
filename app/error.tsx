"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plane, RotateCcw } from "lucide-react";

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
      <div className="flex items-center gap-2.5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Plane className="size-5 -rotate-45" />
        </div>
        <span className="font-display text-xl font-semibold tracking-tight text-navy">
          Wicket
        </span>
      </div>

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
          className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-brand-dark hover:shadow-md hover:shadow-brand/20 hover:-translate-y-px"
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
