import Link from "next/link";
import { Plane, ArrowLeft } from "lucide-react";

export default function NotFound() {
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
        className="mt-8 inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-brand-dark hover:shadow-md hover:shadow-brand/20 hover:-translate-y-px"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
    </main>
  );
}
