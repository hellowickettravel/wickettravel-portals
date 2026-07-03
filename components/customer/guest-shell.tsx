import Link from "next/link";
import { Plane } from "lucide-react";
import { BOOK_PATH } from "@/lib/orders/book-link";

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
      <header className="sticky top-0 z-30 border-b border-outline bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-orange/30">
              <Plane className="size-5 -rotate-45" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              Wicket
            </span>
          </span>
          <nav className="flex items-center gap-2">
            <Link
              href={signInHref}
              className="flex h-10 items-center rounded-[10px] px-3.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href={signUpHref}
              className="flex h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-orange/25 transition-all duration-150 hover:bg-orange-dark hover:shadow-md hover:shadow-orange/30"
            >
              Sign up free
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-16 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
