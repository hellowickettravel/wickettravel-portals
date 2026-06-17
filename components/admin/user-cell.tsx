import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserCell({
  name,
  sub,
  size = "default",
}: {
  name: string;
  sub?: string;
  size?: "sm" | "default";
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className={cn(size === "sm" ? "size-7" : "size-8")}>
        <AvatarFallback className="bg-chip text-[11px] font-semibold text-brand-dark">
          {initialsOf(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        {sub ? (
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}
