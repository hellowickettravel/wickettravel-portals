import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getConversationById } from "@/lib/db/conversations";
import { getMessages } from "@/lib/db/messages";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { MessageText } from "@/components/portal/message-text";
import { ROLE_LABEL, senderLabelFlags } from "@/lib/chat/labels";
import type { ConversationStatus } from "@/lib/db/types";
import { fmtRelative, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const CONVO_TONE: Record<ConversationStatus, Tone> = {
  open: "blue",
  closed: "green",
};

export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const conversation = await getConversationById(id);
  if (!conversation) notFound();

  const messages = await getMessages(id);
  // Fixed role labels, shown once per consecutive run (no-repeat-in-a-row).
  const labelFlags = senderLabelFlags(messages, (m) => m.direction);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/messages"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-marine-600 transition-colors hover:text-marine-600"
      >
        <ArrowLeft className="size-4" />
        Back to messages
      </Link>

      <div className="overflow-hidden rounded-[12px] border border-line-base bg-white shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-line-base px-5 py-4">
          <div className="leading-tight">
            <p className="font-poppins text-base font-semibold text-ink-900">
              {conversation.customer?.name || "Unknown customer"}
            </p>
            <p className="text-xs text-ink-600">
              {conversation.customer?.wa_phone ?? "No number"}
            </p>
          </div>
          <StatusBadge tone={CONVO_TONE[conversation.status]}>
            {titleCase(conversation.status)}
          </StatusBadge>
        </div>

        {/* Thread (read-only) */}
        <div className="space-y-3 bg-surface-1/50 px-4 py-5 md:px-6">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-600">
              No messages in this conversation yet.
            </p>
          ) : (
            messages.map((m, i) => {
              const outgoing = m.direction === "outgoing";
              const showLabel = labelFlags[i];
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    outgoing ? "justify-end" : "justify-start",
                    !showLabel && "-mt-1.5"
                  )}
                >
                  <div className="max-w-[80%] sm:max-w-[60%]">
                    {showLabel ? (
                      <span
                        className={cn(
                          "mb-1 block text-[11px] font-medium text-ink-600",
                          outgoing ? "text-right" : "text-left"
                        )}
                      >
                        {outgoing ? ROLE_LABEL.admin : ROLE_LABEL.customer}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        "rounded-[12px] px-3.5 py-2 text-sm shadow-sm",
                        outgoing
                          ? "rounded-br-md bg-marine-500 text-white"
                          : "rounded-bl-md border border-line-base bg-white text-ink-800"
                      )}
                    >
                      <MessageText text={m.body} mine={outgoing} />
                      <span
                        className={cn(
                          "mt-1 block text-right text-[10px]",
                          outgoing ? "text-white/70" : "text-ink-600"
                        )}
                      >
                        {fmtRelative(m.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-line-base bg-neutral-bg/40 px-5 py-3 text-center text-xs text-ink-600">
          Read-only snapshot.{" "}
          <Link href="/admin/messages" className="font-medium text-marine-600 hover:text-marine-600">
            Open the inbox
          </Link>{" "}
          to reply or send attachments.
        </div>
      </div>
    </div>
  );
}
