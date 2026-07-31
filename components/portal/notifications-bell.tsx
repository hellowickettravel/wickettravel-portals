"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  MessageSquare,
  ShoppingBag,
  UserCheck,
  RefreshCw,
  CheckCheck,
  LifeBuoy,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconChip } from "@/components/ui/icon-chip";
import { createClient } from "@/lib/supabase/client";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import type { NotificationType } from "@/lib/db/types";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const NOTIFICATIONS_KEY = ["notifications"] as const;

const ICON_BY_TYPE: Record<NotificationType, typeof Bell> = {
  new_message: MessageSquare,
  new_order: ShoppingBag,
  assignment: UserCheck,
  status_change: RefreshCw,
  support_ticket: LifeBuoy,
  parent_ticket: HeartHandshake,
};

/**
 * Real notifications bell, shared by the admin + employee shells. Reads the
 * signed-in user's own notifications (RLS-scoped), shows an unread badge, marks
 * read on click + navigates, supports "mark all read", and subscribes to
 * realtime inserts so new ones appear live.
 */
export function NotificationsBell({
  userId,
  portal,
}: {
  userId: string;
  portal: "admin" | "employee" | "customer";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const notificationsHref =
    portal === "customer" ? "/customer/notifications" : `/${portal}/notifications`;

  const { data } = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: listMyNotifications,
  });

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  // Realtime: my notifications stream (RLS limits inserts to my own rows).
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, userId]);

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (res) => {
      if (!res.ok)
        toast.error("Couldn't update notification", { description: res.error });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
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
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

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
    // Never navigate to an empty/relative link → would 404. Fall back by type.
    const target = link && link.startsWith("/") ? link : fallbackLink(type);
    router.push(target);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative inline-flex size-[46px] shrink-0 items-center justify-center rounded-icon text-tx-muted outline-none transition-colors duration-150 ease-brand hover:bg-sunk hover:text-tx-head focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          /* Ruby means attention — the topbar carries no brand colour. */
          <span className="absolute top-1.5 right-1.5 inline-flex min-w-[17px] items-center justify-center rounded-chip bg-ruby px-1 py-px text-[10px] leading-[1.4] font-semibold tabular text-tx-invert">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-[14.5px] font-semibold text-tx-head">
            Notifications
          </p>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => readAllMutation.mutate()}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ocean transition-colors duration-150 ease-brand hover:text-ocean-deep"
            >
              <CheckCheck className="size-4" />
              Mark all read
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-9 text-center">
            <IconChip tone="neutral">
              <Bell />
            </IconChip>
            <p className="mt-2 text-[14.5px] font-semibold text-tx-head">
              No new notifications
            </p>
            <p className="text-[13px] text-tx-muted">
              You&apos;re all caught up.
            </p>
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {items.map((n) => {
              const Icon = ICON_BY_TYPE[n.type] ?? Bell;
              // Prefix the action title with WHO did it: "You" when the viewer is
              // the actor, otherwise their real name. Falls back to the bare title
              // for older rows that have no actor.
              const actorLabel = n.actor_id
                ? n.actor_id === userId
                  ? "You"
                  : n.actor_name
                : n.actor_name;
              const titleLine = actorLabel ? `${actorLabel} ${n.title}` : n.title;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() =>
                      openNotification(n.id, n.is_read, n.type, n.link)
                    }
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 ease-brand hover:bg-sunk",
                      !n.is_read && "bg-sky-tint/60"
                    )}
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-icon bg-sky-tint text-ocean [&_svg]:[stroke-width:1.75]">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[14.5px] font-medium text-tx-head">
                          {titleLine}
                        </p>
                        {!n.is_read ? (
                          <span className="size-2 shrink-0 rounded-full bg-ocean" />
                        ) : null}
                      </div>
                      {n.body ? (
                        <p className="truncate text-[13px] text-tx-muted">
                          {n.body}
                        </p>
                      ) : null}
                      <p className="mt-0.5 font-micro text-tx-muted">
                        {fmtRelative(n.created_at)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href={notificationsHref}
          className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-3 text-[14.5px] font-medium text-ocean outline-none transition-colors duration-150 ease-brand hover:bg-sunk focus-visible:bg-sunk"
        >
          View all notifications
          <ArrowRight className="size-4" />
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
