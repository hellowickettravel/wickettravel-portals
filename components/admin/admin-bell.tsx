"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import type { NotificationType } from "@/lib/db/types";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { shadowE3 } from "@/components/admin/ui";
import {
  BellIcon,
  ChatIcon,
  LifebuoyIcon,
  OrdersIcon,
  RefreshIcon,
  FamilyIcon,
  RouteIcon,
  StaffIcon,
  UnlockIcon,
} from "@/components/admin/icons";

const KEY = ["notifications"] as const;

/** Icon + tint per notification type, using the design's soft tint pairs. */
const LOOK: Record<
  NotificationType,
  { Icon: typeof BellIcon; chip: string }
> = {
  new_message: { Icon: ChatIcon, chip: "bg-marine-50 text-marine-600" },
  new_order: { Icon: OrdersIcon, chip: "bg-ok-wash text-ok-ink" },
  assignment: { Icon: StaffIcon, chip: "bg-violet-bg/60 text-violet-ink" },
  status_change: { Icon: RefreshIcon, chip: "bg-warn-wash text-warn-ink" },
  support_ticket: { Icon: LifebuoyIcon, chip: "bg-teal-bg/60 text-teal-ink" },
  parent_ticket: { Icon: FamilyIcon, chip: "bg-marine-50 text-marine-600" },
  listing_review: { Icon: RouteIcon, chip: "bg-warn-wash text-warn-ink" },
  match: { Icon: FamilyIcon, chip: "bg-violet-bg/60 text-violet-ink" },
  contact_released: { Icon: UnlockIcon, chip: "bg-ok-wash text-ok-ink" },
};

/**
 * The design's bell: a 40px square trigger with an ember unread badge, and a
 * 340px popover listing the five most recent notifications. Data, realtime and
 * read-state all reuse the portal's existing notification actions.
 */
export function AdminBell({ userId }: { userId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: KEY,
    queryFn: listMyNotifications,
    staleTime: 30_000,
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  // Live arrival — the design shows the count updating without a reload.
  useEffect(() => {
    const channel = supabase
      .channel(`admin-bell:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => qc.invalidateQueries({ queryKey: KEY })
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, qc]);

  // Click-away + Escape, matching the design's popover behaviour.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = (data?.items ?? []).slice(0, 5);
  const unread = data?.unreadCount ?? 0;

  return (
    <div ref={wrap} className="relative flex-none">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="border-line-field text-ink-700 hover:bg-surface-1 relative flex size-10 items-center justify-center rounded-[10px] border bg-white outline-none"
      >
        <BellIcon size={18} />
        {unread > 0 ? (
          <span className="bg-ember-600 absolute -top-[5px] -right-[5px] flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-white px-1 text-[11px] font-medium text-white tabular-nums">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "border-line-base absolute top-12 right-0 z-50 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-[12px] border bg-white",
            shadowE3
          )}
        >
          <div className="border-line-soft flex items-center justify-between gap-3 border-b px-4 py-3">
            <span className="text-[12.5px] font-medium">Notifications</span>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="text-marine-600 border-0 bg-transparent p-0 text-[11.5px] font-medium outline-none"
            >
              Mark all read
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-ink-500 m-0 px-4 py-6 text-center text-[12.5px]">
              Nothing yet. New orders, replies and assignments land here.
            </p>
          ) : (
            items.map((n) => {
              const look = LOOK[n.type] ?? LOOK.new_message;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.is_read) markOne.mutate(n.id);
                    setOpen(false);
                    if (n.link) router.push(n.link);
                  }}
                  className={cn(
                    "border-line-soft hover:bg-marine-50 flex w-full items-start gap-3 border-b px-4 py-3 text-left outline-none",
                    n.is_read ? "bg-white" : "bg-marine-50/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 flex-none items-center justify-center rounded-[9px]",
                      look.chip
                    )}
                  >
                    <look.Icon size={16} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-ink-800 text-[12.5px] leading-[1.45] font-normal text-pretty">
                      {n.body || n.title}
                    </span>
                    <span className="text-ink-500 text-[11px] font-normal">
                      {fmtRelative(n.created_at)}
                    </span>
                  </span>
                </button>
              );
            })
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/admin/notifications");
            }}
            className="text-marine-600 hover:bg-surface-1 block w-full border-0 bg-white px-4 py-3 text-[12.5px] font-medium outline-none"
          >
            View all notifications
          </button>
        </div>
      ) : null}
    </div>
  );
}
