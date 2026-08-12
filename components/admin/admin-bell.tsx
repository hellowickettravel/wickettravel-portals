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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Shimmer, shadowE3 } from "@/components/admin/ui";
import {
  BellIcon,
  ChatIcon,
  CheckIcon,
  LifebuoyIcon,
  OrdersIcon,
  RefreshIcon,
  FamilyIcon,
  RouteIcon,
  StaffIcon,
  UnlockIcon,
} from "@/components/admin/icons";

import type { Notification } from "@/lib/db/types";

const KEY = ["notifications"] as const;
const ALL_KEY = ["notifications", "all"] as const;

/** How far back the popover reaches before it starts calling things "earlier". */
const RECENT_MS = 24 * 60 * 60 * 1000;

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
 * One band of the popover ("Last 24 hours" / "Earlier"). Renders nothing when
 * empty, so the headings only appear once there is something under them.
 *
 * Each row is a link to the record AND carries its own tick. Opening a
 * notification has always marked it read as a side effect, but there was no
 * way to clear one you had already dealt with elsewhere without navigating to
 * it — which is why the badge kept counting things people had handled.
 */
function Group({
  label,
  items,
  onOpen,
  onMarkRead,
}: {
  label: string;
  items: Notification[];
  onOpen: (n: Notification) => void;
  onMarkRead: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <span className="text-ink-tertiary bg-surface-2 border-line-soft sticky top-0 z-10 block border-b px-4 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase">
        {label}
      </span>
      {items.map((n) => {
        const look = LOOK[n.type] ?? LOOK.new_message;
        return (
          <div
            key={n.id}
            className={cn(
              "border-line-soft hover:bg-marine-50 group relative flex items-start gap-3 border-b px-4 py-3 transition-colors",
              n.is_read ? "bg-white" : "bg-marine-50/60"
            )}
          >
            <button
              type="button"
              onClick={() => onOpen(n)}
              className="flex min-w-0 flex-1 items-start gap-3 border-0 bg-transparent p-0 text-left outline-none"
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
                <span
                  className={cn(
                    "text-ink-800 text-[12.5px] leading-[1.45] text-pretty",
                    n.is_read ? "font-normal" : "font-medium"
                  )}
                >
                  {n.body || n.title}
                </span>
                <span className="text-ink-500 text-[11px] font-normal">
                  {fmtRelative(n.created_at)}
                </span>
              </span>
            </button>
            {!n.is_read ? (
              <button
                type="button"
                title="Mark as read"
                aria-label="Mark as read"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(n.id);
                }}
                className="border-line-field text-ink-500 hover:border-ok-edge hover:text-ok-ink mt-0.5 flex size-[22px] flex-none items-center justify-center self-start rounded-full border bg-white opacity-0 outline-none group-hover:opacity-100 focus-visible:opacity-100"
              >
                <CheckIcon size={12} width={3} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The design's bell: a 40px square trigger with an ember unread badge, and a
 * scrollable popover of everything recent. Data, realtime and read-state all
 * reuse the portal's existing notification actions.
 */
export function AdminBell({
  userId,
  /* The employee and customer portals render this same bell; only where "View
     all" lands differs, so the base path is a prop defaulting to the admin's.
     It used to be hard-coded to /admin/notifications, which sent every
     employee and customer to a route their role cannot open — a guaranteed
     redirect-or-404 straight from the top bar. */
  basePath = "/admin",
}: {
  userId: string;
  basePath?: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  /** Wall-clock at the moment the popover opened — see the band split below. */
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: listMyNotifications,
    staleTime: 30_000,
  });

  /**
   * Both mutations write the cache FIRST and reconcile afterwards.
   *
   * "Mark all read" used to await the round trip and only then invalidate,
   * which re-fetched the whole feed — two sequential requests during which the
   * badge kept its old number and nothing on screen moved. That gap is the
   * "marks read in a few seconds but the screen is stuck in that time"
   * complaint; it was never stuck, it just had nothing to say. Rolling the
   * cache forward makes the answer instant and rolls back if the server
   * disagrees.
   */
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<typeof data>(KEY);
      qc.setQueryData(KEY, (old: typeof data) =>
        old
          ? {
              items: old.items.map((n) => ({ ...n, is_read: true })),
              unreadCount: 0,
            }
          : old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
      toast.error("Couldn't mark them read", { description: "Please try again." });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ALL_KEY });
    },
  });

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<typeof data>(KEY);
      qc.setQueryData(KEY, (old: typeof data) =>
        old
          ? {
              items: old.items.map((n) =>
                n.id === id ? { ...n, is_read: true } : n
              ),
              unreadCount: Math.max(
                0,
                old.unreadCount - (previous?.items.find((n) => n.id === id)?.is_read ? 0 : 1)
              ),
            }
          : old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ALL_KEY });
    },
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

  /**
   * Opening a notification: mark it read, close the popover, go there.
   *
   * A stored link is written as an admin path by the triggers that raise most
   * of these rows, so it is rewritten for whichever portal is rendering —
   * otherwise an employee clicking "new order" is sent to /admin/orders/… and
   * bounced straight back out by the layout guard.
   */
  function openNotification(n: Notification) {
    if (!n.is_read) markOne.mutate(n.id);
    setOpen(false);
    if (!n.link) return;
    router.push(
      n.link.startsWith("/") ? n.link.replace(/^\/admin/, basePath) : n.link
    );
  }

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

  /**
   * The popover used to render `items.slice(0, 5)` in a fixed-height box: five
   * rows, no scroll, and anything older than that was invisible until you
   * navigated to the full page. It now shows everything the feed returned,
   * split into "last 24 hours" and "earlier", inside a scroller — so the bell
   * answers "what happened today?" on its own.
   */
  const all = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;
  /* "Now" is captured when the popover opens rather than read during render:
     a clock read on every render is impure, and it would also let a row slide
     between the two bands mid-session for no reason the user could see. */
  const cutoff = (openedAt ?? 0) - RECENT_MS;
  const recent: Notification[] = [];
  const earlier: Notification[] = [];
  for (const n of all) {
    (new Date(n.created_at).getTime() >= cutoff ? recent : earlier).push(n);
  }

  return (
    <div ref={wrap} className="relative flex-none">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpenedAt(Date.now());
          setOpen((v) => !v);
        }}
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
            "border-line-base wt-sheet absolute top-12 right-0 z-50 flex max-h-[min(70vh,560px)] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-[12px] border bg-white",
            shadowE3
          )}
        >
          <div className="border-line-soft flex flex-none items-center justify-between gap-3 border-b px-4 py-3">
            <span className="text-[12.5px] font-medium">
              Notifications
              {unread > 0 ? (
                <span className="text-ink-500 font-normal"> · {unread} unread</span>
              ) : null}
            </span>
            <button
              type="button"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
              className="text-marine-600 hover:text-marine-500 border-0 bg-transparent p-0 text-[11.5px] font-medium outline-none disabled:opacity-40"
            >
              {markAll.isPending ? "Marking…" : "Mark all read"}
            </button>
          </div>

          {/* The scroller. Capped at 60vh so the popover never runs off the
              bottom of a laptop screen, and `overscroll-contain` stops the
              page behind it from scrolling once the list bottoms out. */}
          <div className="om-scroll max-h-[min(60vh,460px)] min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="flex flex-col gap-3 px-4 py-4">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="flex items-center gap-3">
                    <Shimmer w={32} h={32} className="rounded-[9px]" />
                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <Shimmer w="80%" />
                      <Shimmer w="40%" h={8} />
                    </span>
                  </span>
                ))}
              </div>
            ) : all.length === 0 ? (
              <p className="text-ink-500 m-0 px-4 py-6 text-center text-[12.5px]">
                Nothing yet. New orders, replies and assignments land here.
              </p>
            ) : (
              <>
                <Group
                  label="Last 24 hours"
                  items={recent}
                  onOpen={openNotification}
                  onMarkRead={(id) => markOne.mutate(id)}
                />
                <Group
                  label="Earlier"
                  items={earlier}
                  onOpen={openNotification}
                  onMarkRead={(id) => markOne.mutate(id)}
                />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push(`${basePath}/notifications`);
            }}
            className="border-line-soft text-marine-600 hover:bg-surface-1 block w-full flex-none border-t bg-white px-4 py-3 text-[12.5px] font-medium outline-none"
          >
            View all notifications
          </button>
        </div>
      ) : null}
    </div>
  );
}
