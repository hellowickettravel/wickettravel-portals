/**
 * Birthday wishes: the date maths and the email template.
 *
 * Client-safe and pure on purpose. The admin screen renders its live preview
 * with `renderBirthdayEmail` and the server sends with the very same function,
 * so what the admin approves is byte-for-byte what the customer receives.
 */

/** The business runs on UK time; "today" means today in London. */
export const BIRTHDAY_TIMEZONE = "Europe/London";

export const DEFAULT_BIRTHDAY_SUBJECT = "Happy birthday, {first_name}!";

export const DEFAULT_BIRTHDAY_MESSAGE = `Dear {first_name},

Everyone at {business_name} wishes you a very happy birthday!

Thank you for travelling with us. We hope the year ahead brings you plenty of wonderful journeys, and we look forward to helping you plan the next one.

Warm wishes,
The {business_name} team`;

export const BIRTHDAY_PLACEHOLDERS = [
  { token: "{first_name}", label: "First name" },
  { token: "{full_name}", label: "Full name" },
  { token: "{business_name}", label: "Business name" },
] as const;

export const SUBJECT_MAX = 150;
export const MESSAGE_MAX = 5000;

/* ------------------------------------------------------------ dates */

export type YMD = { y: number; m: number; d: number };

/** Today's calendar date in London, independent of the server's timezone. */
export function todayYMD(now: Date = new Date()): YMD {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BIRTHDAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** "1990-04-12" → {1990, 4, 12}; null for anything that isn't a real date. */
export function parseYMD(iso: string | null | undefined): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function dayNumber({ y, m, d }: YMD) {
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function toISO({ y, m, d }: YMD): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** The day someone celebrates in a given year. 29 Feb falls back to 28 Feb. */
function birthdayIn(year: number, dob: YMD): YMD {
  if (dob.m === 2 && dob.d === 29 && !isLeap(year)) return { y: year, m: 2, d: 28 };
  return { y: year, m: dob.m, d: dob.d };
}

export type NextBirthday = {
  /** The date of the next (or today's) birthday, "YYYY-MM-DD". */
  date: string;
  /** The year that birthday falls in — the key a wish is logged against. */
  year: number;
  /** 0 = today. */
  daysUntil: number;
  /** The age they turn; null if the birth year looks like a placeholder. */
  turning: number | null;
};

export function nextBirthday(
  dobISO: string | null | undefined,
  today: YMD = todayYMD()
): NextBirthday | null {
  const dob = parseYMD(dobISO);
  if (!dob) return null;
  let when = birthdayIn(today.y, dob);
  if (dayNumber(when) < dayNumber(today)) when = birthdayIn(today.y + 1, dob);
  const turning = when.y - dob.y;
  return {
    date: toISO(when),
    year: when.y,
    daysUntil: dayNumber(when) - dayNumber(today),
    turning: turning > 0 && turning < 120 ? turning : null,
  };
}

/** A date of birth a person could actually have: in the past, under 120 years ago. */
export function isPlausibleDob(iso: string, today: YMD = todayYMD()): boolean {
  const dob = parseYMD(iso);
  if (!dob) return false;
  return dayNumber(dob) <= dayNumber(today) && today.y - dob.y < 120;
}

/** "12 April" — birthdays are about the day, not the year. */
export function fmtBirthday(iso: string | null | undefined): string {
  const d = parseYMD(iso);
  if (!d) return "—";
  return new Date(Date.UTC(2000, d.m - 1, d.d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function fmtDaysUntil(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/* --------------------------------------------------------- template */

export type BirthdayBrand = {
  businessName: string;
  logoUrl?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
};

export type BirthdayRecipient = { fullName: string | null };

export function firstNameOf(fullName: string | null | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

function fillPlaceholders(
  text: string,
  recipient: BirthdayRecipient,
  brand: BirthdayBrand
): string {
  const values: Record<string, string> = {
    first_name: firstNameOf(recipient.fullName),
    full_name: recipient.fullName?.trim() || "there",
    business_name: brand.businessName,
  };
  return text.replace(/\{(first_name|full_name|business_name)\}/g, (_, k) => values[k]);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Email clients do not understand oklch, so the brand ramp is pinned to hex. */
const C = {
  navy: "#283a5e",
  marine: "#2657c6",
  ember: "#c2511a",
  emberSoft: "#f08a3c",
  ink: "#262f3d",
  inkSoft: "#5a6270",
  line: "#e2e6ee",
  page: "#f3f5f9",
};

export type RenderedEmail = { subject: string; html: string; text: string };

export function renderBirthdayEmail(input: {
  subject: string;
  message: string;
  recipient: BirthdayRecipient;
  brand: BirthdayBrand;
}): RenderedEmail {
  const { recipient, brand } = input;
  const subject = fillPlaceholders(input.subject, recipient, brand)
    .replace(/[\r\n]+/g, " ")
    .trim();
  const body = fillPlaceholders(input.message, recipient, brand).trim();

  const paragraphs = body
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.ink};">${escapeHtml(
          p.trim()
        ).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  const name = escapeHtml(brand.businessName);
  const logo =
    brand.logoUrl && /^https:\/\//i.test(brand.logoUrl)
      ? `<img src="${escapeHtml(brand.logoUrl)}" width="40" height="40" alt="" style="display:block;margin:0 auto 10px;border-radius:10px;">`
      : "";

  const contact = [brand.businessEmail, brand.businessPhone, brand.businessAddress]
    .map((v) => v?.trim())
    .filter(Boolean)
    .map((v) => escapeHtml(v!))
    .join(" &middot; ");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${C.line};border-radius:16px;overflow:hidden;">
<tr><td style="background:${C.navy};padding:28px 32px;text-align:center;">
${logo}<div style="font-size:18px;font-weight:600;letter-spacing:-0.01em;color:#ffffff;">${name}</div>
</td></tr>
<tr><td style="height:4px;background:${C.emberSoft};line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:36px 32px 8px;text-align:center;">
<div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:32px;background:#fdf1e8;font-size:32px;">&#127874;</div>
<h1 style="margin:18px 0 0;font-size:24px;line-height:1.3;font-weight:600;letter-spacing:-0.02em;color:${C.ink};">Happy birthday, ${escapeHtml(
    firstNameOf(recipient.fullName)
  )}!</h1>
</td></tr>
<tr><td style="padding:24px 32px 16px;">${paragraphs}</td></tr>
<tr><td style="padding:0 32px 32px;">
<div style="border-top:1px solid ${C.line};padding-top:18px;font-size:12px;line-height:1.6;color:${C.inkSoft};text-align:center;">
You are receiving this because you have an account with ${name}.${contact ? `<br>${contact}` : ""}
</div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = `${body}\n\n--\nYou are receiving this because you have an account with ${brand.businessName}.${
    contact ? `\n${[brand.businessEmail, brand.businessPhone].filter(Boolean).join(" · ")}` : ""
  }`;

  return { subject, html, text };
}
