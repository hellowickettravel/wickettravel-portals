/**
 * Presentation helpers shared by every screen that renders an order the way the
 * design renders one — the boarding pass, the flight-detail tiles, the dashboard
 * "next trip" card. Kept out of the components so the admin, employee and
 * customer portals cannot drift on how the same record reads.
 */

/**
 * Hours a delivered order waits for the customer to approve before completing
 * itself. Lives here rather than beside the lifecycle actions because those
 * are `"use server"` (async exports only) and `lib/orders/lifecycle.ts` is
 * `server-only` — but the customer's approve card and the admin's delivered
 * banner both have to state the number, and it must be the same number.
 */
export const AUTO_COMPLETE_HOURS = 24;

/** "Dubai Int'l (DXB)" → "DXB" for the boarding pass, "Dubai Int'l" beneath it. */
export function splitPlace(value: string | null): { code: string; city: string } {
  if (!value) return { code: "—", city: "" };
  const m = value.match(/\(([A-Za-z]{3})\)\s*$/);
  if (m) return { code: m[1].toUpperCase(), city: value.slice(0, m.index).trim() };
  const bare = value.trim();
  if (/^[A-Za-z]{3}$/.test(bare)) return { code: bare.toUpperCase(), city: "" };
  return { code: bare.slice(0, 3).toUpperCase(), city: bare };
}

/** "2 adults · 1 child" — falls back to the legacy passenger count. */
export function paxSummary(
  adults: number,
  children: number,
  passengers: number | null
): string {
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} adult${adults === 1 ? "" : "s"}`);
  if (children > 0) parts.push(`${children} child${children === 1 ? "" : "ren"}`);
  if (parts.length > 0) return parts.join(" · ");
  return passengers != null ? `${passengers}` : "—";
}
