import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getConversationById } from "@/lib/db/conversations";
import { getMessages } from "@/lib/db/messages";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
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
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
      >
        <ArrowLeft className="size-4" />
        Back to messages
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="leading-tight">
            <p className="font-display text-base font-semibold text-navy">
              {conversation.customer?.name || "Unknown customer"}
            </p>
            <p className="text-xs text-muted-foreground">
              {conversation.customer?.wa_phone ?? "No number"}
            </p>
          </div>
          <StatusBadge tone={CONVO_TONE[conversation.status]}>
            {titleCase(conversation.status)}
          </StatusBadge>
        </div>

        {/* Thread (read-only) */}
        <div className="space-y-3 bg-neutral-soft/50 px-4 py-5 md:px-6">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
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
                          "mb-1 block text-[11px] font-medium text-muted-foreground",
                          outgoing ? "text-right" : "text-left"
                        )}
                      >
                        {outgoing ? ROLE_LABEL.admin : ROLE_LABEL.customer}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                        outgoing
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md border border-border bg-white text-foreground"
                      )}
                    >
                      <p className="leading-relaxed">{m.body}</p>
                      <span
                        className={cn(
                          "mt-1 block text-right text-[10px]",
                          outgoing ? "text-white/70" : "text-muted-foreground"
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

        <div className="border-t border-border bg-muted/40 px-5 py-3 text-center text-xs text-muted-foreground">
          Read-only snapshot.{" "}
          <Link href="/admin/messages" className="font-medium text-brand hover:text-brand-dark">
            Open the inbox
          </Link>{" "}
          to reply or send attachments.
        </div>
      </div>
    </div>
  );
}
