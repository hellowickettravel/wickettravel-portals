/**
 * Server-side input caps + a tiny text sanitiser, shared by every write path.
 * Pure + dependency-free. These are the SERVER's guardrails - the UI may cap
 * too, but the server never trusts that. All values are deliberately generous
 * for real use while making spam / oversized payloads impossible.
 */

export const LIMITS = {
  MESSAGE_BODY: 4000, // a chat message
  ORDER_NOTE: 4000, // customer_note / pre-order note
  ROUTE_FIELD: 120, // route_from / route_to
  PASSENGER_NAME: 100, // one passenger name
  MAX_PASSENGERS: 20, // names array length
  PASSENGER_EMAIL: 254, // RFC 5321 maximum for a full address
  PASSENGER_REF: 40, // IBE / booking-engine reference
  FULL_NAME: 120,
  SUPPORT_SUBJECT: 200,
  SUPPORT_BODY: 5000,
} as const;

// C0 control chars except \t (0x09) and \n (0x0a), plus DEL (0x7f).
// eslint-disable-next-line no-control-regex
const STRIP_CONTROL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

/**
 * Strip control characters (except newline + tab), and cap length. Removes NUL
 * and other C0 control bytes that have no place in user text and can break
 * downstream rendering/logging. Returns a clean string.
 */
export function sanitizeText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(STRIP_CONTROL, "").slice(0, max);
}

/** Trim + cap a single-line field (also flattens any newlines to spaces). */
export function sanitizeLine(value: unknown, max: number): string {
  return sanitizeText(value, max).replace(/[\r\n]+/g, " ").trim();
}
