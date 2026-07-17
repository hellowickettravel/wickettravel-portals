import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFrom } from "@/lib/security/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PARENT_TICKET_TYPES, type ParentTicketType } from "@/lib/parents-tickets";

/**
 * PUBLIC Parents Tickets intake — POST /api/parent-ticket
 *
 * Receives the short lead-capture form from the public homepage (a DIFFERENT
 * origin), validates everything server-side, stores the lead and returns the
 * human reference number (#PT-1001). Text only — no file uploads.
 *
 * Accepts application/json — the payload object directly.
 *
 * Security model (identical to the Dubai-visa intake):
 *   - CORS: only the homepage origin (+ localhost for testing) is allowed.
 *   - Writes use the service-role client AFTER validation; the table's RLS
 *     keeps anon read access impossible, so nothing ever leaks back out.
 *   - Rate limit: per REAL client IP (see below), keyed on a SHA-256 of the
 *     IP stored on the row (never the raw address). Fail-open like the rest
 *     of lib/security so an infra hiccup can't kill real leads. Failed
 *     validation never inserts a row, so retrying after a 4xx never counts
 *     against the limit — only accepted submissions do.
 *
 * Real client IP behind the homepage relay:
 *   The homepage submits through its own server-side API route, so the
 *   connecting IP here is the relay server's — useless for rate limiting.
 *   Vercel also OVERWRITES incoming x-forwarded-for with the connecting IP, so
 *   the relay cannot pass the visitor's address through standard headers alone.
 *   Instead the relay sends (the SAME mechanism the visa intake uses):
 *     x-wicket-relay-secret: <VISA_RELAY_SECRET>   (proves it's OUR relay)
 *     x-wicket-client-ip:    <the visitor's IP as the relay saw it>
 *   Only when the secret matches (timing-safe) do we honour the forwarded IP.
 *   Any other caller — however it spoofs headers — is bucketed by its own
 *   connecting IP.
 */

const ALLOWED_ORIGINS = new Set([
  "https://wicket-travel.vercel.app", // public homepage
  "http://localhost:3000", // local homepage dev
  "http://localhost:3100",
  "http://127.0.0.1:3000",
]);

// Rate limiting — two sliding windows per real client IP, counted over ACCEPTED
// submissions only (validation failures never insert a row). Generous enough
// that a genuine user submitting a couple of leads is never penalised, while a
// spam flood trips the burst window immediately.
const RATE_WINDOWS = [
  { windowSec: 15 * 60, max: 8, label: "15 minutes" }, // burst
  { windowSec: 24 * 60 * 60, max: 25, label: "24 hours" }, // sustained
] as const;

// Headers the trusted homepage relay sends (shared with the visa intake).
const RELAY_SECRET_HEADER = "x-wicket-relay-secret";
const RELAY_CLIENT_IP_HEADER = "x-wicket-client-ip";

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

// ----- Validation -----------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s()./-]{7,29}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Trim + strip control characters; empty string becomes null. */
function cleanText(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}

/** Valid ISO date (YYYY-MM-DD) or null. */
function cleanDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
}

/** Non-negative integer clamped to [0, max], or null. */
function cleanInt(value: unknown, max: number): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 0) return 0;
  if (rounded > max) return max;
  return rounded;
}

/** Money-ish number clamped to [0, 100] (companion fee/offer), or null. */
function cleanAmount(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 100) return 100;
  // Keep at most 2 decimal places.
  return Math.round(n * 100) / 100;
}

/** Optional text fields shared by both sides → column name + max length. */
const SHARED_OPTIONAL_TEXT: Record<string, number> = {
  airline: 120,
  languages: 200,
  notes: 2000,
};

type ValidationResult =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

/** Validate + sanitize the raw payload into an insert-ready row. */
function validatePayload(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: { payload: "Body must be a JSON object." } };
  }
  const input = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const row: Record<string, unknown> = {};

  // Which side of the board — required, constrained enum.
  const enquiryType = cleanText(input.enquiry_type, 20);
  if (!enquiryType || !PARENT_TICKET_TYPES.includes(enquiryType as ParentTicketType)) {
    errors.enquiry_type = "enquiry_type must be 'traveller' or 'requester'.";
  } else {
    row.enquiry_type = enquiryType;
  }

  // Shared required fields.
  const fullName = cleanText(input.full_name, 150);
  if (!fullName) errors.full_name = "Full name is required.";
  const email = cleanText(input.email, 254);
  if (!email || !EMAIL_RE.test(email)) errors.email = "A valid email is required.";
  const phone = cleanText(input.phone, 30);
  if (!phone || !PHONE_RE.test(phone))
    errors.phone = "A valid phone number is required.";
  const fromLocation = cleanText(input.from_location, 150);
  if (!fromLocation) errors.from_location = "Departure location is required.";
  const toLocation = cleanText(input.to_location, 150);
  if (!toLocation) errors.to_location = "Destination location is required.";

  row.full_name = fullName;
  row.email = email;
  row.phone = phone;
  row.from_location = fromLocation;
  row.to_location = toLocation;

  // Shared optional fields.
  row.travel_date = cleanDate(input.travel_date);
  for (const [field, maxLen] of Object.entries(SHARED_OPTIONAL_TEXT)) {
    row[field] = cleanText(input[field], maxLen);
  }

  // Side-specific fields — always write both sets (the irrelevant side stays
  // null), so the row shape is stable regardless of which form submitted.
  const isTraveller = enquiryType === "traveller";
  const isRequester = enquiryType === "requester";

  row.assistance_offered = isTraveller ? cleanText(input.assistance_offered, 2000) : null;
  row.parents_can_help = isTraveller ? cleanInt(input.parents_can_help, 20) : null;
  row.fee_amount = isTraveller ? cleanAmount(input.fee_amount) : null;

  row.parent_name = isRequester ? cleanText(input.parent_name, 150) : null;
  row.parent_age = isRequester ? cleanInt(input.parent_age, 120) : null;
  row.relationship = isRequester ? cleanText(input.relationship, 80) : null;
  row.assistance_needed = isRequester ? cleanText(input.assistance_needed, 2000) : null;
  row.mobility_needs = isRequester ? cleanText(input.mobility_needs, 2000) : null;
  row.offer_amount = isRequester ? cleanAmount(input.offer_amount) : null;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, row };
}

