import { CustomerSupport } from "@/components/customer/support-view";

/**
 * Helper support.
 *
 * This used to be an honest contact card rather than the ticket form, because
 * `support_tickets` was gated to `role = 'customer'` in RLS as well as in the
 * server action — the form would have failed on every submit.
 * `sql/APPLY_HELPER_SUPPORT.sql` opens the table to helpers, so they now get
 * the same tracked question and reply thread as everyone else, from the same
 * component with `audience="helper"` (different questions, different live
 * channels, same screen).
 *
 * If that SQL has not been run yet the form still renders, and submitting
 * returns an error naming the file — the project's fail-soft convention.
 */
export default function HelperSupportPage() {
  return <CustomerSupport audience="helper" />;
}
