import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-side rate limiting backed by the `auth_attempts` table (migration
 * 0017), read/written only through the service-role client. We have no paid WAF,
 * so the app itself throttles credential-stuffing, brute-force login, and bot
 * signup floods.
 *
 * FAIL-OPEN by design: every DB call here is wrapped so that if the table is
 * missing (migration not yet applied) or a query errors, auth still works — we
 * never lock real users out because of an infra hiccup. The limiter only ever
 * *adds* protection when the table is present.
 *
 * Non-enumerating: we key primarily on client IP and store only a SHA-256 hash
 * of the email (never the raw address), and every caller surfaces the SAME
 * generic message, so a locked state never reveals whether an email is
 * registered.
 */

export type AuthKind = "login" | "signup";

// Sliding windows + thresholds (kept deliberately lenient for real users).
const LOGIN_WINDOW_SEC = 15 * 60; // 15 minutes
const LOGIN_MAX_FAILED_PER_IP = 10; // failed logins from one IP in the window
const LOGIN_MAX_FAILED_PER_EMAIL = 6; // failed logins for one email in the window
const SIGNUP_WINDOW_SEC = 60 * 60; // 1 hour
const SIGNUP_MAX_PER_IP = 8; // signups attempted from one IP in the window

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const ALLOW: RateLimitResult = { allowed: true, retryAfterSeconds: 0 };

/** SHA-256 of the normalised email. We never persist the raw address. */
export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). The
 * caller passes the request headers; we take the first hop. Returns null if
 * unknown (limiter then relies on the email-hash key alone).
 */
export function clientIpFrom(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim().slice(0, 100) || null;
  return headers.get("x-real-ip")?.slice(0, 100) ?? null;
}

async function countSince(
  column: "ip" | "email_hash",
  value: string,
  kind: AuthKind,
  windowSec: number,
  onlyFailed: boolean
): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - windowSec * 1000).toISOString();
    let q = admin
      .from("auth_attempts")
      .select("id", { count: "exact", head: true })
      .eq("kind", kind)
      .eq(column, value)
      .gte("created_at", since);
    if (onlyFailed) q = q.eq("success", false);
    const { count, error } = await q;
    if (error) return null; // fail-open (e.g. table absent)
    return count ?? 0;
  } catch {
    return null; // fail-open
  }
}

/**
 * Should this login attempt be allowed? Blocks when either the IP or the email
 * has too many recent FAILED attempts. Fail-open on any error.
 */
export async function checkLoginRateLimit(
  ip: string | null,
  email: string
): Promise<RateLimitResult> {
  const emailHash = hashEmail(email);

  if (ip) {
    const byIp = await countSince("ip", ip, "login", LOGIN_WINDOW_SEC, true);
    if (byIp !== null && byIp >= LOGIN_MAX_FAILED_PER_IP) {
      return { allowed: false, retryAfterSeconds: LOGIN_WINDOW_SEC };
    }
  }

  const byEmail = await countSince(
    "email_hash",
    emailHash,
    "login",
    LOGIN_WINDOW_SEC,
    true
  );
  if (byEmail !== null && byEmail >= LOGIN_MAX_FAILED_PER_EMAIL) {
    return { allowed: false, retryAfterSeconds: LOGIN_WINDOW_SEC };
  }

  return ALLOW;
}

/** Should this signup attempt be allowed? Blocks bot signup floods per IP. */
export async function checkSignupRateLimit(
  ip: string | null
): Promise<RateLimitResult> {
  if (!ip) return ALLOW;
  const byIp = await countSince("ip", ip, "signup", SIGNUP_WINDOW_SEC, false);
  if (byIp !== null && byIp >= SIGNUP_MAX_PER_IP) {
    return { allowed: false, retryAfterSeconds: SIGNUP_WINDOW_SEC };
  }
  return ALLOW;
}

/** Record an attempt. Fire-and-forget; never throws, never blocks the caller. */
export async function recordAuthAttempt(input: {
  kind: AuthKind;
  ip: string | null;
  email: string;
  success: boolean;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("auth_attempts").insert({
      kind: input.kind,
      ip: input.ip,
      email_hash: hashEmail(input.email),
      success: input.success,
    });
  } catch {
    /* fail-silent — logging must never break auth */
  }
}

/**
 * Generic per-user abuse throttle used by the write actions (orders, messages).
 * Counts the caller's OWN recent rows in a table via the service-role client and
 * blocks once they exceed `max` within `windowSec`. Fail-open on error.
 */
export async function tooManyRecentRows(input: {
  table: string;
  column: string;
  value: string;
  windowSec: number;
  max: number;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - input.windowSec * 1000).toISOString();
    const { count, error } = await admin
      .from(input.table)
      .select("id", { count: "exact", head: true })
      .eq(input.column, input.value)
      .gte("created_at", since);
    if (error || count === null) return false; // fail-open
    return count >= input.max;
  } catch {
    return false; // fail-open
  }
}
