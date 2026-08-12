import Link from "next/link";
import { Card } from "@/components/admin/ui";

/**
 * A numbered explainer above a queue.
 *
 * The Parents Tickets screens are the only part of this product an admin can
 * open and find genuinely empty — matches and payments both exist only as a
 * consequence of decisions taken on OTHER screens, so a new admin lands on a
 * blank table with no way to tell whether the feature is broken, unbuilt, or
 * simply waiting on them. The empty state said where rows come from, but it
 * disappears the moment one row exists, which is exactly when the workflow is
 * least obvious.
 *
 * This stays. It is three sentences and a link, and it is the difference
 * between "this page does nothing" and "this page is step 3 of 4".
 */
export function HowItWorks({
  title,
  steps,
  cta,
}: {
  title: string;
  /** Three or four steps. More than that is documentation, not a hint. */
  steps: { label: string; body: string }[];
  cta?: { href: string; label: string };
}) {
  return (
    <Card className="bg-marine-wash border-marine-line">
      <div className="flex flex-col gap-4 px-5 py-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-ink-800 m-0 text-[13px] font-semibold tracking-[-0.008em]">
            {title}
          </h2>
          {cta ? (
            <Link
              href={cta.href}
              className="text-marine-600 text-[12.5px] font-medium whitespace-nowrap"
            >
              {cta.label} →
            </Link>
          ) : null}
        </div>
        <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4 p-0">
          {steps.map((s, i) => (
            <li key={s.label} className="flex min-w-0 items-start gap-3">
              <span className="bg-marine-500 flex size-[22px] flex-none items-center justify-center rounded-full text-[11px] font-semibold text-white tabular-nums">
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-ink-800 text-[12.5px] font-semibold">
                  {s.label}
                </span>
                <span className="text-ink-600 text-[12px] leading-[1.5] font-normal text-pretty">
                  {s.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
