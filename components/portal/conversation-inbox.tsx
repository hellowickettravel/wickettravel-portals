"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Paperclip,
  Send,
  FilePlus2,
  Lock,
  Search,
  Inbox,
  Loader2,
  CheckCircle2,
  RotateCcw,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { ConversationListSkeleton } from "@/components/portal/skeletons";
import { MessageAttachment } from "@/components/portal/message-attachment";
import { MessageText } from "@/components/portal/message-text";
import { ChatBackButton } from "@/components/portal/chat-back-button";
import { SendOrderLinkButton } from "@/components/portal/send-order-link-button";
import {
  MessageReplyButton,
  QuotedMessage,
  ReplyComposerBar,
  type QuotedRef,
} from "@/components/portal/chat-reply";
import { ROLE_LABEL, senderLabelFlags } from "@/lib/chat/labels";
import { createClient } from "@/lib/supabase/client";
import {
  listMyInbox,
  listMyMessages,
  sendMessage,
  markConversationRead,
} from "@/lib/actions/employee";
import {
  listAdminInbox,
  listAdminMessages,
  adminSendMessage,
  listEmployees,
  setConversationAssignee,
  setConversationStatus,
} from "@/lib/actions/admin";
import {
  MY_INBOX_KEY,
  myMessagesKey,
  ADMIN_INBOX_KEY,
  adminMessagesKey,
} from "@/lib/query-keys";
import {
  uploadAttachment,
  validateAttachment,
  ATTACHMENT_ACCEPT,
} from "@/lib/storage";
import type { InboxConversation } from "@/lib/db/conversations";
import type { Message, ConversationStatus } from "@/lib/db/types";
import { type AccessLevel, isReadOnly, canCreateOrders } from "@/lib/access";
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

type Scope = "admin" | "employee";

/**
 * Shared two-pane chat inbox used by BOTH the employee and admin portals.
 * `scope` selects the data-access actions, channel, and capabilities:
 *   - employee: assignment-scoped, respects access level (view_only = read-only),
 *               unread tracking, "create order from chat"
 *   - admin:    full access to every conversation, always read+reply, no order CTA
 * Realtime (RLS-scoped) keeps both live.
 */
