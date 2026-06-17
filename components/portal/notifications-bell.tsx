"use client";

import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Topbar notifications affordance. UI scaffolding only — there is no real
 * notification data yet. `count` drives the unread badge (hidden when zero);
 * the panel shows an empty state until Batch 3 wires it to Supabase.
 */
export function NotificationsBell({
  count = 0,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-brand/25",
          className
        )}
      >
        <Bell className="size-[18px]" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <div className="border-b border-border px-3.5 py-2.5">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-9 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-chip text-brand-dark">
            <Bell className="size-5" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No new notifications
          </p>
          <p className="text-xs text-muted-foreground">You&apos;re all caught up.</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
