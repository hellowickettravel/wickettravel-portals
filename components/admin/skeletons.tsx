import { Card, Screen, TableSkeleton } from "@/components/admin/ui";

/**
 * Route-level loading shapes.
 *
 * One generic skeleton for a whole portal is worse than none: it shows a KPI
 * grid on a screen that has no KPIs, so the layout jumps the moment real
 * content lands. Each of these mirrors the shape its route actually settles
 * into, so the skeleton is a preview rather than a placeholder.
 *
 * All of them use the design's own pulse (`wt-pulse`), which the global
 * reduced-motion rule already neutralises.
 */

export function Bar({ w, h = 9 }: { w: number | string; h?: number }) {
  return (
    <span
      style={{ width: w, height: h }}
      className="bg-neutral-bg block animate-[wt-pulse_1.5s_ease-in-out_infinite] rounded-full"
    />
  );
}

function Head() {
  return (
    <div className="flex flex-col gap-2.5">
      <Bar w={208} h={22} />
      <Bar w={340} />
    </div>
  );
}

/** A list screen: title, filter chips, then a table. */
export function ListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <Screen>
      <Head />
      <Card>
        <div className="border-line-soft flex flex-wrap gap-2 border-b px-5 py-4">
          {[64, 78, 92, 70].map((w, i) => (
            <span
              key={i}
              style={{ width: w, animationDelay: `${i * 70}ms` }}
              className="bg-neutral-bg block h-[34px] animate-[wt-pulse_1.5s_ease-in-out_infinite] rounded-full"
            />
          ))}
        </div>
        <TableSkeleton rows={rows} />
      </Card>
    </Screen>
  );
}

/** A record screen: back link, header, then a two-column card grid. */
export function DetailSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <Screen>
      <Bar w={96} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <Bar w={168} h={22} />
          <Bar w={280} />
        </div>
        <div className="flex gap-3">
          <Bar w={104} h={40} />
          <Bar w={124} h={40} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 min-[760px]:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            style={{ animationDelay: `${i * 80}ms` }}
            className="border-line-base flex flex-col gap-3 rounded-[12px] border bg-white p-5 shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)]"
          >
            <Bar w={116} h={13} />
            <Bar w="92%" />
            <Bar w="74%" />
            <Bar w="60%" />
          </div>
        ))}
      </div>
    </Screen>
  );
}

/** The two-pane inbox: a thread list beside a reading pane. */
export function InboxSkeleton() {
  return (
    <Screen width={1240}>
      <Head />
      <div className="grid grid-cols-1 gap-4 min-[940px]:grid-cols-[minmax(280px,340px)_1fr]">
        <Card>
          <div className="border-line-soft border-b px-4 py-3.5">
            <Bar w="100%" h={34} />
          </div>
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{ animationDelay: `${i * 70}ms` }}
                className="border-line-soft flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0"
              >
                <span className="bg-neutral-bg size-9 flex-none animate-[wt-pulse_1.5s_ease-in-out_infinite] rounded-full" />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Bar w="62%" />
                  <Bar w="84%" h={8} />
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="hidden min-h-[520px] min-[940px]:block">
          <div className="border-line-soft flex items-center gap-3 border-b px-5 py-4">
            <span className="bg-neutral-bg size-9 animate-[wt-pulse_1.5s_ease-in-out_infinite] rounded-full" />
            <Bar w={148} />
          </div>
          <div className="flex flex-col gap-4 p-5">
            {[68, 82, 55, 74].map((w, i) => (
              <span
                key={i}
                style={{
                  width: `${w}%`,
                  marginLeft: i % 2 ? "auto" : undefined,
                  animationDelay: `${i * 90}ms`,
                }}
                className="bg-neutral-bg block h-12 animate-[wt-pulse_1.5s_ease-in-out_infinite] rounded-[14px]"
              />
            ))}
          </div>
        </Card>
      </div>
    </Screen>
  );
}

/** A long sectioned form (the booking wizard, the listing form). */
export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <Screen>
      <Bar w={96} />
      <Head />
      {Array.from({ length: sections }).map((_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 90}ms` }}
          className="border-line-base flex flex-col gap-4 rounded-[12px] border bg-white p-5 shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)]"
        >
          <Bar w={140} h={13} />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {[0, 1, 2, 3].map((j) => (
              <span key={j} className="flex flex-col gap-2">
                <Bar w={88} h={8} />
                <Bar w="100%" h={40} />
              </span>
            ))}
          </div>
        </div>
      ))}
    </Screen>
  );
}
