"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { listOrderMessages, sendOrderMessage } from "@/lib/actions/orders";
import { orderMessagesKey } from "@/lib/query-keys";
import { ROLE_LABEL } from "@/lib/chat/labels";
import {
  ATTACHMENT_ACCEPT,
  uploadOrderAttachment,
  validateAttachment,
} from "@/lib/storage";
import type { OrderMessage, SenderRole } from "@/lib/db/types";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import {
  AttachIcon,
  DownloadIcon,
  ImageIcon,
  SendIcon,
} from "@/components/admin/icons";
import { MessageAttachment } from "@/components/portal/message-attachment";
import { MessageText } from "@/components/portal/message-text";
import { focusRing, initialsOf, shadowE1 } from "@/components/admin/ui";

const DAY = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function clock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

const dayKey = (iso: string) => iso.slice(0, 10);

/** Avatar tint per role — the design's marine / ember / ink trio. */
const ROLE_TINT: Record<SenderRole, string> = {
  admin: "bg-violet-bg text-violet-ink",
  employee: "bg-marine-tint text-marine-600",
  customer: "bg-neutral-bg text-ink-700",
};

/**
 * The order detail's Messages card — the design's own thread, not the shared
 * navy/orange `OrderInbox`. Same server actions, same realtime channel and the
 * same RLS gate; only the skin and the chrome (transcript button, day dividers,
 * two attach buttons, 42px circular send) follow the admin design.
 *
 * Admin can always send, including on a completed or cancelled order — the
 * customer is the one RLS locks out, and that is enforced server-side.
 */
export function OrderThread({
  orderId,
  customerName,
  orderNumber,
  currentUserId,
  senderNames = {},
}: {
  orderId: string;
  customerName: string;
  orderNumber: string;
  currentUserId: string;
  /**
   * sender_id → full name. The design labels each bubble with the person AND
   * their role, so staff messages carry a real name; anyone missing from the
   * map falls back to the fixed role label.
   */
  senderNames?: Record<string, string>;
}) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const messagesKey = useMemo(() => orderMessagesKey(orderId), [orderId]);

  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: messagesKey,
    queryFn: () => listOrderMessages(orderId),
  });
  const thread = useMemo(() => data ?? [], [data]);

  // Realtime — RLS scopes the stream to this order's participants.
  useEffect(() => {
    const channel = supabase
      .channel(`admin-order-thread-${orderId}`)
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

  // Pin to the newest message whenever the thread grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length]);

  const send = useMutation({
    mutationFn: (input: Parameters<typeof sendOrderMessage>[0]) =>
      sendOrderMessage(input),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't send", { description: res.error });
        return;
      }
      setDraft("");
      queryClient.invalidateQueries({ queryKey: messagesKey });
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || send.isPending) return;
    send.mutate({ orderId, body });
  }

  async function attach(file: File) {
    const check = validateAttachment(file);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    setUploading(true);
    const up = await uploadOrderAttachment(file, orderId);
    setUploading(false);
    if (!up.ok) {
      toast.error("Upload failed", { description: up.error });
      return;
    }
    send.mutate({
      orderId,
      body: draft.trim(),
      attachment: {
        path: up.path,
        name: up.name,
        mime: file.type || null,
        size: file.size,
      },
    });
  }

  function exportTranscript() {
    downloadCsv(
      `order-${orderNumber.replace("#", "")}-transcript.csv`,
      ["Sent", "Sender", "Message", "Attachment"],
      thread.map((m) => [
        new Date(m.created_at).toLocaleString("en-GB"),
        ROLE_LABEL[m.sender_role],
        m.body ?? "",
        m.media_url ?? "",
      ])
    );
  }

  const firstName = customerName.split(" ")[0] || "customer";

  return (
    <div
      className={cn(
        "border-line-base flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-[12px] border bg-white",
        shadowE1
      )}
    >
      <div className="border-line-soft flex flex-none items-center justify-between gap-3 border-b px-5 py-[15px]">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <h2 className="text-ink-800 m-0 text-[13.5px] font-semibold tracking-[-0.008em]">
            Messages
          </h2>
          <span className="text-ink-600 text-[11.5px] font-normal">
            Order thread with {customerName}
          </span>
        </div>
        <button
          type="button"
          onClick={exportTranscript}
          disabled={thread.length === 0}
          className="border-line-field text-ink-800 hover:bg-surface-1 inline-flex h-[34px] flex-none items-center gap-1.5 rounded-full border bg-white px-3.5 text-[12px] font-medium outline-none disabled:opacity-60"
        >
          <span className="flex">
            <DownloadIcon size={17} />
          </span>
          Transcript
        </button>
      </div>

      <div
        ref={scrollRef}
        className="om-scroll bg-surface-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5"
      >
        {isLoading ? (
          <span className="text-ink-500 m-auto text-[13px]">
            Loading the thread…
          </span>
        ) : thread.length === 0 ? (
          <div className="m-auto flex max-w-[360px] flex-col items-center text-center">
            <span className="bg-marine-50 mb-4 flex size-11 items-center justify-center rounded-full">
              <span className="border-marine-500 block size-3.5 rounded-full border-2" />
            </span>
            <h3 className="text-ink-800 m-0 mb-2 text-[15px] font-semibold tracking-[-0.008em]">
              No messages on this order yet
            </h3>
            <p className="text-ink-600 m-0 text-[13px] leading-[1.55] font-normal text-pretty">
              Anything you send here reaches {firstName} in their portal
              instantly, and every employee assigned to the order sees it too.
            </p>
          </div>
        ) : (
          thread.map((m: OrderMessage, i) => {
            const mine = m.sender_id === currentUserId;
            const role = m.sender_role;
            const name =
              role === "customer"
                ? customerName
                : ((m.sender_id && senderNames[m.sender_id]) ?? ROLE_LABEL[role]);
            const newDay =
              i === 0 || dayKey(thread[i - 1].created_at) !== dayKey(m.created_at);
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
                      className={cn(
                        "flex size-8 flex-none items-center justify-center rounded-full text-[11px] font-semibold",
                        ROLE_TINT[role]
                      )}
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
                          {ROLE_LABEL[role]}
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
                            <MessageText text={m.body} mine={mine} />
                          </span>
                        ) : null}
                        {m.media_url ? (
                          <MessageAttachment url={m.media_url} mine={mine} />
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
    </div>
  );
}
