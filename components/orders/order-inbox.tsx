"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Paperclip,
  Send,
  Loader2,
  MessagesSquare,
  Lock,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { Panel } from "@/components/ui/section";
import { EmptyState } from "@/components/portal/states";
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
import { createClient } from "@/lib/supabase/client";
import { listOrderMessages, sendOrderMessage } from "@/lib/actions/orders";
import { orderMessagesKey } from "@/lib/query-keys";
import { ROLE_LABEL, senderLabelFlags } from "@/lib/chat/labels";
import { type AccessLevel, isReadOnly } from "@/lib/access";
import {
  uploadOrderAttachment,
  validateAttachment,
  ATTACHMENT_ACCEPT,
} from "@/lib/storage";
import type { OrderMessage, OrderStatus, SenderRole } from "@/lib/db/types";
import { cn } from "@/lib/utils";

function fmtClock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/**
 * The per-order dedicated inbox — a realtime chat thread scoped to ONE order,
 * shared by the admin, employee and customer order-detail views. RLS scopes both
 * the reads and the realtime stream to the order's participants.
 *
 * The customer is LOCKED OUT once the order is completed/cancelled: the composer
 * is replaced by a polite notice. This is enforced server-side too (RLS +
 * sendOrderMessage), so hiding the composer is defence-in-depth, not the gate.
 * Admin/employee can always send and the full history stays visible to everyone.
 */
