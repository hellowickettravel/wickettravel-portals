import Link from "next/link";
import { BOOK_PATH } from "@/lib/orders/book-link";
import { btnEmber, btnGhost, btnMd } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * Minimal shell for the one public customer page (/customer/book) when nobody
 * is signed in: brand top bar + bounded content column. The wizard itself
 * handles routing through sign-in at submit time.
 *
 * `.admin-root` is the design system's scope, so the wizard inside inherits the
 * same typeface, canvas, focus ring and control sizing it has once the visitor
 * signs in — the page must not change shape underneath them at that moment.
 */
export function GuestBookShell({ children }: { children: React.ReactNode }) {
  const signInHref = `/login?redirect=${encodeURIComponent(`${BOOK_PATH}?resume=1`)}`;
  const signUpHref = `/signup?redirect=${encodeURIComponent(`${BOOK_PATH}?resume=1`)}`;

  return (
    <div className="admin-root bg-canvas min-h-dvh">
      <header className="border-line-soft sticky top-0 z-30 border-b bg-white/[0.88] backdrop-blur-[10px]">
        <div className="mx-auto flex h-16 max-w-[1000px] items-center justify-between gap-4 px-[clamp(16px,2.4vw,32px)]">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 no-underline hover:no-underline"
          >
            <span className="bg-ember-500 block size-2.5 flex-none rounded-full" />
            <span className="font-poppins text-ink-800 truncate text-[15px] font-medium tracking-[-0.012em]">
              Wicket Travel
            </span>
          </Link>

          <nav className="flex items-center gap-2.5">
            <Link
              href={signInHref}
              className={cn(btnMd, btnGhost, "no-underline hover:no-underline")}
            >
              Sign in
            </Link>
            <Link
              href={signUpHref}
              className={cn(btnMd, btnEmber, "no-underline hover:no-underline")}
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="om-scroll mx-auto w-full max-w-[1000px] px-[clamp(16px,2.4vw,32px)] pt-[clamp(20px,2.6vw,34px)] pb-16">
        {children}
      </main>
    </div>
  );
}
