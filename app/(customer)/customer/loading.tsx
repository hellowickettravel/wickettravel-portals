import { Card, Screen, TableSkeleton } from "@/components/admin/ui";

/**
 * The customer portal's route-level loading state, in the design's own
 * skeleton language: a pulsing title, four KPI blanks and a table body.
 */
export default function Loading() {
  return (
    <Screen width={1240}>
      <div className="flex animate-[wt-pulse_1.5s_ease-in-out_infinite] flex-col gap-3">
        <span className="bg-line-field block h-5 w-[220px] rounded-full" />
        <span className="bg-neutral-bg block h-3.5 w-[300px] rounded-full" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ animationDelay: `${i * 90}ms` }}
            className="border-line-base flex animate-[wt-pulse_1.5s_ease-in-out_infinite] flex-col gap-3 rounded-[12px] border bg-white p-5 shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)]"
          >
            <span className="bg-neutral-bg block size-9 rounded-[10px]" />
            <span className="bg-neutral-bg block h-2.5 w-[86px] rounded-full" />
            <span className="bg-line-field block h-5 w-[62px] rounded-full" />
          </div>
        ))}
      </div>

      <Card>
        <div className="border-line-soft flex animate-[wt-pulse_1.5s_ease-in-out_infinite] items-center border-b px-5 py-4">
          <span className="bg-line-field block h-3.5 w-[130px] rounded-full" />
        </div>
        <TableSkeleton rows={5} />
      </Card>
    </Screen>
  );
}
