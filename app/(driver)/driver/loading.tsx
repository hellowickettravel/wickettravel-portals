import { Skeleton } from "@/components/ui/skeleton";

/** Route-transition fallback for driver screens — mirrors the card rhythm. */
export default function DriverLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-40" />
      </div>
      <Skeleton className="h-16 w-full rounded-card" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-20 w-full rounded-card" />
    </div>
  );
}
