"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plane,
  Send,
  Paperclip,
  Loader2,
  MessageCircle,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageAttachment } from "@/components/portal/message-attachment";
import { MessageText } from "@/components/portal/message-text";
import { ChatBackButton } from "@/components/portal/chat-back-button";
import {
  MessageReplyButton,
  QuotedMessage,
  ReplyComposerBar,
  type QuotedRef,
} from "@/components/portal/chat-reply";
import { ROLE_LABEL, senderLabelFlags } from "@/lib/chat/labels";
import { createClient } from "@/lib/supabase/client";
import { getMyThread, sendCustomerMessage } from "@/lib/actions/customer";
import { CUSTOMER_THREAD_KEY } from "@/lib/query-keys";
import {
  uploadAttachment,
  validateAttachment,
  ATTACHMENT_ACCEPT,
} from "@/lib/storage";
import type { Message } from "@/lib/db/types";
import { cn } from "@/lib/utils";

function fmtClock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function CustomerMessagesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: CUSTOMER_THREAD_KEY,
    queryFn: getMyThread,
  });

  const conversation = data?.conversation ?? null;
  const messages = useMemo(() => data?.messages ?? [], [data]);
  const conversationId = conversation?.id;

  // Realtime: my conversation's messages (RLS limits the stream to my own).
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`customer-thread-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: CUSTOMER_THREAD_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, conversationId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMutation = useMutation({
    // mediaUrl is the stored object PATH; displayUrl is a signed URL used only for
    // the optimistic bubble (it isn't persisted — the refetch re-signs the path).
    mutationFn: (vars: {
      conversationId: string;
      body: string;
      mediaUrl?: string | null;
      displayUrl?: string | null;
      replyToId?: string | null;
    }) => sendCustomerMessage(vars),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: CUSTOMER_THREAD_KEY });
      const previous = queryClient.getQueryData<typeof data>(CUSTOMER_THREAD_KEY);
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversation_id: vars.conversationId,
        direction: "incoming",
        body: vars.body,
        media_url: vars.displayUrl ?? vars.mediaUrl ?? null,
        sender_id: null,
        reply_to_id: vars.replyToId ?? null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData(CUSTOMER_THREAD_KEY, (old: typeof data) =>
        old
          ? { ...old, messages: [...old.messages, optimistic] }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(CUSTOMER_THREAD_KEY, ctx.previous);
      toast.error("Couldn't send", { description: "Please try again." });
    },
    onSuccess: (res) => {
      if (!res.ok) toast.error("Couldn't send", { description: res.error });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: CUSTOMER_THREAD_KEY }),
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
    if (!conversationId || uploading) return;
    const text = draft.trim();
    if (!text && !pendingFile) return;

    const replyToId = replyingTo?.id ?? null;

    // Upload the pending attachment (if any) only now, on Send.
    if (pendingFile) {
      setUploading(true);
      const result = await uploadAttachment(pendingFile, conversationId);
      setUploading(false);
      if (!result.ok) {
        toast.error("Upload failed", { description: result.error });
        return;
      }
      sendMutation.mutate({
        conversationId,
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

    sendMutation.mutate({ conversationId, body: text, replyToId });
    setDraft("");
    setReplyingTo(null);
  }

  // Pick a file → ATTACH it as a pending preview; don't send until Send.
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const valid = validateAttachment(file);
    if (!valid.ok) {
      toast.error("Can't attach file", { description: valid.error });
      return;
    }
    setPendingFile(file);
  }

  // Fixed role labels, shown once per consecutive run (no-repeat-in-a-row). The
  // customer's own messages are stored 'incoming'; the team's replies 'outgoing'.
  const labelFlags = senderLabelFlags(messages, (m) => m.direction);

  // id → message, so a reply resolves its quoted preview from the loaded thread.
  const byId = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  const quotedRefOf = (m: Message): QuotedRef => ({
    // In this portal the customer's own (incoming) messages are "You".
    label: m.direction === "incoming" ? ROLE_LABEL.customer : ROLE_LABEL.employee,
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
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-tx-head sm:text-2xl">
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat with the Wicket Travel team about your trips.
        </p>
      </div>

      <div className="flex h-[calc(100dvh-16rem)] min-h-[420px] flex-col overflow-hidden rounded-surface border border-border bg-card shadow-lift">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <ChatBackButton onClick={() => router.back()} label="Go back" />
          <div className="relative">
            <div className="flex size-10 items-center justify-center rounded-full bg-sky-tint text-ocean">
              <Plane className="size-5 -rotate-45" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-jade" />
          </div>
          <div className="leading-tight">
            <p className="tracking-heading text-sm font-semibold text-tx-head">Wicket Travel Team</p>
            <p className="text-xs text-jade">Typically replies in minutes</p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto bg-sunk/50 px-4 py-5 md:px-6"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : !conversation ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-surface bg-sky-tint text-ocean-deep">
                <MessageCircle className="size-6" />
              </div>
              <p className="tracking-heading text-sm font-semibold text-foreground">
                No conversation yet
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Your chat with the team will appear here. Request a quote or send
                a message and we&apos;ll be in touch right here in the portal.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No messages yet — say hello.
            </div>
          ) : (
            messages.map((m, i) => {
              // Customer's own messages are stored as 'incoming' (inbound to the
              // business); in THIS portal they're "mine" → right/orange.
              const mine = m.direction === "incoming";
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
                      "flex max-w-[78%] items-center gap-1.5 sm:max-w-[65%]",
                      mine ? "flex-row" : "flex-row-reverse"
                    )}
                  >
                    {conversation && !isOptimistic ? (
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
                          {mine ? ROLE_LABEL.customer : ROLE_LABEL.employee}
                        </span>
                      ) : null}
                      <div
                        id={`cmsg-${m.id}`}
                        className={cn(
                          "rounded-surface px-3.5 py-2 text-sm transition-colors",
                          mine
                            ? "bg-ocean text-tx-invert"
                            : "border border-line bg-surface text-tx-body"
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

        {/* Input */}
        <form
          onSubmit={send}
          className="border-t border-border bg-card px-4 py-3"
        >
          {replyingTo ? (
            <ReplyComposerBar
              quoted={quotedRefOf(replyingTo)}
              onCancel={() => setReplyingTo(null)}
            />
          ) : null}
          {pendingFile ? (
            <div className="mb-2 flex items-center gap-2.5 rounded-surface border border-border bg-sunk px-2.5 py-2">
              {pendingPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pendingPreview}
                  alt={pendingFile.name}
                  className="size-10 shrink-0 rounded-control object-cover"
                />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-sky-tint text-ocean-deep">
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
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-chip text-tx-muted transition-colors hover:bg-sunk hover:text-tx-head disabled:opacity-50"
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
              disabled={!conversation || uploading}
              className="shrink-0 text-tx-muted"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                conversation
                  ? pendingFile
                    ? "Add a caption…"
                    : "Type a message…"
                  : "No conversation yet"
              }
              disabled={!conversation}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              className="shrink-0"
              disabled={(!draft.trim() && !pendingFile) || !conversation || uploading}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Messages are delivered live to our team — we&apos;ll reply right here in your portal.
      </p>
    </div>
  );
}
