import { cn } from "@/lib/utils";

export type Tone = "blue" | "green" | "amber" | "red" | "slate" | "violet";

const TONE_BG: Record<Tone, string> = {
  blue: "bg-sky-tint text-ocean-deep",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-50 text-violet-700",
};

const TONE_DOT: Record<Tone, string> = {
  blue: "bg-ocean",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  slate: "bg-slate-400",
  violet: "bg-violet-500",
};

export function StatusBadge({
  tone = "slate",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_BG[tone],
        className
      )}
    >
      <span className={cn("size-[5px] rounded-full", TONE_DOT[tone])} />
      {children}
    </span>
  );
}

/** Map an order status to a badge tone. */
export function orderTone(status: string): Tone {
  switch (status) {
    case "Open":
    case "New":
      return "blue";
    case "In Progress":
    case "Pending":
      return "amber";
    case "Closed":
    case "Completed":
    case "Confirmed":
      return "green";
    case "Cancelled":
      return "red";
    default:
      return "slate";
  }
}
