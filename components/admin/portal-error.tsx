"use client";

import { Btn, Card, Screen } from "@/components/admin/ui";
import { WarningIcon } from "@/components/admin/icons";

/**
 * What a person sees when a screen inside a portal throws.
 *
 * Two things it deliberately does NOT do: show the error message, and blame
 * them. Production strips server-side detail anyway, and a stack trace on a
 * customer's screen is a leak rather than a help. What it does give is the
 * digest — the one handle that ties this exact failure to the server log — so
 * a support conversation can start with a fact instead of "it broke".
 *
 * `reset()` re-renders the segment without a full page load, which is usually
 * enough for a transient fetch failure.
 */
export function PortalError({
  digest,
  reset,
  homeHref,
}: {
  digest?: string;
  reset: () => void;
  homeHref: string;
}) {
  return (
    <Screen width={720}>
      <Card>
        <div className="flex flex-col items-start gap-4 px-6 py-8">
          <span className="bg-warn-bg text-warn-ink flex size-11 items-center justify-center rounded-full">
            <WarningIcon size={22} />
          </span>

          <div className="flex flex-col gap-2">
            <h1 className="text-ink-800 m-0 text-[19px] leading-[1.5] font-medium">
              This screen didn&apos;t load
            </h1>
            <p className="text-ink-600 m-0 max-w-[52ch] text-[13.5px] leading-[1.6] font-normal text-pretty">
              Something went wrong on our side, not yours. Trying again usually
              works — it&apos;s often a dropped connection rather than a real
              fault.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Btn variant="ember" onClick={reset}>
              Try again
            </Btn>
            <Btn as="link" href={homeHref}>
              Back to safety
            </Btn>
          </div>

          {digest ? (
            <p className="text-ink-quiet border-line-soft m-0 w-full border-t pt-4 text-[11.5px] font-normal">
              If it keeps happening, quote this to support:{" "}
              <span className="text-ink-600 font-medium tabular-nums">
                {digest}
              </span>
            </p>
          ) : null}
        </div>
      </Card>
    </Screen>
  );
}
