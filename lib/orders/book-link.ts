/**
 * The customer-facing create-order (booking) flow. A shareable deep-link to this
 * path drops the recipient straight into the pre-order gate + order form. Admins
 * and employees can send it into any chat; the customer opens it and lands ready
 * to fill in a new order (routed through login first if they're signed out).
 */
export const BOOK_PATH = "/customer/book";

/**
 * Absolute booking link for the current origin (client-side). Falls back to the
 * relative path during SSR, where `window` isn't available.
 */
export function buildBookLink(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${BOOK_PATH}`;
  }
  return BOOK_PATH;
}
