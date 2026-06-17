import { StatCardsSkeleton, TableSkeleton } from "@/components/portal/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
      <StatCardsSkeleton count={3} />
      <TableSkeleton rows={4} columns={4} />
    </div>
  );
}
