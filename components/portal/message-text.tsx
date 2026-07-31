"use client";

import { cn } from "@/lib/utils";

// Split a body on http(s) URLs, keeping the URLs themselves so we can render
// them as links. The capture group means the URLs survive the split.
const URL_SPLIT = /(https?:\/\/[^\s]+)/g;

/**
 * Renders a message body as text with any URLs turned into clickable links —
 * shared across every chat surface so links (e.g. the booking link) are tappable
 * for all roles. External links open safely in a new tab; styling adapts to the
 * bubble (white on the sender's orange bubble, brand navy otherwise).
 */
export function MessageText({ text, mine }: { text: string; mine?: boolean }) {
  const parts = text.split(URL_SPLIT);
  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "font-medium underline underline-offset-2 transition-opacity hover:opacity-80",
              mine ? "text-tx-invert" : "text-ocean"
            )}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}
