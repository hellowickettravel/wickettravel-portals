"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send, FilePlus2, Lock, Search, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { ConversationListSkeleton } from "@/components/portal/skeletons";
import { CreateOrderDialog } from "@/components/employee/create-order-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  listMyInbox,
  listMyMessages,
  sendMessage,
  markConversationRead,
} from "@/lib/actions/employee";
import { MY_INBOX_KEY, myMessagesKey } from "@/lib/query-keys";
import type { InboxConversation } from "@/lib/db/conversations";
import type { Message, ConversationStatus } from "@/lib/db/types";
import { type AccessLevel, isReadOnly } from "@/lib/access";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const CONVO_TONE: Record<ConversationStatus, Tone> = {
  open: "blue",
  closed: "green",
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtClock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function MessagesInbox({
  accessLevel,
  currentUserId,
}: {
  accessLevel: AccessLevel;
  currentUserId: string;
}) {
  const readOnly = isReadOnly(accessLevel);
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ----- Inbox list -----
  const { data: inbox, isLoading: inboxLoading } = useQuery({
    queryKey: MY_INBOX_KEY,
    queryFn: listMyInbox,
  });

  const conversations = useMemo(() => inbox ?? [], [inbox]);

  // Wire the search box to actually filter (name, phone, last message).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = c.customer?.name?.toLowerCase() ?? "";
      const phone = c.customer?.wa_phone?.toLowerCase() ?? "";
      const preview = c.preview?.toLowerCase() ?? "";
      return name.includes(q) || phone.includes(q) || preview.includes(q);
    });
  }, [conversations, search]);

  const active: InboxConversation | undefined = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  // ----- Active thread -----
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: activeId ? myMessagesKey(activeId) : ["employee", "messages", "none"],
    queryFn: () => listMyMessages(activeId as string),
    enabled: !!activeId,
  });

  // Keep a ref of the active id for the realtime handler (avoids resubscribing).
  const activeIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // ----- Realtime: live messages + conversations for my assigned chats -----
  // RLS scopes the stream — I only receive events for rows I can SELECT, i.e.
  // conversations assigned to me and their messages.
  useEffect(() => {
    const channel = supabase
      .channel(`employee-inbox-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const convId = (payload.new as { conversation_id?: string })
            ?.conversation_id;
          // Refresh the left list (preview / unread / ordering).
          queryClient.invalidateQueries({ queryKey: MY_INBOX_KEY });
          // Refresh the open thread if the message belongs to it.
          if (convId && convId === activeIdRef.current) {
            queryClient.invalidateQueries({ queryKey: myMessagesKey(convId) });
            // Reading the open thread → keep it marked read.
            markConversationRead(convId).then(() =>
              queryClient.invalidateQueries({ queryKey: MY_INBOX_KEY })
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          // New assignment / status / last_message_at change → refresh list.
          queryClient.invalidateQueries({ queryKey: MY_INBOX_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, currentUserId]);

  // ----- Open a conversation: mark read -----
  function openConversation(id: string) {
    setActiveId(id);
    markConversationRead(id).then(() =>
      queryClient.invalidateQueries({ queryKey: MY_INBOX_KEY })
    );
  }

  // Auto-scroll to newest whenever the thread changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  // ----- Send reply (mock send + optimistic) -----
  const sendMutation = useMutation({
    mutationFn: sendMessage,
    onMutate: async (vars) => {
      const key = myMessagesKey(vars.conversationId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Message[]>(key);
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversation_id: vars.conversationId,
        direction: "outgoing",
        body: vars.body,
        media_url: vars.mediaUrl ?? null,
        sender_id: currentUserId,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Message[]>(key, (old) => [
        ...(old ?? []),
        optimistic,
      ]);
      return { key, previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error("Couldn't send", { description: "Please try again." });
    },
    onSuccess: (res, vars) => {
      if (!res.ok) {
        toast.error("Couldn't send", { description: res.error });
        queryClient.invalidateQueries({ queryKey: myMessagesKey(vars.conversationId) });
        return;
      }
    },
    onSettled: (_res, _err, vars) => {
      // Realtime confirms too, but invalidate so we converge on DB truth.
      queryClient.invalidateQueries({ queryKey: myMessagesKey(vars.conversationId) });
      queryClient.invalidateQueries({ queryKey: MY_INBOX_KEY });
    },
  });

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId || readOnly) return;
    sendMutation.mutate({ conversationId: activeId, body: text });
    setDraft("");
  }

  const thread = messages ?? [];

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[460px] overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {/* LEFT — conversation list */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-border md:w-[330px]",
          active && "hidden md:flex"
        )}
      >
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="h-10 rounded-[10px] bg-neutral-soft pl-9"
            />
          </div>
        </div>

        {inboxLoading ? (
          <div className="flex-1 overflow-hidden">
            <ConversationListSkeleton rows={7} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
              <Inbox className="size-6" />
            </div>
            <p className="font-display text-sm font-semibold text-foreground">
              No conversations yet
            </p>
            <p className="max-w-[16rem] text-xs text-muted-foreground">
              Chats assigned to you will appear here. Ask an admin to assign one,
              or use the simulate tool to test.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            No chats match “{search}”.
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {filtered.map((c) => {
              const isActive = c.id === activeId;
              const name = c.customer?.name || c.customer?.wa_phone || "Unknown";
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors",
                      isActive ? "bg-chip/60" : "hover:bg-neutral-soft"
                    )}
                  >
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-chip text-xs font-semibold text-brand-dark">
                        {initialsOf(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {name}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {fmtRelative(c.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">
                          {c.preview ?? "No messages yet"}
                        </p>
                        {c.unreadCount > 0 ? (
                          <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            {c.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* RIGHT — conversation view */}
      <section className={cn("flex min-w-0 flex-1 flex-col", !active && "hidden md:flex")}>
        {active ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveId(undefined)}
                  aria-label="Back to conversations"
                  className="text-sm text-brand md:hidden"
                >
                  ←
                </button>
                <Avatar className="size-9">
                  <AvatarFallback className="bg-chip text-xs font-semibold text-brand-dark">
                    {initialsOf(active.customer?.name || active.customer?.wa_phone || "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <p className="font-display text-sm font-semibold text-navy">
                    {active.customer?.name || "Unknown customer"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {active.customer?.wa_phone ?? "No phone"}
                  </p>
                </div>
                <StatusBadge tone={CONVO_TONE[active.status]} className="ml-1 hidden sm:inline-flex">
                  {active.status === "open" ? "Open" : "Closed"}
                </StatusBadge>
              </div>
              {!readOnly ? (
                <Button variant="outline" size="sm" onClick={() => setOrderOpen(true)}>
                  <FilePlus2 className="size-4" />
                  <span className="hidden sm:inline">Create order</span>
                </Button>
              ) : null}
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-neutral-soft/50 px-4 py-5 md:px-6"
            >
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading messages…
                </div>
              ) : thread.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No messages yet — say hello.
                </div>
              ) : (
                thread.map((m) => {
                  const mine = m.direction === "outgoing";
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[60%]",
                          mine
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border bg-white text-foreground"
                        )}
                      >
                        {m.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.media_url}
                            alt="attachment"
                            className="mb-1 max-h-60 rounded-lg object-cover"
                          />
                        ) : null}
                        {m.body ? <p className="leading-relaxed">{m.body}</p> : null}
                        <span
                          className={cn(
                            "mt-1 block text-right text-[10px]",
                            mine ? "text-white/70" : "text-muted-foreground"
                          )}
                        >
                          {fmtClock(m.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input / read-only notice */}
            {readOnly ? (
              <div className="flex items-center justify-center gap-2 border-t border-border bg-muted/60 px-4 py-4 text-sm text-muted-foreground">
                <Lock className="size-4" />
                Read-only access — you can view but not reply.
              </div>
            ) : (
              <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Attach image"
                  className="size-10 shrink-0 rounded-full text-muted-foreground"
                  onClick={() =>
                    toast.info("Attach image", {
                      description:
                        "Image upload is a stub — needs a Supabase Storage bucket (see notes).",
                    })
                  }
                >
                  <Paperclip className="size-4" />
                </Button>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  className="h-11 rounded-full bg-neutral-soft"
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send message"
                  className="size-11 shrink-0 rounded-full"
                  disabled={!draft.trim()}
                >
                  <Send className="size-4" />
                </Button>
              </form>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to start.
          </div>
        )}
      </section>

      {/* Create order from this chat */}
      {active ? (
        <CreateOrderDialog
          open={orderOpen}
          onOpenChange={setOrderOpen}
          conversations={conversations}
          presetConversationId={active.id}
        />
      ) : null}
    </div>
  );
}
