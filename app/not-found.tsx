import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <BrandLogo className="h-9 w-auto" />

      <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-marine">
        Error 404
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-tx-head">
        Page not found
      </h1>
      <p className="mt-3 max-w-sm text-sm text-tx-muted">
        The page you’re looking for doesn’t exist or may have moved. Let’s get
        you back on track.
      </p>

      <Button variant="accent" className="mt-8" render={<Link href="/" />}>
        <ArrowLeft />
        Back to home
      </Button>
    </main>
  );
}
