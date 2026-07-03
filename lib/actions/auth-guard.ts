"use server";

import { headers } from "next/headers";
import {
  checkLoginRateLimit,
  checkSignupRateLimit,
  recordAuthAttempt,
  clientIpFrom,
} from "@/lib/security/rate-limit";

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
