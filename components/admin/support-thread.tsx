"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  listSupportMessages,
  replyToSupportTicket,
} from "@/lib/actions/support";
import { fmtStamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Btn,
  RowsSkeleton,
  focusRing,
  textareaClass,
} from "@/components/admin/ui";
import { SendIcon } from "@/components/admin/icons";

/**
 * The reply thread on a support ticket, shared by all three portals.
 *
 * Support was write-only: the person who raised a ticket could not be answered
 * inside the product, and an admin could only toggle it resolved. This is the
 * missing half — a real conversation attached to the ticket, with the status
 * automation living in the server action (`replyToSupportTicket`) so the UI
 * cannot get it wrong.
 *
 * On a database without `support_messages` the query returns `[]` and the
 * composer explains why rather than failing on submit.
 */
export function SupportThread({
  ticketId,
  /** Who is looking. Only changes the wording and which side is "mine". */
  audience = "admin",
  className,
}: {
  ticketId: string;
  audience?: "admin" | "employee" | "customer" | "helper";
  className?: string;
}) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState("");

  const key = useMemo(() => ["support-messages", ticketId] as const, [ticketId]);

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => listSupportMessages(ticketId),
  });
  const messages = useMemo(() => data ?? [], [data]);

  // Live: a reply from the other side lands without a refresh, the same way
  // every other thread in this product behaves.
  useEffect(() => {
    const channel = supabase
      .channel(`support-thread-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: key })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, ticketId, key]);

  const reply = useMutation({
    mutationFn: replyToSupportTicket,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't send your reply", { description: res.error });
        return;
      }
      setDraft("");
      toast.success("Reply sent");
      queryClient.invalidateQueries({ queryKey: key });
      // The status may have moved (a submitter replying reopens a resolved
      // ticket), so the queue that owns this row has to re-read too.
      queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: () =>
      toast.error("Couldn't send your reply", { description: "Please try again." }),
  });

  function send() {
    const body = draft.trim();
    if (!body) return;
    reply.mutate({ ticketId, body });
  }

  /**
   * Which bubbles are the reader's own.
   *
   * A helper also matches `customer`, deliberately. The author trigger in
   * APPLY_ADMIN_ROUND3.sql was written when helpers had no support form and
   * files anything non-staff as 'customer'; APPLY_HELPER_SUPPORT.sql teaches
   * it 'helper'. Accepting both means a helper's own replies read as theirs
   * whether or not that migration has been run, and old rows written before it
   * keep working afterwards.
   */
  const isMine = (role: string) =>
    audience === "admin"
      ? role === "admin"
      : audience === "helper"
        ? role === "helper" || role === "customer"
        : role === audience;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {isLoading ? (
        <RowsSkeleton rows={2} />
      ) : messages.length === 0 ? (
        <p className="text-ink-500 m-0 text-[12px] font-normal">
          No replies yet.{" "}
          {audience === "admin"
            ? "Answer below and they'll be notified straight away."
            : "Our team will answer here."}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {messages.map((m) => {
            const mine = isMine(m.author_role);
            const who =
              m.author_name?.trim() ||
              (m.author_role === "customer" ? "Customer" : "Wicket Travel");
            return (
              <div
                key={m.id}
                className={cn(
                  "flex max-w-[min(560px,94%)] gap-2.5",
                  mine ? "flex-row-reverse self-end" : "flex-row self-start"
                )}
              >
                <Avatar name={who} size={28} />
                <div
                  className={cn(
                    "flex min-w-0 flex-col gap-1 rounded-[12px] border px-3.5 py-2.5",
                    mine
                      ? "bg-marine-500 border-marine-500 text-white"
                      : "border-line-base text-ink-800 bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      mine ? "text-white/85" : "text-ink-600"
                    )}
                  >
                    {who}
                    <span className="ml-2 font-normal opacity-75">
                      {m.author_role === "admin"
                        ? "Admin"
                        : m.author_role === "employee"
                          ? "Team"
                          : "Customer"}
                    </span>
                  </span>
                  <span className="text-[12.5px] leading-[1.55] font-normal whitespace-pre-wrap text-pretty">
                    {m.body}
                  </span>
                  <span
                    className={cn(
                      "text-[10.5px] font-normal tabular-nums",
                      mine ? "text-marine-time" : "text-ink-quiet"
                    )}
                  >
                    {fmtStamp(m.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-2.5">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            audience === "admin"
              ? "Reply to whoever raised this…"
              : "Add a reply for the Wicket team…"
          }
          aria-label="Reply"
          className={cn(textareaClass, focusRing, "min-h-[62px] flex-1")}
        />
        <Btn
          variant="marine"
          onClick={send}
          disabled={!draft.trim()}
          pending={reply.isPending}
          pendingLabel="Sending…"
        >
          <SendIcon size={15} />
          Send
        </Btn>
      </div>
    </div>
  );
}