// ----- Client IP + rate limiting ---------------------------------------------

/** Constant-time secret comparison; hashing first equalises lengths. */
function secretMatches(presented: string, expected: string): boolean {
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const IPV4_RE = /^(\d{1,3})(\.\d{1,3}){3}$/;
const IPV6_RE = /^[0-9a-fA-F:]{2,45}$/;

function looksLikeIp(value: string): boolean {
  return IPV4_RE.test(value) || (value.includes(":") && IPV6_RE.test(value));
}

/**
 * The REAL end-user IP for rate limiting. A forwarded client IP is honoured
 * only when the request proves it came from our homepage relay via the shared
 * secret; everything else falls back to the connecting IP.
 */
function resolveClientIp(headers: Headers): string | null {
  const expected = process.env.VISA_RELAY_SECRET;
  const presented = headers.get(RELAY_SECRET_HEADER);
  if (expected && presented && secretMatches(presented, expected)) {
    const candidates = [
      headers.get(RELAY_CLIENT_IP_HEADER),
      headers.get("x-forwarded-for")?.split(",")[0], // ORIGINAL client = first hop
      headers.get("x-real-ip"),
    ];
    for (const candidate of candidates) {
      const ip = candidate?.trim().slice(0, 100);
      if (ip && looksLikeIp(ip)) return ip;
    }
  }
  return clientIpFrom(headers);
}

/**
 * Sliding-window check over the lead rows themselves. Returns 0 when the
 * request is allowed, otherwise the number of seconds until the oldest counted
 * submission leaves the tripped window. Fail-open on any error.
 */
async function rateLimitRetryAfter(
  admin: SupabaseClient,
  ipHash: string
): Promise<number> {
  for (const { windowSec, max } of RATE_WINDOWS) {
    try {
      const since = new Date(Date.now() - windowSec * 1000).toISOString();
      const { data, error } = await admin
        .from("parent_ticket_enquiries")
        .select("created_at")
        .eq("ip_hash", ipHash)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(max);
      if (error || !data) continue; // fail-open
      if (data.length >= max) {
        const oldest = new Date(data[0]!.created_at as string).getTime();
        const retry = Math.ceil((oldest + windowSec * 1000 - Date.now()) / 1000);
        return Math.max(retry, 60);
      }
    } catch {
      /* fail-open */
    }
  }
  return 0;
}

// ----- Handler ---------------------------------------------------------------

export async function POST(request: Request) {
  const headers = corsHeaders(request.headers.get("origin"));
  const json = (body: unknown, status: number) =>
    NextResponse.json(body, { status, headers });

  // Text-only intake — plain JSON.
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  const validated = validatePayload(payload);
  if (!validated.ok) {
    return json(
      { ok: false, error: "Validation failed.", fields: validated.errors },
      422
    );
  }

  const admin = createAdminClient();

  // Rate limit on the REAL client IP (resolved through the trusted relay).
  // Runs after validation on purpose: a 422 retry never counts. Fail-open on
  // any error so an infra hiccup never blocks a genuine lead.
  const ip = resolveClientIp(request.headers);
  const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null;
  if (ipHash) {
    const retryAfterSeconds = await rateLimitRetryAfter(admin, ipHash);
    if (retryAfterSeconds > 0) {
      const minutes = Math.ceil(retryAfterSeconds / 60);
      return NextResponse.json(
        {
          ok: false,
          error: "rate_limited",
          message: `You've reached the submission limit. Please try again in about ${
            minutes >= 60
              ? `${Math.ceil(minutes / 60)} hour${minutes >= 120 ? "s" : ""}`
              : `${minutes} minute${minutes === 1 ? "" : "s"}`
          }.`,
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(retryAfterSeconds),
            "Access-Control-Expose-Headers": "Retry-After",
          },
        }
      );
    }
  }

  // Insert the lead; the trigger assigns the #PT-… reference.
  const { data: created, error: insertError } = await admin
    .from("parent_ticket_enquiries")
    .insert({ ...validated.row, status: "new", ip_hash: ipHash })
    .select("reference_number")
    .single();

  if (insertError || !created) {
    return json(
      { ok: false, error: "Could not save your submission. Please try again." },
      500
    );
  }

  return json({ ok: true, reference: created.reference_number }, 201);
}
