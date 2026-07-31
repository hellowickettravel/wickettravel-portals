"use client";

import { CornerUpLeft, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WhatsApp-style "reply to a message" primitives, shared by every chat surface
 * (per-order inbox, admin/employee conversation inbox, customer thread). The
 * quoted preview is resolved by the caller from the already-loaded thread — a
 * message stores only reply_to_id in the DB, so no join is needed.
 */

/** The minimal snapshot each surface maps its referenced message into. */
export type QuotedRef = {
  /** Who wrote the quoted message — a role label like "Admin" / "Customer". */
  label: string;
  body: string | null;
  hasAttachment: boolean;
};

/** One-line summary of a message body/attachment for the quote UI. */
function previewText(ref: QuotedRef): string {
  const body = ref.body?.trim();
  if (body) return body;
  if (ref.hasAttachment) return "Attachment";
  return "Message";
}

/** The small reply affordance revealed on hovering a message bubble. */
export function MessageReplyButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Reply to this message"
      title="Reply"
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-chip border border-line bg-surface text-tx-faint opacity-0 shadow-lift outline-none transition-all duration-150 ease-brand hover:border-ocean hover:text-ocean focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-flame group-hover:opacity-100",
        className
      )}
    >
      <CornerUpLeft className="size-3.5" />
    </button>
  );
}

/**
 * The quoted snippet rendered INSIDE a bubble, above the reply's own content.
 * `mine` tints it to sit legibly on the orange (mine) or white (theirs) bubble.
 * `onJump` (optional) scrolls to the original message.
 */
export function QuotedMessage({
  quoted,
  mine,
  onJump,
}: {
  quoted: QuotedRef;
  mine: boolean;
  onJump?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onJump}
      disabled={!onJump}
      className={cn(
        "mb-1.5 flex w-full items-stretch gap-2 overflow-hidden rounded-chip py-1 pl-2 pr-2.5 text-left transition-colors duration-150 ease-brand",
        onJump && "cursor-pointer",
        mine
          ? "bg-white/15 hover:bg-white/22"
          : "bg-sunk hover:bg-sand-deep"
      )}
    >
      <span
        className={cn(
          "w-0.5 shrink-0 rounded-full",
          mine ? "bg-white/60" : "bg-ocean"
        )}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[13px] font-semibold",
            mine ? "text-tx-invert" : "text-ocean"
          )}
        >
          {quoted.label}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 truncate text-[13px]",
            mine ? "text-tx-invert-2" : "text-tx-muted"
          )}
        >
          {quoted.hasAttachment && !quoted.body?.trim() ? (
            <Paperclip className="size-3 shrink-0" />
          ) : null}
          <span className="truncate">{previewText(quoted)}</span>
        </span>
      </span>
    </button>
  );
}

/** The "Replying to …" bar shown above the composer with a cancel control. */
export function ReplyComposerBar({
  quoted,
  onCancel,
}: {
  quoted: QuotedRef;
  onCancel: () => void;
}) {
  return (
    <div className="mb-2 flex items-stretch gap-2 rounded-chip border border-line bg-sunk py-1.5 pl-2.5 pr-2">
      <span className="w-0.5 shrink-0 rounded-full bg-ocean" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ocean">
          Replying to {quoted.label}
        </p>
        <p className="flex items-center gap-1 truncate text-[13px] text-tx-muted">
          {quoted.hasAttachment && !quoted.body?.trim() ? (
            <Paperclip className="size-3 shrink-0" />
          ) : null}
          <span className="truncate">{previewText(quoted)}</span>
        </p>
      </div>
      <button
        type="button"
        aria-label="Cancel reply"
        onClick={onCancel}
        className="inline-flex size-9 shrink-0 items-center justify-center self-center rounded-chip text-tx-faint outline-none transition-colors duration-150 ease-brand hover:bg-surface hover:text-tx-head focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-flame"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
