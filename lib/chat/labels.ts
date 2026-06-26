import type { SenderRole } from "@/lib/db/types";

/**
 * Fixed UI labels for a message sender's ROLE — never real names. Shared by every
 * chat surface (per-order inbox + conversation inbox) so the labelling is a single
 * source of truth, not copy-pasted per screen.
 */
export const ROLE_LABEL: Record<SenderRole, string> = {
  admin: "Admin",
  employee: "Support Team",
  customer: "Customer",
};

/**
 * No-repeat-in-a-row rule. Given chat items in chronological order and a key
 * identifying each item's sender, returns — for each item — whether its sender
 * label should be shown: true only on the FIRST message of a consecutive run from
 * the same sender, false for the rest of that run. A different sender starts a new
 * run and the label reappears.
 */
export function senderLabelFlags<T>(
  items: T[],
  senderKeyOf: (item: T) => string
): boolean[] {
  let prev: string | null = null;
  return items.map((item) => {
    const key = senderKeyOf(item);
    const show = key !== prev;
    prev = key;
    return show;
  });
}
