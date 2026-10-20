import "server-only";
import { sendMail } from "@/lib/email";
import { CABIN_CLASSES } from "@/lib/orders/form";
import type { CabinClass } from "@/lib/db/types";

/**
 * "A new booking just came in" email to the office, sent whenever a customer
 * places an order from the portal or the website's booking wizard. The in-app
 * bell already tells whoever is signed in; this reaches the inbox the team
 * actually watches.
 *
 * Recipient: ORDER_ALERT_EMAIL (comma-separated for more than one), else the
 * address the client named. Uses the same SMTP settings as birthday emails,
 * so it sends once SMTP_PASS is set on the server.
 */
const DEFAULT_TO = "shobha@wickettravel.com";
const PORTAL_ORIGIN = "https://portal.wickettravel.com";

export type NewOrderAlert = {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  routeFrom: string;
  routeTo: string;
  travelDate: string | null;
  returnDate: string | null;
  cabinClass: CabinClass;
  adults: number;
  children: number;
  passengerNames: string[];
  note: string | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function day(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Never throws: a failed alert must not fail the booking it reports. */
export async function sendNewOrderAlert(o: NewOrderAlert): Promise<void> {
  const to = (process.env.ORDER_ALERT_EMAIL || DEFAULT_TO).trim();
  if (!to) return;

  const link = `${PORTAL_ORIGIN}/admin/orders/${o.orderId}`;
  const pax = [
    `${o.adults} adult${o.adults === 1 ? "" : "s"}`,
    o.children > 0 ? `${o.children} child${o.children === 1 ? "" : "ren"}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const rows: [string, string][] = [
    ["Order", `#${o.orderNumber}`],
    ["Customer", o.customerName?.trim() || "—"],
    ["Email", o.customerEmail || "—"],
    ["Route", `${o.routeFrom} → ${o.routeTo}`],
    ["Departs", day(o.travelDate)],
    ["Returns", o.returnDate ? day(o.returnDate) : "One way"],
    ["Cabin", CABIN_CLASSES.find((c) => c.value === o.cabinClass)?.label ?? o.cabinClass],
    ["Travellers", pax],
    ["Passengers", o.passengerNames.filter(Boolean).join(", ") || "—"],
  ];

  const subject = `New booking #${o.orderNumber}: ${o.routeFrom} → ${o.routeTo}`;
  const text = [
    "A new booking has come in.",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(o.note ? ["", "Details from the customer:", o.note] : []),
    "",
    `Open it in the portal: ${link}`,
  ].join("\n");

  const td = "padding:7px 0;font-size:14px;line-height:1.5;vertical-align:top;";
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#1d2433;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px 28px;">
<h1 style="margin:0 0 6px;font-size:20px;font-weight:600;color:#283a5e;">New booking #${escapeHtml(o.orderNumber)}</h1>
<p style="margin:0 0 18px;font-size:14px;color:#5a6478;">A customer has just placed a booking request.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="${td}width:120px;color:#5a6478;">${escapeHtml(k)}</td><td style="${td}font-weight:600;">${escapeHtml(v)}</td></tr>`
  )
  .join("\n")}
</table>
${
  o.note
    ? `<p style="margin:18px 0 6px;font-size:13px;color:#5a6478;">Details from the customer</p>
<p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(o.note)}</p>`
    : ""
}
<p style="margin:24px 0 0;"><a href="${link}" style="display:inline-block;background:#c2511a;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600;">Open the order</a></p>
</div></body></html>`;

  try {
    const res = await sendMail({ to, subject, html, text, replyTo: o.customerEmail });
    if (!res.ok) console.error(`[order-alert] #${o.orderNumber} not emailed: ${res.error}`);
  } catch (e) {
    console.error(`[order-alert] #${o.orderNumber} not emailed`, e);
  }
}
