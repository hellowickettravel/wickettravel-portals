import { StatCardsSkeleton, TableSkeleton } from "@/components/portal/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <StatCardsSkeleton />
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
