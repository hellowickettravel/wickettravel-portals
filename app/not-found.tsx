import Link from "next/link";

/**
 * The public 404.
 *
 * It used to be built from the navy/orange homepage palette — Plus Jakarta
 * Sans, an orange `bg-primary` button, `text-navy` heading — which is the one
 * design system this product no longer renders anywhere a signed-in person can
 * reach. Every screen behind the login (and every auth screen in front of it)
 * is Marine / Ink / Ember, so landing on the old branding read as a different
 * website having gone wrong.
 *
 * `.admin-root` carries the interior's base layer (Instrument Sans, canvas,
 * link colour, focus ring), which is why this page wears it despite not being
 * a portal screen — the class is the design system, not the role.
 */
export default function NotFound() {
  return (
    <main className="admin-root bg-canvas flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex items-center gap-2.5">
        <span className="bg-ember-500 block size-2.5 flex-none rounded-full" />
        <span className="font-poppins text-ink-800 text-[15px] font-medium tracking-[-0.012em]">
          Wicket Travel
        </span>
      </span>

      <p className="text-ember-700 mt-12 text-[11px] font-medium tracking-[0.13em] uppercase">
        Error 404
      </p>
      <h1 className="font-poppins text-ink-880 m-0 mt-2 text-[clamp(22px,3vw,30px)] leading-[1.35] font-medium tracking-[-0.02em]">
        We couldn&apos;t find that page
      </h1>
      <p className="text-ink-600 m-0 mt-3 max-w-[46ch] text-[13.5px] leading-[1.6] font-normal text-pretty">
        The link may be out of date, or the record it pointed at has been
        removed. Signing in will take you to your own dashboard.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="bg-ember-600 hover:bg-ember-700 inline-flex h-10 items-center gap-2 rounded-full border-0 px-6 text-[13px] font-medium text-white no-underline hover:no-underline"
        >
          Go to sign in
        </Link>
        <Link
          href="/customer/book"
          className="border-line-field text-ink-800 hover:bg-surface-1 hover:border-ink-300 inline-flex h-10 items-center gap-2 rounded-full border bg-white px-5 text-[13px] font-medium no-underline hover:no-underline"
        >
          Book a flight
        </Link>
      </div>
    </main>
  );
}
