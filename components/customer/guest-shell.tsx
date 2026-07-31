import Link from "next/link";
import { BOOK_PATH } from "@/lib/orders/book-link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

/**
 * Minimal shell for the one public customer page (/customer/book) when nobody
 * is signed in: brand top bar + bounded content column. The wizard itself
 * handles routing through sign-in at submit time.
 */
export function GuestBookShell({ children }: { children: React.ReactNode }) {
  const signInHref = `/login?redirect=${encodeURIComponent(`${BOOK_PATH}?resume=1`)}`;
  const signUpHref = `/signup?redirect=${encodeURIComponent(`${BOOK_PATH}?resume=1`)}`;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-line-strong bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center">
            <BrandLogo variant="white" className="h-7 w-auto" priority />
          </span>
          <nav className="flex items-center gap-2">
            <Link
              href={signInHref}
              className="flex h-10 items-center rounded-[10px] px-3.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Button
              variant="accent"
              size="sm"
              render={<Link href={signUpHref} />}
            >
              Sign up free
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-16 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
