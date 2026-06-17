"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plane, Send, Paperclip, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageAttachment } from "@/components/portal/message-attachment";
import { createClient } from "@/lib/supabase/client";
import { getMyThread, sendCustomerMessage } from "@/lib/actions/customer";
import { CUSTOMER_THREAD_KEY } from "@/lib/query-keys";
import { uploadAttachment, ATTACHMENT_ACCEPT } from "@/lib/storage";
import type { Message } from "@/lib/db/types";
import { cn } from "@/lib/utils";

function fmtClock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function CustomerMessagesPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
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
    mutationFn: (vars: { conversationId: string; body: string; mediaUrl?: string | null }) =>
      sendCustomerMessage(vars),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: CUSTOMER_THREAD_KEY });
      const previous = queryClient.getQueryData<typeof data>(CUSTOMER_THREAD_KEY);
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversation_id: vars.conversationId,
        direction: "incoming",
        body: vars.body,
        media_url: vars.mediaUrl ?? null,
        sender_id: null,
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

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !conversationId) return;
    sendMutation.mutate({ conversationId, body: text });
    setDraft("");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !conversationId) return;
    setUploading(true);
    const result = await uploadAttachment(file, conversationId);
    if (!result.ok) {
      setUploading(false);
      toast.error("Upload failed", { description: result.error });
      return;
    }
    sendMutation.mutate(
      { conversationId, body: "", mediaUrl: result.url },
      { onSettled: () => setUploading(false) }
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-navy sm:text-2xl">
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat with the Wicket team about your trips.
        </p>
      </div>

      <div className="flex h-[calc(100dvh-16rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <div className="relative">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Plane className="size-5 -rotate-45" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold text-navy">Wicket Team</p>
            <p className="text-xs text-emerald-600">Typically replies in minutes</p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto bg-neutral-soft/50 px-4 py-5 md:px-6"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : !conversation ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
                <MessageCircle className="size-6" />
              </div>
              <p className="font-display text-sm font-semibold text-foreground">
                No conversation yet
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Your chat with the team will appear here. Request a quote and
                we&apos;ll be in touch — your real conversations happen on WhatsApp.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No messages yet — say hello.
            </div>
          ) : (
            messages.map((m) => {
              // Customer's own messages are stored as 'incoming' (inbound to the
              // business); in THIS portal they're "mine" → right/blue.
              const mine = m.direction === "incoming";
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[65%]",
                      mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border bg-white text-foreground"
                    )}
                  >
                    {m.media_url ? <MessageAttachment url={m.media_url} mine={mine} /> : null}
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

        {/* Input */}
        <form
          onSubmit={send}
          className="flex items-center gap-2 border-t border-border bg-card px-4 py-3"
        >
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
            disabled={!conversation || uploading}
            className="size-10 shrink-0 rounded-full text-muted-foreground"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          </Button>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={conversation ? "Type a message…" : "No conversation yet"}
            disabled={!conversation}
            className="h-11 rounded-full bg-neutral-soft"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            className="size-11 shrink-0 rounded-full"
            disabled={!draft.trim() || !conversation}
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        This is a portal mirror of your WhatsApp chat — your real conversations stay on WhatsApp.
      </p>
    </div>
  );
}
