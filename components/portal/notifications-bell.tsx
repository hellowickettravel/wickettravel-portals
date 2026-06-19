"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  MessageSquare,
  ShoppingBag,
  UserCheck,
  RefreshCw,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-brand/25"
      >
        <Bell className="size-[18px]" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => readAllMutation.mutate()}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-dark"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-9 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-chip text-brand-dark">
              <Bell className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No new notifications
            </p>
            <p className="text-xs text-muted-foreground">You&apos;re all caught up.</p>
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {items.map((n) => {
              const Icon = ICON_BY_TYPE[n.type] ?? Bell;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() =>
                      openNotification(n.id, n.is_read, n.type, n.link)
                    }
                    className={cn(
                      "flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-neutral-soft",
                      !n.is_read && "bg-chip/40"
                    )}
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-chip text-brand-dark">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {n.title}
                        </p>
                        {!n.is_read ? (
                          <span className="size-2 shrink-0 rounded-full bg-primary" />
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
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
