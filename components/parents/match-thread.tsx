"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  listMatchMessages,
  sendMatchMessage,
  type MatchMessage,
} from "@/lib/actions/parents-messages";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHead,
  Spinner,
  avatarFor,
  focusRing,
  initialsOf,
  textareaClass,
} from "@/components/admin/ui";
import { ChatIcon, LockIcon, SendIcon } from "@/components/admin/icons";

/**
 * The conversation between a matched family and helper.
 *
 * One component, three portals — the family and the helper each see the other
 * as "them", and an admin reading the same thread sees both by name because
 * they are the third party who has to be able to settle a dispute.
 *
 * The composer only exists once the introduction has been released. That gate
 * is enforced by the insert policy in the database; this just avoids offering
 * a box that would refuse the message.
 */
export function MatchThread({
  matchId,
  viewerId,
  released,
  audience = "party",
  counterpartyLabel = "them",
}: {
  matchId: string;
  viewerId: string;
  /** Contact released — the thread's open/closed state. */
  released: boolean;
  /** An admin sees real names on both sides; a party sees "you" and "them". */
  audience?: "party" | "admin";
  /** What to call the other person before an admin has named them. */
  counterpartyLabel?: string;
}) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const KEY = useMemo(() => ["parent-match-thread", matchId] as const, [matchId]);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => listMatchMessages(matchId),
  });
  const messages = useMemo(() => data ?? [], [data]);

  // Live, like every other message surface in the product.
  useEffect(() => {
    const channel = supabase
      .channel(`parent-match-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "parent_ticket_messages",
          filter: `match_id=eq.${matchId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, matchId, KEY]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const res = await sendMatchMessage({ matchId, body });
    setSending(false);
    if (!res.ok) {
      toast.error("Couldn't send", { description: res.error });
      return;
    }
    setDraft("");
    queryClient.invalidateQueries({ queryKey: KEY });
  }

  return (
    <Card className="flex flex-col">
      <CardHead
        icon={<ChatIcon size={15} />}
        title="Messages"
        hint={
          released
            ? "Keep it here and you both have a record of what was agreed."
            : "Opens once we've introduced you."
        }
      />

      <div
        ref={scrollRef}
        className="flex max-h-[420px] min-h-[180px] flex-1 flex-col gap-3 overflow-y-auto px-5 py-4"
      >
        {isLoading ? (
          <span className="text-ink-500 text-[13px] font-normal">Loading…</span>
        ) : messages.length === 0 ? (
          <p className="text-ink-500 m-0 text-[13px] leading-[1.55] font-normal text-pretty">
            {released
              ? "Nothing yet. Say hello — agree where to meet and how you'll recognise each other."
              : "Nothing here yet."}
          </p>
        ) : (
          messages.map((m, i) => (
            <Bubble
              key={m.id}
              message={m}
              mine={m.sender_id === viewerId}
              audience={audience}
              counterpartyLabel={counterpartyLabel}
              showDay={
                i === 0 ||
                fmtDate(messages[i - 1].created_at) !== fmtDate(m.created_at)
              }
            />
          ))
        )}
      </div>

      {released ? (
        <form
          onSubmit={send}
          className="border-line-soft flex items-end gap-2.5 border-t px-5 py-4"
        >
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
            maxLength={4000}
            placeholder="Write a message…"
            aria-label="Write a message"
            disabled={sending}
            className={cn(textareaClass, focusRing, "flex-1")}
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={sending || !draft.trim()}
            className="bg-marine-500 hover:bg-marine-600 flex size-[42px] flex-none items-center justify-center rounded-full text-white outline-none transition-colors disabled:opacity-50"
          >
            {sending ? <Spinner /> : <SendIcon size={17} />}
          </button>
        </form>
      ) : (
        <p className="border-line-soft text-ink-500 m-0 inline-flex items-center gap-2 border-t px-5 py-4 text-[12.5px] font-normal">
          <LockIcon size={14} />
          You&apos;ll be able to write here once both of you have accepted and
          we&apos;ve made the introduction.
        </p>
      )}
    </Card>
  );
}

/** One message. Own messages sit right in marine, everyone else's left. */
function Bubble({
  message,
  mine,
  audience,
  counterpartyLabel,
  showDay,
}: {
  message: MatchMessage;
  mine: boolean;
  audience: "party" | "admin";
  counterpartyLabel: string;
  showDay: boolean;
}) {
  const isStaff = message.sender?.role === "admin";
  // A party never learns a name from the thread that the introduction hasn't
  // already given them; an admin, who arbitrates, sees both.
  const who = mine
    ? "You"
    : isStaff
      ? "Wicket"
      : audience === "admin"
        ? (message.sender?.full_name ?? "Unknown")
        : counterpartyLabel;
  const { bg, ink } = avatarFor(who);

  return (
    <>
      {showDay ? (
        <span className="text-ink-quiet my-1 self-center text-[11px] font-medium">
          {fmtDate(message.created_at)}
        </span>
      ) : null}
      <div className={cn("flex max-w-[86%] gap-2.5", mine && "flex-row-reverse self-end")}>
        <span
          style={{ background: bg, color: ink }}
          className="flex size-8 flex-none items-center justify-center rounded-full text-[11px] font-semibold"
        >
          {initialsOf(who)}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span
            className={cn(
              "text-ink-500 text-[11px] font-medium",
              mine && "text-right"
            )}
          >
            {who}
            {isStaff && !mine ? " · our team" : ""}
          </span>
          <span
            className={cn(
              "px-3.5 py-2.5 text-[13px] leading-[1.55] font-normal whitespace-pre-wrap",
              mine
                ? "bg-marine-500 rounded-[14px_14px_4px_14px] text-white"
                : "bg-surface-2 text-ink-800 rounded-[14px_14px_14px_4px]"
            )}
          >
            {message.body}
          </span>
          <span
            className={cn("text-ink-quiet text-[10.5px] font-normal", mine && "text-right")}
          >
            {new Date(message.created_at).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </span>
      </div>
    </>
  );
}
