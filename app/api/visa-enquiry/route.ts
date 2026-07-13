import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFrom } from "@/lib/security/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PreferredContactMethod, VisaDocument } from "@/lib/visa";
import { PREFERRED_CONTACT_METHODS } from "@/lib/visa";

/**
 * PUBLIC Dubai-visa enquiry intake — POST /api/visa-enquiry
 *
 * Receives the 5-step application form from the public homepage (a DIFFERENT
 * origin), validates everything server-side, stores the enquiry + any documents
 * and returns the human reference number (#VQ-1042).
 *
 * Accepts either:
 *   - application/json            → the payload object directly (no files)
 *   - multipart/form-data         → field "payload" = the JSON string, plus
 *                                   up to 5 files under repeated "documents"
 *                                   entries (PDF/JPG/PNG, max 10MB each)
 *
 * Security model:
 *   - CORS: only the homepage origin (+ localhost for testing) is allowed.
 *   - Writes use the service-role client AFTER validation; the table's RLS
 *     keeps anon read access impossible, so nothing ever leaks back out.
 *   - Rate limit: per REAL client IP (see below), keyed on a SHA-256 of the
 *     IP stored on the row (never the raw address). Fail-open like the rest
 *     of lib/security so an infra hiccup can't kill real applications.
 *     Failed-validation attempts never insert a row, so retrying after a 4xx
 *     never counts against the limit — only accepted submissions do.
 *   - Files go to the PRIVATE 'visa-documents' bucket under enquiry/<id>/…;
 *     the bucket has no anonymous policies, so this route is the only door in.
 *
 * Real client IP behind the homepage relay:
 *   The homepage submits through its own server-side API route, so the
 *   connecting IP here is the relay server's — useless for rate limiting
 *   (every visitor would share one bucket). Vercel also OVERWRITES incoming
 *   x-forwarded-for with the connecting IP, so the relay cannot pass the
 *   visitor's address through standard headers alone. Instead the relay sends:
 *     x-wicket-relay-secret: <VISA_RELAY_SECRET>   (proves it's OUR relay)
 *     x-wicket-client-ip:    <the visitor's IP as the relay saw it>
 *   Only when the secret matches (timing-safe) do we honour the forwarded IP
 *   (x-wicket-client-ip first, then the first x-forwarded-for hop / x-real-ip
 *   in case a trusted-proxy setup preserves them). Any other caller — however
 *   it spoofs headers — is bucketed by its own connecting IP.
 */

const ALLOWED_ORIGINS = new Set([
  "https://wicket-travel.vercel.app", // public homepage
  "http://localhost:3000", // local homepage dev
  "http://localhost:3100",
  "http://127.0.0.1:3000",
]);

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB — matches the bucket limit
const ALLOWED_FILE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_FILE_EXT = /\.(pdf|jpe?g|png)$/i;

// Rate limiting — two sliding windows per real client IP, counted over ACCEPTED
// submissions only (validation failures never insert a row, so a genuine user
// retrying after a 422 is never penalised). Thresholds are deliberately
// generous: a family submitting several applications in one sitting stays well
// inside them, while a spam flood hits the burst window immediately.
const RATE_WINDOWS = [
  { windowSec: 15 * 60, max: 8, label: "15 minutes" }, // burst
  { windowSec: 24 * 60 * 60, max: 25, label: "24 hours" }, // sustained
] as const;

// Headers the trusted homepage relay sends (see the security-model note above).
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

/** Accepts true/false booleans or "true"/"false" strings; anything else → false. */
function cleanBool(value: unknown): boolean {
  return value === true || value === "true";
}

/** Valid ISO date (YYYY-MM-DD) or null. */
function cleanDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
}

/** Optional text fields → column name + max length. */
const OPTIONAL_TEXT: Record<string, number> = {
  purpose_of_visit: 200,
  planned_activities: 2000,
  other_names: 150,
  place_of_birth: 150,
  nationality: 100,
  gender: 40,
  marital_status: 40,
  uk_address: 500,
  passport_type: 60,
  passport_number: 40,
  issuing_country: 100,
  uk_visa_brp_ref: 60,
  previous_uae_visa_number: 60,
  occupation: 120,
  employer_name: 150,
  job_title: 120,
  employer_address: 500,
  who_covers_costs: 120,
  additional_notes: 2000,
};

const DATE_FIELDS = [
  "arrival_date",
  "departure_date",
  "date_of_birth",
  "passport_issue_date",
  "passport_expiry_date",
  "uk_visa_start_date",
  "uk_visa_expiry_date",
] as const;

