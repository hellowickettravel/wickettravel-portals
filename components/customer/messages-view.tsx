"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getMyThread, sendCustomerMessage } from "@/lib/actions/customer";
import { CUSTOMER_THREAD_KEY } from "@/lib/query-keys";
import {
  ATTACHMENT_ACCEPT,
  uploadAttachment,
  validateAttachment,
} from "@/lib/storage";
import { ROLE_LABEL } from "@/lib/chat/labels";
import type { Message } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import {
  AttachIcon,
  ImageIcon,
  PlaneIcon,
  SendIcon,
} from "@/components/admin/icons";
import {
  AdminMessageAttachment,
  AdminMessageText,
} from "@/components/admin/message-bits";
import {
  Card,
  PageHead,
  Screen,
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

const TEAM_NAME = "Wicket Travel";

/**
 * The traveller's chat with the team, in the design's thread language — day
 * dividers, 32px tinted avatars, marine own-bubbles with the design's
 * 14/14/4/14 corner, and the 42px circular send.
 *
 * A customer has exactly one conversation, so this is a single thread rather
 * than the staff portals' two-pane inbox. Same server actions, same realtime
 * channel, same RLS: the stream only ever carries their own conversation.
 */
export function CustomerMessages({ customerName }: { customerName: string }) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: CUSTOMER_THREAD_KEY,
    queryFn: getMyThread,
  });

  const conversation = data?.conversation ?? null;
  const thread = useMemo(() => data?.messages ?? [], [data]);
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

  // Pin to the newest message whenever the thread grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length]);

  const send = useMutation({
    mutationFn: (vars: {
      body: string;
      mediaUrl?: string | null;
      displayUrl?: string | null;
    }) =>
      sendCustomerMessage({
        conversationId,
        body: vars.body,
        mediaUrl: vars.mediaUrl ?? null,
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: CUSTOMER_THREAD_KEY });
      const previous = queryClient.getQueryData<typeof data>(CUSTOMER_THREAD_KEY);
      // mediaUrl is the stored object PATH; displayUrl is a signed URL used only
      // for the optimistic bubble (the refetch re-signs the path).
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversationId ?? "",
        direction: "incoming",
        body: vars.body,
        media_url: vars.displayUrl ?? vars.mediaUrl ?? null,
        sender_id: null,
        reply_to_id: null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData(CUSTOMER_THREAD_KEY, (old: typeof data) =>
        old ? { ...old, messages: [...old.messages, optimistic] } : old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(CUSTOMER_THREAD_KEY, ctx.previous);
      }
      toast.error("Couldn't send", { description: "Please try again." });
    },
    onSuccess: (res) => {
      if (!res.ok) toast.error("Couldn't send", { description: res.error });
      else setDraft("");
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: CUSTOMER_THREAD_KEY }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || uploading || send.isPending) return;
    send.mutate({ body });
  }

  async function attach(file: File) {
    if (!conversationId) return;
    const check = validateAttachment(file);
    if (!check.ok) {
      toast.error("Can't attach file", { description: check.error });
      return;
    }
    setUploading(true);
    const up = await uploadAttachment(file, conversationId);
    setUploading(false);
    if (!up.ok) {
      toast.error("Upload failed", { description: up.error });
      return;
    }
    // Whatever is already in the box travels with the file as its caption.
    send.mutate({ body: draft.trim(), mediaUrl: up.path, displayUrl: up.url });
  }

  const composerDisabled = !conversationId || uploading;

  return (
    <Screen width={1080}>
      <PageHead
        title="Messages"
        intro="Your direct line to the team. Everything you send lands with them live — no phone queues, no waiting on email."
      />

      <Card className="flex h-[calc(100dvh-17rem)] min-h-[520px] flex-col">
        {/* ------------------------------------------------------ header */}
        <div className="border-line-soft flex flex-none items-center gap-3 border-b px-5 py-3">
          <span className="bg-marine-500 relative flex size-9 flex-none items-center justify-center rounded-full text-white">
            <PlaneIcon size={18} />
            <span className="bg-ok-ink absolute -right-0.5 -bottom-0.5 block size-[11px] rounded-full border-2 border-white" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-ink-800 truncate text-[13.5px] font-semibold">
              {TEAM_NAME}
            </span>
            <span className="text-ok-ink text-[11.5px] font-normal">
              Typically replies in minutes
            </span>
          </span>
        </div>

        {/* ------------------------------------------------------ thread */}
        <div
          ref={scrollRef}
          className="om-scroll bg-surface-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5"
        >
          {isLoading ? (
            <span className="text-ink-500 m-auto text-[13px]">
              Loading your messages…
            </span>
          ) : thread.length === 0 ? (
            <div className="m-auto flex max-w-[360px] flex-col items-center text-center">
              <span className="bg-marine-50 mb-4 flex size-11 items-center justify-center rounded-full">
                <span className="border-marine-500 block size-3.5 rounded-full border-2" />
              </span>
              <h2 className="text-ink-800 m-0 mb-2 text-[15px] font-semibold tracking-[-0.008em]">
                No messages yet
              </h2>
              <p className="text-ink-600 m-0 text-[13px] leading-[1.55] font-normal text-pretty">
                Say hello, ask about a fare, or tell us where you want to go —
                a consultant will pick it up and reply right here.
              </p>
            </div>
          ) : (
            thread.map((m: Message, i) => {
              // The customer's own messages are stored 'incoming' (inbound to
              // the business); in THIS portal they are the ones on the right.
              const mine = m.direction === "incoming";
              const name = mine ? customerName : TEAM_NAME;
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
                            {mine ? "You" : ROLE_LABEL.employee}
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

        {/* ---------------------------------------------------- composer */}
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
            disabled={composerDisabled}
            onClick={() => fileRef.current?.click()}
            className="border-line-field text-ink-600 hover:bg-surface-1 flex size-[42px] flex-none items-center justify-center rounded-[10px] border bg-white outline-none disabled:opacity-60"
          >
            <AttachIcon size={18} />
          </button>
          <button
            type="button"
            aria-label="Add image"
            disabled={composerDisabled}
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
            disabled={!conversationId}
            placeholder={
              uploading ? "Sending your file…" : "Message the team…"
            }
            aria-label="Message the team"
            className={cn(
              "border-line-field bg-surface-1 text-ink-800 min-w-0 flex-1 resize-none rounded-[10px] border px-4 py-3 text-[13px] leading-[1.5] font-normal outline-none focus:bg-white",
              focusRing
            )}
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim() || composerDisabled || send.isPending}
            className="bg-marine-500 hover:bg-marine-600 flex size-[42px] flex-none items-center justify-center rounded-full border-0 text-white outline-none disabled:opacity-60"
          >
            <SendIcon size={17} />
          </button>
        </form>
      </Card>
    </Screen>
  );
}
