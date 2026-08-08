import { Card, Screen, TableSkeleton } from "@/components/admin/ui";

/**
 * Route-level fallback for /employee. Mirrors the shape every screen
 * settles into — page head, the four-up KPI row, then a table — using the
 * design's own pulse rather than the portals' shared skeletons.
 */
function Bar({ w, h = 9 }: { w: number | string; h?: number }) {
  return (
    <span
      style={{ width: w, height: h }}
      className="bg-neutral-bg block animate-[wt-pulse_1.5s_ease-in-out_infinite] rounded-full"
    />
  );
}

export default function Loading() {
  return (
    <Screen>
      <div className="flex flex-col gap-2.5">
        <Bar w={208} h={22} />
        <Bar w={320} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ animationDelay: `${i * 90}ms` }}
            className="border-line-base flex flex-col gap-3 rounded-[12px] border bg-white p-5 shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)]"
          >
            <span className="bg-neutral-bg block size-9 animate-[wt-pulse_1.5s_ease-in-out_infinite] rounded-[10px]" />
            <Bar w={96} />
            <Bar w={64} h={18} />
            <Bar w="80%" />
          </div>
        ))}
      </div>

      <Card>
        <div className="border-line-soft border-b px-5 py-4">
          <Bar w={132} h={14} />
        </div>
        <TableSkeleton rows={6} />
      </Card>
    </Screen>
  );
}
