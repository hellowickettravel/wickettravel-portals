"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  listMyInbox,
  listMyMessages,
  sendMessage,
  markConversationRead,
} from "@/lib/actions/employee";
import { MY_INBOX_KEY, myMessagesKey } from "@/lib/query-keys";
import { ATTACHMENT_ACCEPT, uploadAttachment, validateAttachment } from "@/lib/storage";
import { type AccessLevel, isReadOnly } from "@/lib/access";
import type { Message } from "@/lib/db/types";
import { fmtInboxTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AttachIcon,
  ImageIcon,
  SearchIcon,
  SendIcon,
} from "@/components/admin/icons";
import {
  AdminMessageAttachment,
  AdminMessageText,
} from "@/components/admin/message-bits";
import {
  Avatar,
  Card,
  avatarFor,
  focusRing,
  initialsOf,
} from "@/components/admin/ui";

/** The design's day divider: "29 July 2026". */
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const dayKey = (iso: string) => iso.slice(0, 10);

function clock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/**
 * The employee's two-pane inbox, in the admin design's language.
 *
 * Access boundaries, all of them enforced server-side as well as here:
 *   • the left pane is `listMyInbox`, which is RLS-scoped to conversations
 *     assigned to this employee — they cannot see anyone else's;
 *   • routing a conversation to someone else is an admin action, so there is
 *     no assign control on this screen at all;
 *   • view_only loses the composer, and `sendMessage` refuses the write too.
 */