export function ConversationInbox({
  scope,
  currentUserId,
  accessLevel = "full",
}: {
  scope: Scope;
  currentUserId: string;
  accessLevel?: AccessLevel;
}) {
  const isAdmin = scope === "admin";
  const readOnly = !isAdmin && isReadOnly(accessLevel);
  // full + semi_admin may create orders. chat_only has no orders access and
  // view_only is read-only — both are blocked server-side AND by RLS, so don't
  // surface the CTA to them.
  const canCreateOrder = !isAdmin && canCreateOrders(accessLevel);

  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const inboxKey = isAdmin ? ADMIN_INBOX_KEY : MY_INBOX_KEY;
  const messagesKeyFor = isAdmin ? adminMessagesKey : myMessagesKey;
  const loadInbox = isAdmin ? listAdminInbox : listMyInbox;
  const loadMessages = isAdmin ? listAdminMessages : listMyMessages;
  const sendAction = isAdmin ? adminSendMessage : sendMessage;

  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ----- Inbox list -----
  const { data: inbox, isLoading: inboxLoading } = useQuery({
    queryKey: inboxKey,
    queryFn: loadInbox,
  });
  const conversations = useMemo(() => inbox ?? [], [inbox]);

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

  // Admin-only: active employees for the reassign dropdown.
  const { data: employeesData } = useQuery({
    queryKey: ["admin", "inbox", "employees"],
    queryFn: listEmployees,
    enabled: isAdmin,
  });
  const activeEmployees = useMemo(
    () => (employeesData ?? []).filter((e) => e.is_active),
    [employeesData]
  );

  const assignMutation = useMutation({
    mutationFn: setConversationAssignee,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't reassign", { description: res.error });
        return;
      }
      toast.success("Conversation reassigned");
      queryClient.invalidateQueries({ queryKey: inboxKey });
    },
    onError: () =>
      toast.error("Couldn't reassign", { description: "Please try again." }),
  });

  const statusMutation = useMutation({
    mutationFn: setConversationStatus,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't update conversation", { description: res.error });
        return;
      }
      toast.success("Conversation updated");
      queryClient.invalidateQueries({ queryKey: inboxKey });
    },
    onError: () =>
      toast.error("Couldn't update conversation", { description: "Please try again." }),
  });

  // ----- Active thread -----
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: activeId ? messagesKeyFor(activeId) : [scope, "messages", "none"],
    queryFn: () => loadMessages(activeId as string),
    enabled: !!activeId,
  });

  const activeIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // ----- Realtime (RLS-scoped to what this user can SELECT) -----
  useEffect(() => {
    const channel = supabase
      .channel(`${scope}-inbox-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const convId = (payload.new as { conversation_id?: string })
            ?.conversation_id;
          queryClient.invalidateQueries({ queryKey: inboxKey });
          if (convId && convId === activeIdRef.current) {
            queryClient.invalidateQueries({ queryKey: messagesKeyFor(convId) });
            if (!isAdmin) {
              markConversationRead(convId).then(() =>
                queryClient.invalidateQueries({ queryKey: inboxKey })
              );
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => queryClient.invalidateQueries({ queryKey: inboxKey })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, queryClient, currentUserId, scope]);

  function openConversation(id: string) {
    setActiveId(id);
    setReplyingTo(null);
    if (!isAdmin) {
      markConversationRead(id).then(() =>
        queryClient.invalidateQueries({ queryKey: inboxKey })
      );
    }
  }

  // Deep-link: a notification link like `…/messages?c=<id>` auto-opens that chat
  // once the inbox has loaded. Runs once so the user can still navigate away.
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (deepLinkedRef.current || conversations.length === 0) return;
    const target = new URLSearchParams(window.location.search).get("c");
    if (target && conversations.some((c) => c.id === target)) {
      deepLinkedRef.current = true;
      // One-time sync from the URL deep-link into local selection state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openConversation(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  // ----- Send reply (mock save + optimistic) -----
  const sendMutation = useMutation({
    // mediaUrl is the stored object PATH; displayUrl is a signed URL used only for
    // the optimistic bubble (it isn't persisted — the refetch re-signs the path).
    mutationFn: (vars: {
      conversationId: string;
      body: string;
      mediaUrl?: string | null;
      displayUrl?: string | null;
      replyToId?: string | null;
    }) => sendAction(vars),
    onMutate: async (vars) => {
      const key = messagesKeyFor(vars.conversationId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Message[]>(key);
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversation_id: vars.conversationId,
        direction: "outgoing",
        body: vars.body,
        media_url: vars.displayUrl ?? vars.mediaUrl ?? null,
        sender_id: currentUserId,
        reply_to_id: vars.replyToId ?? null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Message[]>(key, (old) => [...(old ?? []), optimistic]);
      return { key, previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error("Couldn't send", { description: "Please try again." });
    },
    onSuccess: (res, vars) => {
      if (!res.ok) {
        toast.error("Couldn't send", { description: res.error });
        queryClient.invalidateQueries({ queryKey: messagesKeyFor(vars.conversationId) });
      }
    },
    onSettled: (_res, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: messagesKeyFor(vars.conversationId) });
      queryClient.invalidateQueries({ queryKey: inboxKey });
    },
  });

  // Preview a pending image attachment before it's sent.
  const pendingPreview = useMemo(
    () =>
      pendingFile && pendingFile.type.startsWith("image/")
        ? URL.createObjectURL(pendingFile)
        : null,
    [pendingFile]
  );
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeId || readOnly || uploading) return;
    const text = draft.trim();
    if (!text && !pendingFile) return;

    const replyToId = replyingTo?.id ?? null;

    // Upload the pending attachment (if any) only now, on Send.
    if (pendingFile) {
      setUploading(true);
      const result = await uploadAttachment(pendingFile, activeId);
      setUploading(false);
      if (!result.ok) {
        toast.error("Upload failed", { description: result.error });
        return;
      }
      sendMutation.mutate({
        conversationId: activeId,
        body: text,
        mediaUrl: result.path,
        displayUrl: result.url,
        replyToId,
      });
      setPendingFile(null);
      setDraft("");
      setReplyingTo(null);
      return;
    }

    sendMutation.mutate({ conversationId: activeId, body: text, replyToId });
    setDraft("");
    setReplyingTo(null);
  }

  // Pick a file → ATTACH it as a pending preview; don't send until Send.
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file || readOnly) return;
    const valid = validateAttachment(file);
    if (!valid.ok) {
      toast.error("Can't attach file", { description: valid.error });
      return;
    }
    setPendingFile(file);
  }

  const thread = useMemo(() => messages ?? [], [messages]);
  // Group consecutive messages from the same side so the fixed role label shows
  // only once per run (no-repeat-in-a-row). Incoming = the customer; outgoing =
  // this staff viewer (Admin for the admin scope, Support Team for an employee).
  const labelFlags = senderLabelFlags(thread, (m) => m.direction);
  const outgoingLabel = isAdmin ? ROLE_LABEL.admin : ROLE_LABEL.employee;

  // id → message, so a reply resolves its quoted preview from the loaded thread.
  const byId = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of thread) map.set(m.id, m);
    return map;
  }, [thread]);

  const quotedRefOf = (m: Message): QuotedRef => ({
    label: m.direction === "outgoing" ? outgoingLabel : ROLE_LABEL.customer,
    body: m.body,
    hasAttachment: !!m.media_url,
  });

  function jumpToMessage(id: string) {
    const el = document.getElementById(`cmsg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-ocean/50");
      setTimeout(() => el.classList.remove("ring-2", "ring-ocean/50"), 1200);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[460px] overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
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
              className="pl-9"
            />
          </div>
        </div>

        {inboxLoading ? (
          <div className="flex-1 overflow-hidden">
            <ConversationListSkeleton rows={7} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-tint text-ocean-deep">
              <Inbox className="size-6" />
            </div>
            <p className="tracking-heading text-sm font-semibold text-foreground">
              No conversations yet
            </p>
            <p className="max-w-[16rem] text-xs text-muted-foreground">
              {isAdmin
                ? "Conversations appear here as customers message in. Use the dev tools above to simulate one."
                : "Chats assigned to you will appear here."}
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
                      "flex w-full items-center gap-3 border-b border-l-2 border-border/70 px-4 py-3 text-left outline-none transition-colors focus-visible:bg-sunk focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
                      isActive
                        ? "border-l-primary bg-sky-tint/70"
                        : "border-l-transparent hover:bg-sunk"
                    )}
                  >
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-sky-tint text-xs font-semibold text-ocean-deep">
                        {initialsOf(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{name}</p>
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
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <ChatBackButton
                  onClick={() => {
                    setActiveId(undefined);
                    setReplyingTo(null);
                  }}
                  label="Back to conversations"
                />
                <Avatar className="size-9">
                  <AvatarFallback className="bg-sky-tint text-xs font-semibold text-ocean-deep">
                    {initialsOf(active.customer?.name || active.customer?.wa_phone || "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <p className="tracking-heading text-sm font-semibold text-tx-head">
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
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <>
                    <select
                      aria-label="Assign conversation to employee"
                      value={active.assignedEmployeeId ?? ""}
                      disabled={assignMutation.isPending}
                      onChange={(e) =>
                        assignMutation.mutate({
                          conversationId: active.id,
                          employeeId: e.target.value || null,
                        })
                      }
                      className="h-9 max-w-[10rem] rounded-[10px] border border-input bg-sunk px-2.5 text-base text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/30 disabled:opacity-50 sm:text-sm"
                    >
                      <option value="">Unassigned</option>
                      {activeEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name || emp.email || "Employee"}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          conversationId: active.id,
                          status: active.status === "open" ? "closed" : "open",
                        })
                      }
                    >
                      {active.status === "open" ? (
                        <>
                          <CheckCircle2 className="size-4" />
                          <span className="hidden sm:inline">Close</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="size-4" />
                          <span className="hidden sm:inline">Reopen</span>
                        </>
                      )}
                    </Button>
                  </>
                ) : null}
                {canCreateOrder ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/employee/orders/new?c=${active.id}`} />}
                  >
                    <FilePlus2 className="size-4" />
                    <span className="hidden sm:inline">Create order</span>
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-sunk/50 px-4 py-5 md:px-6"
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
                thread.map((m, i) => {
                  const mine = m.direction === "outgoing";
                  const showLabel = labelFlags[i];
                  const quoted = m.reply_to_id ? byId.get(m.reply_to_id) : undefined;
                  const isOptimistic = m.id.startsWith("optimistic-");
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "group flex",
                        mine ? "justify-end" : "justify-start",
                        // Tighten the gap for continued messages in the same run.
                        !showLabel && "-mt-1.5"
                      )}
                    >
                      <div
                        className={cn(
                          "flex max-w-[80%] items-center gap-1.5 sm:max-w-[60%]",
                          mine ? "flex-row" : "flex-row-reverse"
                        )}
                      >
                        {!readOnly && !isOptimistic ? (
                          <MessageReplyButton onClick={() => setReplyingTo(m)} />
                        ) : null}
                        <div className="min-w-0">
                          {showLabel ? (
                            <span
                              className={cn(
                                "mb-1 block text-[11px] font-medium text-muted-foreground",
                                mine ? "text-right" : "text-left"
                              )}
                            >
                              {mine ? outgoingLabel : ROLE_LABEL.customer}
                            </span>
                          ) : null}
                          <div
                            id={`cmsg-${m.id}`}
                            className={cn(
                              "rounded-2xl px-3.5 py-2 text-sm shadow-sm transition-shadow",
                              mine
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md border border-border bg-white text-foreground"
                            )}
                          >
                            {quoted ? (
                              <QuotedMessage
                                quoted={quotedRefOf(quoted)}
                                mine={mine}
                                onJump={() => jumpToMessage(quoted.id)}
                              />
                            ) : null}
                            {m.media_url ? <MessageAttachment url={m.media_url} mine={mine} /> : null}
                            {m.body ? <MessageText text={m.body} mine={mine} /> : null}
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
              <form onSubmit={send} className="border-t border-border bg-card px-3 py-3">
                {replyingTo ? (
                  <ReplyComposerBar
                    quoted={quotedRefOf(replyingTo)}
                    onCancel={() => setReplyingTo(null)}
                  />
                ) : null}
                {pendingFile ? (
                  <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-border bg-sunk px-2.5 py-2">
                    {pendingPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pendingPreview}
                        alt={pendingFile.name}
                        className="size-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-tint text-ocean-deep">
                        <FileText className="size-5" />
                      </div>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {pendingFile.name}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove attachment"
                      onClick={() => setPendingFile(null)}
                      disabled={uploading}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ATTACHMENT_ACCEPT}
                    className="hidden"
                    onChange={handleFile}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Attach file"
                    disabled={uploading}
                    className="shrink-0 text-tx-muted"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip className="size-4" />
                  </Button>
                  {activeId ? (
                    <SendOrderLinkButton
                      disabled={uploading}
                      onSend={(body) =>
                        sendMutation.mutate({ conversationId: activeId, body })
                      }
                    />
                  ) : null}
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={pendingFile ? "Add a caption…" : "Type a message…"}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    aria-label="Send message"
                    className="shrink-0"
                    disabled={(!draft.trim() && !pendingFile) || uploading}
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </Button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to start.
          </div>
        )}
      </section>

    </div>
  );
}
