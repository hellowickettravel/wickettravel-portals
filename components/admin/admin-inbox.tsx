"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  adminSendMessage,
  listAdminInbox,
  listAdminMessages,
  listEmployees,
  markAdminConversationRead,
  setConversationAssignee,
  setConversationStatus,
} from "@/lib/actions/admin";
import { ADMIN_INBOX_KEY, adminMessagesKey } from "@/lib/query-keys";
import {
  ATTACHMENT_ACCEPT,
  uploadAttachment,
  validateAttachment,
} from "@/lib/storage";
import {
  AdminMessageAttachment,
  AdminMessageText,
} from "@/components/admin/message-bits";
import type { InboxConversation } from "@/lib/db/conversations";
import type { Message } from "@/lib/db/types";
import { fmtInboxTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Card,
  Spinner,
  avatarFor,
  focusRing,
  initialsOf,
} from "@/components/admin/ui";
import { ThreadListSkeleton, ThreadSkeleton } from "@/components/admin/inbox-skeletons";
import {
  AttachIcon,
  CheckIcon,
  ImageIcon,
  SendIcon,
} from "@/components/admin/icons";

/**
 * The Admin Portal's two-pane inbox, built to the Claude Design "Admin Portal
 * All Pages" Messages screen.
 *
 * Deliberately NOT the shared `ConversationInbox`: that component is also the
 * employee portal's inbox and stays on the navy/orange system. This one only
 * ever renders inside `.admin-root`, and reuses the exact same admin server
 * actions and realtime channel, so behaviour is identical and only the skin
 * differs.
 */

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function clock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

