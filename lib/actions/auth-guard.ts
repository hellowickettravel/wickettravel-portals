"use server";

import { headers } from "next/headers";
import {
  checkLoginRateLimit,
  checkSignupRateLimit,
  recordAuthAttempt,
  clientIpFrom,
} from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-side gate for the auth forms. The login/signup pages sign in through
 * the browser Supabase client (SSR cookie flow), but they MUST clear these gates
 * first so brute-force / bot-signup throttling is enforced server-side, not in
 * the client where it could be skipped.
 *
 * Flow:
 *   login  → guardLogin(email) before signIn; recordLogin(email, success) after.
 *   signup → guardSignup(email) before signUp; recordSignup(email) after.
 *
 * Every response is generic ("too many attempts") so a locked state never
 * reveals whether an email is registered.
 */

type GateResult = { ok: true } | { ok: false; retryAfterSeconds: number };

async function ip(): Promise<string | null> {
  return clientIpFrom(await headers());
}

/** Check the login rate limit BEFORE attempting sign-in. */
export async function guardLogin(email: string): Promise<GateResult> {
  const result = await checkLoginRateLimit(await ip(), email || "");
  return result.allowed
    ? { ok: true }
    : { ok: false, retryAfterSeconds: result.retryAfterSeconds };
}

/** Record the outcome of a login attempt (drives the sliding window). */
export async function recordLogin(
  email: string,
  success: boolean
): Promise<void> {
  await recordAuthAttempt({ kind: "login", ip: await ip(), email: email || "", success });
}

/** Check the signup rate limit BEFORE attempting sign-up. */
export async function guardSignup(email: string): Promise<GateResult> {
  const result = await checkSignupRateLimit(await ip());
  return result.allowed
    ? { ok: true }
    : { ok: false, retryAfterSeconds: result.retryAfterSeconds };
}

/** Record a signup attempt (drives the per-IP flood window). */
export async function recordSignup(email: string): Promise<void> {
  await recordAuthAttempt({ kind: "signup", ip: await ip(), email: email || "", success: true });
}

/**
 * Does this email already have a portal account? Asked by the booking wizard
 * when a signed-out visitor presses send, so someone who already has an
 * account is offered a sign-in on the spot (and their order goes straight
 * through) instead of being walked into a sign-up that can't succeed.
 *
 * This does reveal whether an address is registered — the client asked for
 * exactly that behaviour on the booking form. To keep it from being a free
 * enumeration oracle, each lookup counts as a failed login against the
 * caller's IP (never against the address itself, so a real customer's own
 * sign-in isn't locked by it): ten lookups or failed logins per IP per 15
 * minutes, and then the answer is "unknown", which sends them to sign-up.
 */
export async function bookingEmailHasAccount(
  email: string
): Promise<{ ok: true; exists: boolean } | { ok: false }> {
  const clean = email.trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false };

  const addr = await ip();
  const gate = await checkLoginRateLimit(addr, clean);
  if (!gate.allowed) return { ok: false };
  await recordAuthAttempt({ kind: "login", ip: addr, email: `lookup:${clean}`, success: false });

  try {
    const { data, error } = await createAdminClient()
      .from("profiles")
      .select("id")
      // ilike for case; escape its wildcards so "a_b@x.com" can't match "axb@x.com".
      .ilike("email", clean.replace(/[\\%_]/g, (c) => `\\${c}`))
      .limit(1);
    if (error) return { ok: false };
    return { ok: true, exists: (data?.length ?? 0) > 0 };
  } catch {
    return { ok: false };
  }
}