const BOOL_FIELDS = [
  "more_than_one_person",
  "previously_visited_uae",
  "refused_entry_uae",
  "criminal_conviction",
] as const;

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

  // Required
  const visaType = cleanText(input.visa_type, 120);
  if (!visaType) errors.visa_type = "Visa type is required.";
  const firstName = cleanText(input.first_name, 100);
  if (!firstName) errors.first_name = "First name is required.";
  const lastName = cleanText(input.last_name, 100);
  if (!lastName) errors.last_name = "Last name is required.";
  const email = cleanText(input.email, 254);
  if (!email || !EMAIL_RE.test(email)) errors.email = "A valid email is required.";
  const phone = cleanText(input.phone, 30);
  if (!phone || !PHONE_RE.test(phone)) errors.phone = "A valid phone number is required.";

  row.visa_type = visaType;
  row.first_name = firstName;
  row.last_name = lastName;
  row.email = email;
  row.phone = phone;

  // Preferred contact method — constrained enum, defaults to email.
  const contact = cleanText(input.preferred_contact_method, 20) ?? "email";
  row.preferred_contact_method = PREFERRED_CONTACT_METHODS.includes(
    contact as PreferredContactMethod
  )
    ? contact
    : "email";

  for (const [field, maxLen] of Object.entries(OPTIONAL_TEXT)) {
    row[field] = cleanText(input[field], maxLen);
  }
  for (const field of DATE_FIELDS) {
    row[field] = cleanDate(input[field]);
  }
  for (const field of BOOL_FIELDS) {
    row[field] = cleanBool(input[field]);
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, row };
}

function validFile(file: File): boolean {
  return (
    file.size > 0 &&
    file.size <= MAX_FILE_BYTES &&
    ALLOWED_FILE_TYPES.has(file.type.toLowerCase()) &&
    ALLOWED_FILE_EXT.test(file.name)
  );
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
 * Sliding-window check over the enquiry rows themselves. Returns 0 when the
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
        .from("visa_enquiries")
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

  // Parse: multipart (payload + files) or plain JSON.
  let payload: unknown;
  let files: File[] = [];
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const rawPayload = form.get("payload");
      if (typeof rawPayload !== "string") {
        return json(
          { ok: false, error: "Missing 'payload' field (JSON string)." },
          400
        );
      }
      payload = JSON.parse(rawPayload);
      files = form
        .getAll("documents")
        .filter((f): f is File => f instanceof File && f.size > 0);
    } else {
      payload = await request.json();
    }
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  if (files.length > MAX_FILES) {
    return json(
      { ok: false, error: `Too many files — maximum ${MAX_FILES}.` },
      400
    );
  }
  for (const file of files) {
    if (!validFile(file)) {
      return json(
        {
          ok: false,
          error: "Documents must be PDF, JPG or PNG and at most 10MB each.",
        },
        400
      );
    }
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
  // any error so an infra hiccup never blocks a genuine application.
  const ip = resolveClientIp(request.headers);
  const ipHash = ip
    ? createHash("sha256").update(ip).digest("hex")
    : null;
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

  // Insert the enquiry; the trigger assigns the #VQ-… reference.
  const { data: created, error: insertError } = await admin
    .from("visa_enquiries")
    .insert({ ...validated.row, status: "new", ip_hash: ipHash })
    .select("id, reference_number")
    .single();

  if (insertError || !created) {
    return json(
      { ok: false, error: "Could not save your application. Please try again." },
      500
    );
  }

  // Upload documents to the PRIVATE bucket under enquiry/<id>/…, then record
  // the stored references on the row. Best-effort per file: one bad upload
  // doesn't void a valid application.
  const stored: VisaDocument[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const key = `enquiry/${created.id}/${Date.now()}-${Math.round(
      Math.random() * 1e6
    )}-${safeName}`;
    const { error: uploadError } = await admin.storage
      .from("visa-documents")
      .upload(key, file, { contentType: file.type, upsert: false });
    if (!uploadError) {
      stored.push({ path: key, name: file.name.slice(-100), size: file.size, type: file.type });
    }
  }
  if (stored.length > 0) {
    await admin
      .from("visa_enquiries")
      .update({ documents: stored })
      .eq("id", created.id);
  }

  return json(
    {
      ok: true,
      reference: created.reference_number,
      documentsUploaded: stored.length,
    },
    201
  );
}
