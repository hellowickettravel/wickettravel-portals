import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Name cell used in every people-shaped table. */
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
        <AvatarFallback className="wt-avatar-fallback text-[11px] font-semibold">
          {initialsOf(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 leading-tight">
        <p className="wt-user-name m-0 truncate">{name}</p>
        {sub ? <p className="wt-user-sub m-0 truncate">{sub}</p> : null}
      </div>
    </div>
  );
}