export function EmployeeInbox({
  currentUserName,
  accessLevel,
}: {
  currentUserName: string;
  accessLevel: AccessLevel;
}) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const readOnly = isReadOnly(accessLevel);

  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  const { data: inbox } = useQuery({
    queryKey: MY_INBOX_KEY,
    queryFn: listMyInbox,
  });
  const conversations = useMemo(() => inbox ?? [], [inbox]);

  // The design opens the newest thread automatically on a wide screen.
  useEffect(() => {
    if (opened.current || conversations.length === 0) return;
    if (window.matchMedia("(min-width: 940px)").matches) {
      opened.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId(conversations[0].id);
    }
  }, [conversations]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  const messagesKey = activeId
    ? myMessagesKey(activeId)
    : ["employee", "messages", "none"];

  const { data: messageData } = useQuery({
    queryKey: messagesKey,
    queryFn: () => listMyMessages(activeId as string),
    enabled: !!activeId,
  });
  const thread = useMemo(() => messageData ?? [], [messageData]);

  // Realtime — RLS scopes the stream to this employee's conversations.
  useEffect(() => {
    const channel = supabase
      .channel("employee-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const convId = (payload.new as { conversation_id?: string })
            ?.conversation_id;
          queryClient.invalidateQueries({ queryKey: MY_INBOX_KEY });
          if (convId) {
            queryClient.invalidateQueries({ queryKey: myMessagesKey(convId) });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  // Opening a thread clears its unread badge.
  useEffect(() => {
    if (!activeId) return;
    markConversationRead(activeId).then(() =>
      queryClient.invalidateQueries({ queryKey: MY_INBOX_KEY })
    );
  }, [activeId, queryClient]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length, activeId]);

  const send = useMutation({
    mutationFn: (input: Parameters<typeof sendMessage>[0]) => sendMessage(input),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't send", { description: res.error });
        return;
      }
      setDraft("");
      queryClient.invalidateQueries({ queryKey: messagesKey });
      queryClient.invalidateQueries({ queryKey: MY_INBOX_KEY });
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeId || send.isPending) return;
    send.mutate({ conversationId: activeId, body });
  }

  async function attach(file: File) {
    if (!activeId) return;
    const check = validateAttachment(file);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    setUploading(true);
    const up = await uploadAttachment(file, activeId);
    setUploading(false);
    if (!up.ok) {
      toast.error("Upload failed", { description: up.error });
      return;
    }
    send.mutate({
      conversationId: activeId,
      body: draft.trim(),
      mediaUrl: up.url,
    });
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      `${c.customer?.name ?? ""} ${c.customer?.wa_phone ?? ""} ${c.preview ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [conversations, search]);

  const customerName =
    active?.customer?.name || active?.customer?.wa_phone || "Customer";
  const firstName = customerName.split(" ")[0] || "customer";

  return (
    <Card className="grid h-[min(860px,calc(100dvh-12rem))] min-h-[560px] grid-cols-1 min-[940px]:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
      {/* ------------------------------------------------ thread list */}
      <div
        className={cn(
          "min-h-0 min-w-0 flex-col overflow-hidden",
          threadOpen ? "hidden min-[940px]:flex" : "flex"
        )}
      >
        <div className="border-line-soft flex-none border-b p-3">
          <div className="relative flex">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className={cn(
                "border-line-field bg-surface-1 text-ink-800 h-10 w-full rounded-[10px] border pr-3 pl-9 text-[13px] font-normal outline-none focus:bg-white",
                focusRing
              )}
            />
            <span className="text-ink-500 pointer-events-none absolute top-[11px] left-3 block size-4">
              <SearchIcon size={16} />
            </span>
          </div>
        </div>

        <div className="om-scroll min-h-0 flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-ink-600 m-0 px-5 py-10 text-center text-[13px]">
              {conversations.length === 0
                ? "No conversations assigned to you yet. An admin routes them here."
                : "No conversations match that search."}
            </p>
          ) : (
            rows.map((c) => {
              const name = c.customer?.name || c.customer?.wa_phone || "Unknown";
              const on = c.id === activeId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveId(c.id);
                    setThreadOpen(true);
                  }}
                  className={cn(
                    "border-line-soft flex w-full items-center gap-3 border-b px-4 py-3 text-left leading-[normal] outline-none",
                    on ? "bg-marine-sel" : "hover:bg-surface-1 bg-white"
                  )}
                >
                  <Avatar name={name} size={36} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-ink-800 truncate text-[13px] font-medium">
                        {name}
                      </span>
                      <span className="text-ink-500 flex-none text-[11px] font-normal whitespace-nowrap">
                        {fmtInboxTime(c.last_message_at)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-ink-600 truncate text-[12.5px] font-normal">
                        {c.preview ?? "No messages yet"}
                      </span>
                      {c.unreadCount > 0 ? (
                        <span className="bg-warn-bg text-warn-ink flex-none rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </span>
                  </span>
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
        {!active ? (
          <div className="text-ink-600 m-auto max-w-[320px] px-6 text-center text-[13px]">
            Pick a conversation on the left to read it and reply.
          </div>
        ) : (
          <>
            <div className="border-line-soft flex flex-none items-center gap-3 border-b px-5 py-3">
              <button
                type="button"
                onClick={() => setThreadOpen(false)}
                className="text-marine-600 text-[12.5px] font-medium min-[940px]:hidden"
              >
                ← Back
              </button>
              <Avatar name={customerName} size={36} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-ink-800 truncate text-[13.5px] font-semibold">
                  {customerName}
                </span>
                <span className="text-ink-600 text-[11.5px] font-normal">
                  {active.customer?.wa_phone ?? "Customer conversation"}
                </span>
              </span>
            </div>

            <div
              ref={scrollRef}
              className="om-scroll bg-surface-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5"
            >
              {thread.length === 0 ? (
                <span className="text-ink-500 m-auto text-[13px]">
                  No messages yet — say hello.
                </span>
              ) : (
                thread.map((m: Message, i) => {
                  // Outgoing is the team's side, incoming is the customer's.
                  const mine = m.direction === "outgoing";
                  const name = mine ? currentUserName : customerName;
                  const newDay =
                    i === 0 ||
                    dayKey(thread[i - 1].created_at) !== dayKey(m.created_at);
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
                            "flex max-w-[min(560px,88%)] gap-2.5",
                            mine ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <span
                            style={{
                              background: avatarFor(name).bg,
                              color: avatarFor(name).ink,
                            }}
                            className="flex size-8 flex-none items-center justify-center rounded-full text-[11px] font-semibold"
                          >
                            {initialsOf(name)}
                          </span>
                          <div
                            className={cn(
                              "flex min-w-0 flex-col gap-[5px]",
                              mine ? "items-end" : "items-start"
                            )}
                          >
                            <span className="flex items-baseline gap-[7px]">
                              <span className="text-ink-800 text-[12.5px] font-semibold">
                                {name}
                              </span>
                              <span className="text-ink-hush text-[9.5px] font-semibold tracking-[0.06em] uppercase">
                                {mine ? "Support" : "User"}
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
                                <span className="mt-2 block">
                                  <AdminMessageAttachment url={m.media_url} />
                                </span>
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

            {readOnly ? (
              <div className="border-line-soft text-ink-600 flex-none border-t bg-white px-5 py-4 text-[12.5px]">
                Your access level is read-only, so you can follow this
                conversation but not reply.
              </div>
            ) : (
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
                  placeholder={`Reply to ${firstName}…`}
                  className={cn(
                    "border-line-field bg-surface-1 text-ink-800 min-w-0 flex-1 resize-none rounded-[10px] border px-4 py-3 text-[13px] leading-[1.5] font-normal outline-none focus:bg-white",
                    focusRing
                  )}
                />
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={!draft.trim() || uploading || send.isPending}
                  className="bg-marine-500 hover:bg-marine-600 flex size-[42px] flex-none items-center justify-center rounded-full border-0 text-white outline-none disabled:opacity-60"
                >
                  <SendIcon size={17} />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
