"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  MessageSquare,
  ShoppingBag,
  UserCheck,
  RefreshCw,
  LifeBuoy,
  HeartHandshake,
  Star,
  CheckCheck,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  listAllMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  setNotificationStarred,
} from "@/lib/actions/notifications";
import type { NotificationType } from "@/lib/db/types";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const NOTIFICATIONS_ALL_KEY = ["notifications", "all"] as const;
const NOTIFICATIONS_KEY = ["notifications"] as const; // the bell's short list

const ICON_BY_TYPE: Record<NotificationType, typeof Bell> = {
  new_message: MessageSquare,
  new_order: ShoppingBag,
  assignment: UserCheck,
  status_change: RefreshCw,
  support_ticket: LifeBuoy,
  parent_ticket: HeartHandshake,
};

type Portal = "admin" | "employee" | "customer";
type Filter = "all" | "unread" | "starred";

/**
 * The dedicated Notifications inbox — one professional home for every alert,
 * separate from the Support page (which is only for customer tickets/complaints).
 * Filters by All / Unread / Starred, stars are persisted per-recipient, clicking
 * a row marks it read and deep-links to its real target (order/message/ticket).
 * Realtime keeps it live.
 */
export function NotificationsView({
  userId,
  portal,
}: {
  userId: string;
  portal: Portal;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading } = useQuery({
    queryKey: NOTIFICATIONS_ALL_KEY,
    queryFn: listAllMyNotifications,
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  // Realtime: my notifications stream (RLS limits rows to my own).
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_ALL_KEY });
          queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, userId]);

  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_ALL_KEY });
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  };

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSettled: invalidateBoth,
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't mark all as read", { description: res.error });
        return;
      }
      toast.success("All notifications marked as read");
    },
    onSettled: invalidateBoth,
  });

  const starMutation = useMutation({
    mutationFn: setNotificationStarred,
    onSuccess: (res) => {
      if (!res.ok) toast.error("Couldn't update", { description: res.error });
    },
    onSettled: invalidateBoth,
  });

  const counts = useMemo(
    () => ({
      all: items.length,
      unread: items.filter((n) => !n.is_read).length,
      starred: items.filter((n) => n.is_starred).length,
    }),
    [items]
  );

  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.is_read);
    if (filter === "starred") return items.filter((n) => n.is_starred);
    return items;
  }, [items, filter]);

  /** A guaranteed-real route per type, used when a stored link is missing/bad. */
  function fallbackLink(type: NotificationType): string {
    const base = portal === "customer" ? "/customer" : `/${portal}`;
    switch (type) {
      case "new_order":
      case "status_change":
        return `${base}/orders`;
      case "new_message":
      case "assignment":
        return `${base}/messages`;
      case "support_ticket":
        return portal === "customer" ? "/customer/support" : "/admin/support";
      case "parent_ticket":
        return "/admin/parents-tickets";
      default:
        return base;
    }
  }

  function openNotification(
    id: string,
    isRead: boolean,
    type: NotificationType,
    link: string | null
  ) {
    if (!isRead) readMutation.mutate(id);
    const target = link && link.startsWith("/") ? link : fallbackLink(type);
    router.push(target);
  }

  const TABS: { label: string; value: Filter; count: number }[] = [
    { label: "All", value: "all", count: counts.all },
    { label: "Unread", value: "unread", count: counts.unread },
    { label: "Starred", value: "starred", count: counts.starred },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ocean">
          Activity
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-tx-head sm:text-2xl">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every alert across your portal, live as it happens.
            </p>
          </div>
          {counts.unread > 0 ? (
            <button
              type="button"
              onClick={() => readAllMutation.mutate()}
              disabled={readAllMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-control border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-ocean hover:text-ocean disabled:opacity-50"
            >
              <CheckCheck className="size-4" />
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className="inline-flex items-center gap-1 rounded-surface bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-control px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === t.value
                ? "bg-ocean text-tx-invert"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-chip px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none",
                filter === t.value
                  ? "bg-white/25 text-white"
                  : "bg-sky-tint text-ocean-deep"
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-surface border border-border bg-card shadow-lift">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            Loading notifications…
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-surface bg-sky-tint text-ocean-deep">
              <Inbox className="size-6" />
            </div>
            <p className="tracking-heading text-base font-semibold text-foreground">
              {filter === "unread"
                ? "No unread notifications"
                : filter === "starred"
                  ? "No starred notifications"
                  : "No notifications yet"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {filter === "starred"
                ? "Star a notification to keep it handy here."
                : "You’re all caught up — new activity will appear here live."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((n) => {
              const Icon = ICON_BY_TYPE[n.type] ?? Bell;
              const actorLabel = n.actor_id
                ? n.actor_id === userId
                  ? "You"
                  : n.actor_name
                : n.actor_name;
              const titleLine = actorLabel ? `${actorLabel} ${n.title}` : n.title;
              return (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-sunk sm:px-5",
                    !n.is_read && "bg-sky-tint/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      openNotification(n.id, n.is_read, n.type, n.link)
                    }
                    className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none"
                  >
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-control bg-sky-tint text-ocean-deep">
                      <Icon className="size-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {titleLine}
                        </p>
                        {!n.is_read ? (
                          <span className="size-2 shrink-0 rounded-full bg-ocean" />
                        ) : null}
                      </div>
                      {n.body ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {fmtRelative(n.created_at)}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={n.is_starred ? "Unstar" : "Star"}
                    aria-pressed={n.is_starred}
                    onClick={() =>
                      starMutation.mutate({ id: n.id, starred: !n.is_starred })
                    }
                    className={cn(
                      "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-chip outline-none transition-colors hover:bg-sunk focus-visible:ring-2 focus-visible:ring-ocean/40",
                      n.is_starred
                        ? "text-gold hover:text-gold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Star
                      className={cn("size-[18px]", n.is_starred && "fill-current")}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
