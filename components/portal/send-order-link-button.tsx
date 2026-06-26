"use client";

import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildBookLink } from "@/lib/orders/book-link";

/**
 * Composer action (admin/employee only) that drops a ready-to-tap booking link
 * into the current chat. The customer opens it and lands straight in the
 * create-order flow. Reused by the per-order inbox AND the conversation inbox so
 * the behaviour is identical everywhere — the caller wires `onSend` to its own
 * send path (order_messages or messages).
 */
export function SendOrderLinkButton({
  onSend,
  disabled,
}: {
  onSend: (body: string) => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Send booking link"
      title="Send a booking link"
      disabled={disabled}
      onClick={() =>
        onSend(`✈️ Ready to book? Start your flight order here:\n${buildBookLink()}`)
      }
      className="size-10 shrink-0 rounded-full text-muted-foreground"
    >
      <Link2 className="size-4" />
    </Button>
  );
}
