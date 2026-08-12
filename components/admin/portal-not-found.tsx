import Link from "next/link";
import { Btn, Card, Screen } from "@/components/admin/ui";
import { SearchIcon } from "@/components/admin/icons";

/**
 * The in-portal 404.
 *
 * Next renders the closest `not-found.tsx` inside its segment's layout, so this
 * keeps the sidebar, the top bar and the bell — a signed-in person following a
 * stale link lands on a Wicket screen with somewhere to go, instead of being
 * dropped out of the product onto the public error page. Pair it with the
 * segment's `[...notFound]` catch-all, which is what turns a URL matching no
 * route at all into a `notFound()` inside the portal rather than at the root.
 */
export function PortalNotFound({
  homeHref,
  homeLabel,
  links,
}: {
  homeHref: string;
  homeLabel: string;
  /** Two or three real destinations in this portal. */
  links: { href: string; label: string }[];
}) {
  return (
    <Screen width={720}>
      <Card>
        <div className="flex flex-col items-center px-6 pt-14 pb-12 text-center">
          <span className="bg-marine-50 text-marine-600 mb-4 flex size-11 items-center justify-center rounded-full">
            <SearchIcon size={20} />
          </span>
          <p className="text-ember-700 m-0 text-[11px] font-medium tracking-[0.13em] uppercase">
            Error 404
          </p>
          <h1 className="font-poppins text-ink-880 m-0 mt-2 text-[20px] leading-[1.4] font-medium tracking-[-0.02em]">
            That page isn&apos;t here
          </h1>
          <p className="text-ink-600 m-0 mt-2 mb-6 max-w-[44ch] text-[13px] leading-[1.6] font-normal text-pretty">
            The address doesn&apos;t match anything in the portal — usually an
            old bookmark, or a record that has since been deleted. Nothing is
            broken; pick a destination below.
          </p>
          <Btn as="link" href={homeHref} variant="ember">
            {homeLabel}
          </Btn>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-marine-600 text-[12.5px] font-medium"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </Card>
    </Screen>
  );
}