export function AdminInbox({
  currentUserId,
  currentUserName = "Wicket Travel",
  currentUserAvatar = null,
}: {
  currentUserId: string;
  /** The design names the person behind each staff bubble, not just the role. */
  currentUserName?: string;
  /** The signed-in admin's own picture, for the bubbles they send. */
  currentUserAvatar?: string | null;
}) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: inbox, isLoading: inboxLoading } = useQuery({
    queryKey: ADMIN_INBOX_KEY,
    queryFn: listAdminInbox,
  });
  const conversations = useMemo(() => inbox ?? [], [inbox]);

  const { data: employeesData } = useQuery({
    queryKey: ["admin", "inbox", "employees"],
    queryFn: listEmployees,
  });
  const employees = useMemo(
    () => (employeesData ?? []).filter((e) => e.is_active),
    [employeesData]
  );
  const employeeName = (id?: string | null) =>
    employees.find((e) => e.id === id)?.full_name ?? null;
  /* A staff member's own photo, if they've set one in Settings. Falls back to
     the deterministic initials tint, which is what most rows will show. */
  const employeeAvatar = (id?: string | null) =>
    employees.find((e) => e.id === id)?.avatar_url ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      [c.customer?.name ?? "", c.customer?.wa_phone ?? "", c.preview ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [conversations, search]);

  const active: InboxConversation | undefined = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  const { data: messages, isPending: messagesLoading } = useQuery({
    queryKey: activeId ? adminMessagesKey(activeId) : ["admin", "messages", "none"],
    queryFn: () => listAdminMessages(activeId as string),
    enabled: !!activeId,
  });

  const activeIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Realtime — the same channel shape the shared inbox uses; admin RLS scopes
  // the stream to every conversation.
  useEffect(() => {
    const channel = supabase
      .channel(`admin-inbox-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const convId = (payload.new as { conversation_id?: string })
            ?.conversation_id;
          queryClient.invalidateQueries({ queryKey: ADMIN_INBOX_KEY });
          if (convId && convId === activeIdRef.current) {
            queryClient.invalidateQueries({ queryKey: adminMessagesKey(convId) });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => queryClient.invalidateQueries({ queryKey: ADMIN_INBOX_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, currentUserId]);

  // Deep-link `?c=<id>` opens that thread once the inbox has loaded; otherwise
  // the newest thread opens on its own, because the design never shows the
  // reading pane empty on a wide screen. Below 940px the two panes stack, so we
  // leave the list showing and let the user pick.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || conversations.length === 0) return;
    const target = new URLSearchParams(window.location.search).get("c");
    if (target && conversations.some((c) => c.id === target)) {
      opened.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId(target);
      return;
    }
    if (window.matchMedia("(min-width: 940px)").matches) {
      opened.current = true;
      setActiveId(conversations[0].id);
    }
  }, [conversations]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  const assignMutation = useMutation({
    mutationFn: setConversationAssignee,
    onSuccess: (res) => {
      if (!res.ok) return toast.error("Couldn't reassign", { description: res.error });
      toast.success("Conversation reassigned");
      queryClient.invalidateQueries({ queryKey: ADMIN_INBOX_KEY });
    },
    onError: () => toast.error("Couldn't reassign", { description: "Please try again." }),
  });

  /**
   * Per-admin read receipt. Optimistic on the cached inbox so the badge clears
   * on the click rather than after the round trip — and rolls back with a
   * toast if the write fails (which it will, honestly, on a database that
   * hasn't had APPLY_ADMIN_ROUND3.sql run yet).
   */
  const readMutation = useMutation({
    mutationFn: markAdminConversationRead,
    onMutate: async (conversationId: string) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_INBOX_KEY });
      const previous =
        queryClient.getQueryData<InboxConversation[]>(ADMIN_INBOX_KEY);
      queryClient.setQueryData<InboxConversation[]>(ADMIN_INBOX_KEY, (old) =>
        (old ?? []).map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
      return { previous };
    },
    onSuccess: (res, _v, ctx) => {
      if (!res.ok) {
        if (ctx?.previous)
          queryClient.setQueryData(ADMIN_INBOX_KEY, ctx.previous);
        toast.error("Couldn't mark as read", { description: res.error });
      }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ADMIN_INBOX_KEY, ctx.previous);
      toast.error("Couldn't mark as read", { description: "Please try again." });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_INBOX_KEY }),
  });

  const statusMutation = useMutation({
    mutationFn: setConversationStatus,
    onSuccess: (res) => {
      if (!res.ok) return toast.error("Couldn't update", { description: res.error });
      toast.success("Conversation updated");
      queryClient.invalidateQueries({ queryKey: ADMIN_INBOX_KEY });
    },
    onError: () => toast.error("Couldn't update", { description: "Please try again." }),
  });

  const sendMutation = useMutation({
    mutationFn: (vars: {
      conversationId: string;
      body: string;
      mediaUrl?: string | null;
      displayUrl?: string | null;
    }) => adminSendMessage(vars),
    onMutate: async (vars) => {
      const key = adminMessagesKey(vars.conversationId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Message[]>(key);
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversation_id: vars.conversationId,
        direction: "outgoing",
        body: vars.body,
        media_url: vars.displayUrl ?? vars.mediaUrl ?? null,
        sender_id: currentUserId,
        reply_to_id: null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Message[]>(key, (old) => [...(old ?? []), optimistic]);
      return { key, previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error("Couldn't send", { description: "Please try again." });
    },
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({ queryKey: adminMessagesKey(vars.conversationId) });
      queryClient.invalidateQueries({ queryKey: ADMIN_INBOX_KEY });
    },
  });

  async function attach(file: File) {
    if (!activeId) return;
    const valid = validateAttachment(file);
    if (!valid.ok) {
      toast.error("Can't attach that", { description: valid.error });
      return;
    }
    setUploading(true);
    try {
      const up = await uploadAttachment(file, activeId);
      if (!up.ok) throw new Error(up.error);
      sendMutation.mutate({
        conversationId: activeId,
        body: draft.trim(),
        mediaUrl: up.path,
        displayUrl: up.url,
      });
      setDraft("");
    } catch {
      toast.error("Upload failed", { description: "Please try again." });
    } finally {
      setUploading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeId) return;
    sendMutation.mutate({ conversationId: activeId, body });
    setDraft("");
  }

  const myAvatar = currentUserAvatar;
  const threadOpen = !!activeId;
  const waiting = active?.unreadCount ?? 0;

  return (
    // The design gives both panes their own scroller (`om-scroll` + flex-1 +
    // min-height 0), which only works if the card itself is bounded — so the
    // 560px floor is paired with a viewport-relative ceiling. Both grid items
    // need min-h-0 as well: a grid item defaults to min-height:auto, which let
    // the thread column grow past the card and pushed the composer out of the
    // clipped area entirely.
    <Card className="grid h-[min(860px,calc(100dvh-12rem))] min-h-[560px] grid-cols-1 min-[940px]:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
      {/* ------------------------------------------------ thread list */}
      <div
        className={cn(
          "min-h-0 min-w-0 flex-col overflow-hidden",
          threadOpen ? "hidden min-[940px]:flex" : "flex"
        )}
      >
        <div className="border-line-soft border-b p-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className={cn(
              "border-line-field bg-surface-1 text-ink-800 h-10 w-full rounded-[10px] border px-4 text-[12.5px] font-normal outline-none focus:bg-white",
              focusRing
            )}
          />
        </div>
        <div className="om-scroll min-h-0 flex-1 overflow-y-auto">
          {/* The list used to render its "No conversations yet" empty state
              while the very first fetch was still in flight, so every visit
              began by telling the user they had no messages and then
              contradicting itself a second later. `isLoading` has to be asked
              BEFORE `length === 0`, always. */}
          {inboxLoading ? (
            <ThreadListSkeleton />
          ) : filtered.length === 0 ? (
            <p className="text-ink-600 m-0 px-4 py-10 text-center text-[13px] text-pretty">
              {conversations.length === 0
                ? "No conversations yet. They appear the moment a customer messages you."
                : "No conversation matches that search."}
            </p>
          ) : (
            filtered.map((c) => {
              const on = c.id === activeId;
              const name = c.customer?.name ?? "Unknown customer";
              const tint = avatarFor(name);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  style={{ borderLeftColor: on ? "var(--color-marine-500)" : "transparent" }}
                  className={cn(
                    // leading-normal keeps the row at the design's 67px.
                    "hover:bg-surface-1 relative flex w-full gap-3 border-0 border-l-[3px] p-4 text-left leading-[normal] outline-none",
                    "after:bg-line-soft after:absolute after:right-0 after:bottom-0 after:left-[62px] after:h-px after:content-['']",
                    on ? "bg-marine-sel" : "bg-white"
                  )}
                >
                  <span
                    style={{ background: tint.bg, color: tint.ink }}
                    className="flex size-[34px] flex-none items-center justify-center rounded-full text-[11.5px] font-semibold"
                  >
                    {initialsOf(name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-medium">{name}</span>
                      <span className="text-ink-500 flex-none text-[11px] font-normal">
                        {fmtInboxTime(c.last_message_at)}
                      </span>
                    </span>
                    <span className="text-ink-500 truncate text-[12.5px] font-normal">
                      {c.preview ?? "No messages yet"}
                    </span>
                  </span>
                  {c.unreadCount ? (
                    <span className="bg-ember-600 flex h-5 min-w-5 flex-none items-center justify-center self-center rounded-full px-2 text-[11px] font-medium text-white">
                      {c.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- thread */}
      <div
        className={cn(
          "border-line-pane min-h-0 min-w-0 flex-col overflow-hidden min-[940px]:flex min-[940px]:border-l",
          threadOpen ? "flex" : "hidden"
        )}
      >
        {active ? (
          <>
            <div className="border-line-soft flex flex-none flex-wrap items-center gap-3 border-b px-5 py-4">
              <button
                type="button"
                onClick={() => setActiveId(undefined)}
                aria-label="Back to conversations"
                className="text-marine-600 flex-none border-0 bg-transparent p-0 text-[12.5px] font-medium whitespace-nowrap outline-none min-[940px]:hidden"
              >
                ←
              </button>
              <Avatar name={active.customer?.name ?? "Unknown"} size={34} />
              <span className="flex min-w-0 flex-[1_1_140px] flex-col gap-1">
                <span className="text-[13.5px] font-medium">
                  {active.customer?.name ?? "Unknown customer"}
                </span>
                <span className="text-ink-600 text-[11.5px] font-normal">
                  {employeeName(active.assignedEmployeeId)
                    ? `Assigned to ${employeeName(active.assignedEmployeeId)}`
                    : "Unassigned"}{" "}
                  · {active.status === "open" ? "Open" : "Closed"}
                </span>
              </span>
              <div className="flex flex-none flex-wrap items-center gap-2">
                {/* Every control here now shows that it is working. The
                    select, the Close toggle and the mark-read tick all took a
                    round trip during which nothing on screen moved — the
                    "it changes in a few seconds but for that second it feels
                    like nothing is going to happen" complaint. */}
                <span className="relative flex items-center">
                  <select
                    value={active.assignedEmployeeId ?? ""}
                    disabled={assignMutation.isPending}
                    onChange={(e) =>
                      assignMutation.mutate({
                        conversationId: active.id,
                        employeeId: e.target.value || null,
                      })
                    }
                    aria-label="Assign to employee"
                    aria-busy={assignMutation.isPending || undefined}
                    className={cn(
                      // appearance-none: at rest this reads as the design's
                      // static pill, but it stays a one-click reassign.
                      "h-[34px] cursor-pointer appearance-none rounded-full border bg-white px-3.5 text-[12px] font-medium outline-none transition-[opacity,border-color,background-color] duration-[140ms] disabled:cursor-progress",
                      assignMutation.isPending && "pr-8 opacity-70",
                      active.assignedEmployeeId
                        ? "border-marine-200 text-marine-600"
                        : "border-warn-bg bg-warn-bg text-warn-ink"
                    )}
                  >
                    <option value="">Unassigned</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name ?? e.email ?? e.id}
                      </option>
                    ))}
                  </select>
                  {assignMutation.isPending ? (
                    <span className="text-marine-600 pointer-events-none absolute right-2.5">
                      <Spinner size={12} />
                    </span>
                  ) : null}
                </span>

                {waiting > 0 ? (
                  <button
                    type="button"
                    disabled={readMutation.isPending}
                    aria-busy={readMutation.isPending || undefined}
                    onClick={() => readMutation.mutate(active.id)}
                    title="Mark this conversation as read"
                    className="border-line-field text-ink-700 hover:bg-surface-1 hover:border-ok-edge inline-flex h-[34px] items-center gap-1.5 rounded-full border bg-white px-3.5 text-[12px] font-medium whitespace-nowrap outline-none disabled:opacity-60"
                  >
                    {readMutation.isPending ? (
                      <Spinner size={12} />
                    ) : (
                      <CheckIcon size={13} width={2.4} />
                    )}
                    Mark as read
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  aria-busy={statusMutation.isPending || undefined}
                  onClick={() =>
                    statusMutation.mutate({
                      conversationId: active.id,
                      status: active.status === "open" ? "closed" : "open",
                    })
                  }
                  className="border-line-field text-ink-700 hover:bg-surface-1 inline-flex h-[34px] items-center gap-1.5 rounded-full border bg-white px-3.5 text-[12px] font-medium whitespace-nowrap outline-none disabled:opacity-60"
                >
                  {statusMutation.isPending ? <Spinner size={12} /> : null}
                  {active.status === "open" ? "Close" : "Open"}
                </button>
                <Link
                  href={`/admin/orders?q=${encodeURIComponent(active.customer?.name ?? "")}`}
                  className="border-line-field text-ink-800 hover:bg-surface-1 flex h-[34px] items-center rounded-full border bg-white px-3.5 text-[12px] font-medium whitespace-nowrap no-underline hover:no-underline"
                >
                  Open order
                </Link>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="om-scroll bg-surface-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5"
            >
              {messagesLoading ? (
                <ThreadSkeleton />
              ) : (messages ?? []).length === 0 ? (
                <p className="text-ink-600 m-0 py-10 text-center text-[13px]">
                  No messages in this conversation yet.
                </p>
              ) : (
                (messages ?? []).map((m, i, arr) => {
                  const mine = m.direction === "outgoing";
                  // Outgoing messages are named after whoever sent them —
                  // an employee if we can resolve the id, otherwise the
                  // signed-in admin. The caption is the design's own
                  // vocabulary: User / Support / Admin.
                  const staffName = employeeName(m.sender_id);
                  const who = mine
                    ? staffName
                      ? { name: staffName, role: "Support" }
                      : { name: currentUserName, role: "Admin" }
                    : {
                        name: active.customer?.name ?? "Customer",
                        role: "User",
                      };
                  const newDay =
                    i === 0 || dayKey(arr[i - 1].created_at) !== dayKey(m.created_at);
                  return (
                    <div key={m.id} className="contents">
                      {newDay ? (
                        <div className="flex w-full flex-col items-center">
                          <div className="flex w-full max-w-[420px] items-center gap-3 py-0.5">
                            <span className="bg-line-base block h-px flex-1" />
                            <span className="border-line-faint text-ink-500 flex-none rounded-full border bg-white px-3 py-1 text-[11px] font-medium whitespace-nowrap">
                              {DAY.format(new Date(m.created_at))}
                            </span>
                            <span className="bg-line-base block h-px flex-1" />
                          </div>
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "flex w-full flex-col",
                          mine ? "items-end" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "flex max-w-[min(600px,88%)] gap-2.5",
                            mine ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <Avatar
                            name={who.name}
                            size={32}
                            src={mine ? employeeAvatar(m.sender_id) ?? myAvatar : null}
                            className="text-[11px]"
                          />
                          <div
                            className={cn(
                              "flex min-w-0 flex-col gap-[5px]",
                              mine ? "items-end" : "items-start"
                            )}
                          >
                            <span className="flex items-baseline gap-[7px]">
                              <span className="text-ink-800 text-[12.5px] font-semibold">
                                {who.name}
                              </span>
                              <span className="text-ink-hush text-[9.5px] font-semibold tracking-[0.06em] uppercase">
                                {who.role}
                              </span>
                            </span>
                            <div
                              className={cn(
                                "border px-[15px] pt-[11px] pb-2",
                                mine
                                  ? "bg-marine-500 border-marine-500 rounded-[14px_14px_4px_14px] text-white"
                                  : "border-neutral-bg text-ink-800 rounded-[14px_14px_14px_4px] bg-white"
                              )}
                            >
                              {m.body ? (
                                <span className="block text-[13px] leading-[1.55] font-normal text-pretty">
                                  <AdminMessageText text={m.body} mine={mine} />
                                </span>
                              ) : null}
                              {m.media_url ? (
                                <AdminMessageAttachment url={m.media_url} />
                              ) : null}
                              <span
                                className={cn(
                                  "mt-[5px] block text-right text-[10.5px] font-normal tabular-nums",
                                  mine ? "text-marine-time" : "text-ink-quiet"
                                )}
                              >
                                {clock(m.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={submit}
              className="border-line-soft flex flex-none items-end gap-2.5 border-t bg-white px-5 py-3.5"
            >
              <input
                ref={fileRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) attach(f);
                  e.target.value = "";
                }}
              />
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) attach(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                aria-label="Attach file"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="border-line-field text-ink-600 hover:bg-surface-1 flex size-[42px] flex-none items-center justify-center rounded-[10px] border bg-white outline-none disabled:opacity-60"
              >
                <AttachIcon size={18} />
              </button>
              <button
                type="button"
                aria-label="Add image"
                disabled={uploading}
                onClick={() => imageRef.current?.click()}
                className="border-line-field text-ink-600 hover:bg-surface-1 flex size-[42px] flex-none items-center justify-center rounded-[10px] border bg-white outline-none disabled:opacity-60"
              >
                <ImageIcon size={18} />
              </button>
              <textarea
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(e);
                  }
                }}
                placeholder={`Reply to ${active.customer?.name?.split(" ")[0] ?? "customer"}…`}
                className={cn(
                  "border-line-field bg-surface-1 text-ink-800 min-w-0 flex-1 resize-none rounded-[10px] border px-4 py-3 text-[13px] leading-[1.5] font-normal outline-none focus:bg-white",
                  focusRing
                )}
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={!draft.trim() || uploading}
                className="bg-marine-500 hover:bg-marine-600 flex size-[42px] flex-none items-center justify-center rounded-full border-0 text-white outline-none disabled:opacity-60"
              >
                <SendIcon size={17} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center px-6 py-14 text-center">
            <span className="bg-marine-50 mb-4 flex size-11 items-center justify-center rounded-full">
              <span className="border-marine-500 block size-3.5 rounded-full border-2" />
            </span>
            <h2 className="text-ink-800 m-0 mb-2 text-[15px] font-semibold tracking-[-0.008em]">
              Pick a conversation
            </h2>
            <p className="text-ink-600 m-0 max-w-[384px] text-[13px] leading-[1.55] font-normal text-pretty">
              Choose a thread on the left to read the full history and reply.
              Employees see exactly the same history you do.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