export function OrderInbox({
  orderId,
  status,
  viewerRole,
  currentUserId,
  accessLevel = "full",
}: {
  orderId: string;
  status: OrderStatus;
  viewerRole: SenderRole;
  currentUserId: string;
  /** Employee access level — used to mirror the server-side read-only gate. */
  accessLevel?: AccessLevel;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const messagesKey = useMemo(() => orderMessagesKey(orderId), [orderId]);

  const locked = status === "completed" || status === "cancelled";
  // An employee with view_only access can read but never send — the server (RLS)
  // already rejects their writes, so we hide the composer for UI parity.
  const readOnly = viewerRole === "employee" && isReadOnly(accessLevel);
  // Customers can't send on a locked order; staff always can (unless read-only).
  const canSend = (viewerRole !== "customer" || !locked) && !readOnly;
  // Only the team shares the customer-facing booking link.
  const isStaff = viewerRole !== "customer";

  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<OrderMessage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: messagesKey,
    queryFn: () => listOrderMessages(orderId),
  });
  const thread = useMemo(() => messages ?? [], [messages]);

  // id → message, so a reply can resolve its quoted preview from the loaded thread.
  const byId = useMemo(() => {
    const map = new Map<string, OrderMessage>();
    for (const m of thread) map.set(m.id, m);
    return map;
  }, [thread]);

  const quotedRefOf = (m: OrderMessage): QuotedRef => ({
    label: ROLE_LABEL[m.sender_role],
    body: m.body,
    hasAttachment: !!m.media_url,
  });

  function jumpToMessage(id: string) {
    const el = document.getElementById(`omsg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-marine/50");
      setTimeout(() => el.classList.remove("ring-2", "ring-marine/50"), 1200);
    }
  }

  // Realtime: any new message/attachment on THIS order refetches. RLS already
  // scopes the stream to participants, so we just listen for this order_id.
  useEffect(() => {
    const channel = supabase
      .channel(`order-inbox-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_messages",
          filter: `order_id=eq.${orderId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: messagesKey })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, orderId, messagesKey]);

  // Keep the thread pinned to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread]);

  const sendMutation = useMutation({
    mutationFn: sendOrderMessage,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData<OrderMessage[]>(messagesKey);
      const optimistic: OrderMessage = {
        id: `optimistic-${Date.now()}`,
        order_id: orderId,
        sender_id: currentUserId,
        sender_role: viewerRole,
        body: vars.body.trim() || null,
        // displayUrl (signed) for the optimistic bubble only; the refetch re-signs.
        media_url: vars.attachment?.path ?? null,
        reply_to_id: vars.replyToId ?? null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<OrderMessage[]>(messagesKey, (old) => [
        ...(old ?? []),
        optimistic,
      ]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(messagesKey, ctx.previous);
      toast.error("Couldn't send", { description: "Please try again." });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't send", { description: res.error });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey });
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file || !canSend) return;
    const valid = validateAttachment(file);
    if (!valid.ok) {
      toast.error("Can't attach file", { description: valid.error });
      return;
    }
    setPendingFile(file);
  }

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSend || uploading) return;
    const text = draft.trim();
    if (!text && !pendingFile) return;

    const replyToId = replyingTo?.id ?? null;

    // Upload the pending attachment (if any) only now, on Send. The order path is
    // access-scoped, so the upload itself is gated to order participants.
    if (pendingFile) {
      setUploading(true);
      const result = await uploadOrderAttachment(pendingFile, orderId);
      setUploading(false);
      if (!result.ok) {
        toast.error("Upload failed", { description: result.error });
        return;
      }
      sendMutation.mutate({
        orderId,
        body: text,
        replyToId,
        attachment: {
          path: result.path,
          name: result.name,
          mime: pendingFile.type || null,
          size: pendingFile.size,
        },
      });
      setPendingFile(null);
      setDraft("");
      setReplyingTo(null);
      return;
    }

    sendMutation.mutate({ orderId, body: text, replyToId });
    setDraft("");
    setReplyingTo(null);
  }

  const labelFlags = senderLabelFlags(thread, (m) => m.sender_id ?? m.sender_role);

  return (
    <Panel className="overflow-hidden">
      <div className="flex h-[440px] flex-col">
        {/* Header — back to the orders list + thread title */}
        <div className="flex items-center gap-2.5 border-b border-line bg-surface px-3 py-3">
          <ChatBackButton onClick={() => router.back()} label="Back to orders" />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-ui text-tx-head">
              Order chat
            </p>
            <p className="text-[13px] text-tx-muted">
              Messages about this specific booking — visible to you and the
              Wicket Travel team.
            </p>
          </div>
        </div>

        {/* Thread — on canvas, so the bubbles are the surfaces. */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-5 md:px-6"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-[14.5px] text-tx-muted">
              <Loader2 className="size-4 animate-spin" />
              Loading messages…
            </div>
          ) : thread.length === 0 ? (
            <EmptyState
              icon={<MessagesSquare />}
              title="No messages yet"
              description={
                canSend
                  ? "Start the conversation about this booking below."
                  : "There are no messages on this order."
              }
              className="h-full py-0"
            />
          ) : (
            thread.map((m, i) => {
              const mine = m.sender_id === currentUserId;
              const showLabel = labelFlags[i];
              const quoted = m.reply_to_id ? byId.get(m.reply_to_id) : undefined;
              const isOptimistic = m.id.startsWith("optimistic-");
              return (
                <div
                  key={m.id}
                  className={cn(
                    "group flex animate-in fade-in slide-in-from-bottom-1 duration-200",
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
                    {canSend && !isOptimistic ? (
                      <MessageReplyButton onClick={() => setReplyingTo(m)} />
                    ) : null}
                    <div className="min-w-0">
                      {/* Who is speaking, once per run — Admin · Support Team ·
                          Customer. A micro-label, like every other tag. */}
                      {showLabel ? (
                        <span
                          className={cn(
                            "mb-1.5 block font-micro text-tx-faint",
                            mine ? "text-right" : "text-left"
                          )}
                        >
                          {ROLE_LABEL[m.sender_role]}
                        </span>
                      ) : null}
                      <div
                        id={`omsg-${m.id}`}
                        className={cn(
                          "rounded-card px-3.5 py-2.5 text-[14.5px] leading-[1.6] transition-colors duration-150 ease-brand",
                          // Flat fills, one radius. The side tells you who spoke.
                          mine
                            ? "bg-marine text-tx-invert"
                            : "rounded-card border border-line bg-surface text-tx-body"
                        )}
                      >
                        {quoted ? (
                          <QuotedMessage
                            quoted={quotedRefOf(quoted)}
                            mine={mine}
                            onJump={() => jumpToMessage(quoted.id)}
                          />
                        ) : null}
                        {m.media_url ? (
                          <MessageAttachment url={m.media_url} mine={mine} />
                        ) : null}
                        {m.body ? <MessageText text={m.body} mine={mine} /> : null}
                        <span
                          className={cn(
                            "tabular mt-1 block text-right text-[12.5px]",
                            mine ? "text-tx-rail-dim" : "text-tx-muted"
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

        {/* Composer, or the notice that says why there isn't one */}
        {canSend ? (
          <form onSubmit={send} className="border-t border-line bg-surface px-3 py-3">
            {replyingTo ? (
              <ReplyComposerBar
                quoted={quotedRefOf(replyingTo)}
                onCancel={() => setReplyingTo(null)}
              />
            ) : null}
            {pendingFile ? (
              <div className="mb-2 flex items-center gap-2.5 rounded-chip border border-line bg-sunk px-2.5 py-2">
                {pendingPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pendingPreview}
                    alt={pendingFile.name}
                    className="size-10 shrink-0 rounded-chip object-cover"
                  />
                ) : (
                  <IconChip tone="marine" className="size-10 [&_svg]:size-[18px]">
                    <FileText />
                  </IconChip>
                )}
                <span className="min-w-0 flex-1 truncate text-[14.5px] text-tx-body">
                  {pendingFile.name}
                </span>
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => setPendingFile(null)}
                  disabled={uploading}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-chip text-tx-faint outline-none transition-colors duration-150 ease-brand hover:bg-surface hover:text-tx-head focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-coral disabled:opacity-50"
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
                size="icon"
                aria-label="Attach file"
                disabled={uploading}
                className="shrink-0 text-tx-muted hover:text-marine"
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip />
              </Button>
              {isStaff ? (
                <SendOrderLinkButton
                  disabled={uploading}
                  onSend={(body) => sendMutation.mutate({ orderId, body })}
                />
              ) : null}
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={pendingFile ? "Add a caption…" : "Type a message…"}
                aria-label="Message"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send message"
                className="shrink-0"
                disabled={(!draft.trim() && !pendingFile) || uploading}
              >
                {uploading ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </div>
          </form>
        ) : (
          /* Closed, not broken. The thread above stays fully readable — this bar
             only says why there is no composer. */
          <div className="flex items-center justify-center gap-2.5 border-t border-line bg-sunk px-4 py-4 text-center">
            <Lock className="size-4 shrink-0 text-tx-faint" />
            <p className="text-[14.5px] text-tx-muted">
              {readOnly
                ? "Read-only access — you can view this thread but not reply."
                : `This order is ${
                    status === "completed" ? "completed" : "cancelled"
                  }, so messaging is closed.`}
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
