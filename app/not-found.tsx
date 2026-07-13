import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <BrandLogo className="h-9 w-auto" />

      <p className="mt-10 font-label text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Error 404
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-navy">
        Page not found
      </h1>
      <p className="mt-3 max-w-sm text-sm text-slate-500">
        The page you’re looking for doesn’t exist or may have moved. Let’s get
        you back on track.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-white shadow-sm shadow-orange/25 transition-all duration-150 hover:bg-orange-dark hover:shadow-md hover:shadow-orange/30 hover:-translate-y-px"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
    </main>
  );
}
