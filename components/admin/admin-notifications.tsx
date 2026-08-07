"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  listAllMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import type { NotificationType } from "@/lib/db/types";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Btn,
  Card,
  CardHead,
  EmptyState,
  PageHead,
  Screen,
} from "@/components/admin/ui";
import { CheckIcon } from "@/components/admin/icons";

const ALL_KEY = ["notifications", "all"] as const;
const BELL_KEY = ["notifications"] as const;

/** The design groups every alert into three bands, each with its own tint. */
type Band = "Orders" | "Messages" | "Enquiries";

const BAND_OF: Record<NotificationType, Band> = {
  new_order: "Orders",
  status_change: "Orders",
  new_message: "Messages",
  assignment: "Messages",
  support_ticket: "Enquiries",
  parent_ticket: "Enquiries",
};

const BAND_TINT: Record<Band, { pill: string; dot: string }> = {
  Orders: { pill: "bg-marine-tint text-marine-600", dot: "var(--color-marine-600)" },
  Messages: { pill: "bg-warn-bg text-warn-ink", dot: "var(--color-warn-ink)" },
  Enquiries: { pill: "bg-ok-bg text-ok-ink", dot: "var(--color-ok-ink)" },
};

const TABS = ["All", "Orders", "Messages", "Enquiries"] as const;
type Tab = (typeof TABS)[number];

/**
 * The design reads each row as a sentence — "Marcus Bell placed order #7343488".
 * Stored titles carry only the verb phrase, so prefix the actor when we know it
 * and the title doesn't already name them.
 */
function sentence(title: string, actor: string | null) {
  const who = actor?.trim();
  if (!who) return title;
  return title.toLowerCase().startsWith(who.toLowerCase())
    ? title
    : `${who} ${title.charAt(0).toLowerCase()}${title.slice(1)}`;
}

function fallbackLink(type: NotificationType): string {
  switch (type) {
    case "new_order":
    case "status_change":
      return "/admin/orders";
    case "new_message":
    case "assignment":
      return "/admin/messages";
    case "support_ticket":
      return "/admin/support";
    case "parent_ticket":
      return "/admin/parents-tickets";
    default:
      return "/admin";
  }
}

/**
 * Notifications — the design's dedicated inbox: everything the platform has
 * told you, newest first, banded by Orders / Messages / Enquiries, with a live
 * summary and a shortcut to the preference switches in Settings.
 */
export function AdminNotifications({ userId }: { userId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("All");

  const { data, isLoading } = useQuery({
    queryKey: ALL_KEY,
    queryFn: listAllMyNotifications,
  });
  const items = useMemo(() => data?.items ?? [], [data]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ALL_KEY });
          queryClient.invalidateQueries({ queryKey: BELL_KEY });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, userId]);

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ALL_KEY });
      queryClient.invalidateQueries({ queryKey: BELL_KEY });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't update", { description: res.error });
        return;
      }
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ALL_KEY });
      queryClient.invalidateQueries({ queryKey: BELL_KEY });
    },
  });

  const counts = useMemo(() => {
    const out: Record<Tab, number> = {
      All: items.length,
      Orders: 0,
      Messages: 0,
      Enquiries: 0,
    };
    for (const n of items) out[BAND_OF[n.type]] += 1;
    return out;
  }, [items]);

  const unread = items.filter((n) => !n.is_read).length;

  const visible = useMemo(
    () => (tab === "All" ? items : items.filter((n) => BAND_OF[n.type] === tab)),
    [items, tab]
  );

  function open(id: string, isRead: boolean, type: NotificationType, link: string | null) {
    if (!isRead) readMutation.mutate(id);
    router.push(link && link.startsWith("/") ? link : fallbackLink(type));
  }

  return (
    <Screen>
      <PageHead
        title="Notifications"
        intro="Everything the platform has told you, newest first."
        actions={
          <Btn
            disabled={unread === 0 || readAllMutation.isPending}
            onClick={() => readAllMutation.mutate()}
          >
            <CheckIcon size={15} />
            Mark all as read
          </Btn>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "flex h-10 items-center gap-2 rounded-full border px-5 text-[13px] font-medium whitespace-nowrap outline-none",
              tab === t
                ? "border-ink-800 bg-ink-800 text-white"
                : "border-line-field text-ink-700 hover:bg-surface-1 bg-white"
            )}
          >
            {t}
            <span className="text-[11px] font-medium tabular-nums opacity-[0.66]">
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 min-[1240px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          {isLoading ? (
            <p className="text-ink-600 m-0 px-5 py-10 text-center text-[13px]">
              Loading notifications…
            </p>
          ) : visible.length === 0 ? (
            <EmptyState
              title={
                items.length === 0
                  ? "Nothing yet"
                  : "Nothing in this category"
              }
              body={
                items.length === 0
                  ? "Orders, replies, assignments and website enquiries all raise a notification here the moment they happen."
                  : "Switch to another tab to see the rest of your notifications."
              }
            />
          ) : (
            visible.map((n) => {
              const band = BAND_OF[n.type];
              const tint = BAND_TINT[band];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => open(n.id, n.is_read, n.type, n.link)}
                  className={cn(
                    "border-line-soft hover:bg-marine-50 flex w-full gap-4 border-b px-5 py-4 text-left outline-none last:border-b-0",
                    n.is_read ? "bg-white" : "bg-marine-50"
                  )}
                >
                  <span
                    style={{
                      background: n.is_read ? "var(--color-ink-300)" : tint.dot,
                    }}
                    className="mt-1.5 block size-2 flex-none rounded-full"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span
                      className={cn(
                        "text-ink-800 text-[13px] leading-[1.5] text-pretty",
                        n.is_read ? "font-normal" : "font-semibold"
                      )}
                    >
                      {sentence(n.title, n.actor_name)}
                    </span>
                    {n.body ? (
                      <span className="text-ink-600 text-[12.5px] leading-[1.5] font-normal text-pretty">
                        {n.body}
                      </span>
                    ) : null}
                    <span className="text-ink-500 text-[11.5px] font-normal">
                      {fmtRelative(n.created_at)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex-none self-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap",
                      tint.pill
                    )}
                  >
                    {band}
                  </span>
                </button>
              );
            })
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHead title="Summary" />
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-baseline gap-2.5">
                <span className="font-poppins text-marine-500 text-[34px] leading-none font-medium tracking-[-0.022em] tabular-nums">
                  {unread}
                </span>
                <span className="text-ink-600 text-[12.5px] font-normal">
                  unread of {items.length} total
                </span>
              </div>
              <div className="flex flex-col">
                {(["Orders", "Messages", "Enquiries"] as Band[]).map((b) => (
                  <div
                    key={b}
                    className="border-line-soft flex items-center justify-between gap-4 border-t py-2.5"
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        style={{ background: BAND_TINT[b].dot }}
                        className="block size-2 rounded-full"
                      />
                      <span className="text-ink-700 text-[12.5px] font-normal">
                        {b}
                      </span>
                    </span>
                    <span className="text-[13px] font-medium tabular-nums">
                      {counts[b]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHead title="Preferences" />
            <div className="flex flex-col gap-3 px-5 py-4">
              <p className="text-ink-600 m-0 text-[12.5px] leading-[1.5] font-normal text-pretty">
                Choose which alerts reach you and how often we send a digest.
              </p>
              <Link
                href="/admin/settings"
                className="border-line-field text-ink-800 hover:bg-surface-1 flex h-10 items-center justify-center rounded-full border bg-white text-[12.5px] font-medium no-underline hover:no-underline"
              >
                Notification settings
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </Screen>
  );
}
