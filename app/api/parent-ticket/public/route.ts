import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFrom } from "@/lib/security/rate-limit";
import { corsHeaders } from "@/lib/security/cors";
import {
  PARENT_TICKET_TYPES,
  maskDisplayName,
  type ParentTicketType,
} from "@/lib/parents-tickets";

/**
 * PUBLIC Parents Tickets board — GET /api/parent-ticket/public
 *
 * Feeds the public homepage with the handful of leads an admin has explicitly
 * approved for display. Read-only; no auth.
 *
 * PRIVACY MODEL — the important part of this file:
 *   • Two gates, both required: consent_public (the submitter opted in on the
 *     form) AND is_public (an admin approved it by hand). Nothing appears here
 *     by default; a fresh row is invisible until a human turns it on.
 *   • The SELECT below is an explicit allowlist of non-identifying columns.
 *     email, phone, full_name, parent_name, parent_age, mobility_needs, notes,
 *     admin_notes, ip_hash, status and the fee/offer amounts are never read out
 *     of the database at all — so they cannot leak through a serialisation slip
 *     or a future field being added to the response by accident.
 *   • full_name IS selected, but only to derive a masked display name
 *     ("James Wilson" → "James W.") — the raw value never reaches the response
 *     body. See maskDisplayName in lib/parents-tickets.ts.
 *   • Filters are whitelisted/sanitised, so the query string cannot widen the
 *     result set or be used to probe for hidden rows.
 *
 * Query filters (all optional):
 *   type=traveller|requester   — which side of the board
 *   airport=<text>             — substring match on from_location
 *   date=YYYY-MM-DD            — exact travel_date
 *   limit=1..50                — page size (default 20)
 *
 * Caching: responses are public and identical for everyone, so they are cached
 * at the edge for 60s with a 5-minute stale-while-revalidate. That also absorbs
 * most traffic before it reaches the rate limiter below.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Per-IP burst limit for cache misses. In-memory and therefore per serverless
// instance — deliberately a cheap backstop, not a hard guarantee: the edge
// cache above is what actually absorbs load. Fail-open in spirit with the rest
// of lib/security.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 60;
const hits = new Map<string, number[]>();

/** True when this IP has exceeded the burst window. Also prunes old entries. */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;

  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => t <= cutoff)) hits.delete(key);
    }
  }

  const recent = (hits.get(ip) ?? []).filter((t) => t > cutoff);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_MAX_REQUESTS;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin"), "GET"),
  });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The exact column allowlist. Adding anything identifying here is the one way
 * this endpoint could leak — treat this line as security-critical.
 * full_name is present ONLY as the input to maskDisplayName.
 */
const PUBLIC_COLUMNS =
  "reference_number, enquiry_type, full_name, from_location, to_location, travel_date, airline, languages, assistance_offered, assistance_needed";

type PublicRow = {
  reference_number: string;
  enquiry_type: ParentTicketType;
  full_name: string | null;
  from_location: string | null;
  to_location: string | null;
  travel_date: string | null;
  airline: string | null;
  languages: string | null;
  assistance_offered: string | null;
  assistance_needed: string | null;
};

/** Strip control chars and PostgREST filter metacharacters from a filter value. */
function cleanFilter(value: string | null, maxLen: number): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // PostgREST treats these as filter syntax inside a value — neutralise them
    // so `airport` can only ever be a plain substring match.
    .replace(/[%,()*\\]/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, maxLen) : null;
}

export async function GET(request: Request) {
  const headers = corsHeaders(request.headers.get("origin"), "GET");

  const ip = clientIpFrom(request.headers);
  if (ip && isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: "Too many requests." },
      {
        status: 429,
        headers: { ...headers, "Retry-After": "60", "Cache-Control": "no-store" },
      }
    );
  }

  const params = new URL(request.url).searchParams;

  const typeParam = cleanFilter(params.get("type"), 20);
  const type =
    typeParam && PARENT_TICKET_TYPES.includes(typeParam as ParentTicketType)
      ? (typeParam as ParentTicketType)
      : null;

  const airport = cleanFilter(params.get("airport"), 100);

  const dateParam = params.get("date");
  const date =
    dateParam && DATE_RE.test(dateParam) && !Number.isNaN(new Date(dateParam).getTime())
      ? dateParam
      : null;

  const limitParam = Number(params.get("limit"));
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const admin = createAdminClient();
  let query = admin
    .from("parent_ticket_enquiries")
    .select(PUBLIC_COLUMNS)
    // BOTH gates, always. Never relax these.
    .eq("is_public", true)
    .eq("consent_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type) query = query.eq("enquiry_type", type);
  if (airport) query = query.ilike("from_location", `%${airport}%`);
  if (date) query = query.eq("travel_date", date);

  const { data, error } = await query.returns<PublicRow[]>();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Could not load listings." },
      { status: 500, headers: { ...headers, "Cache-Control": "no-store" } }
    );
  }

  // Build the response field by field — never spread the DB row.
  const entries = (data ?? []).map((row) => ({
    reference: row.reference_number,
    enquiry_type: row.enquiry_type,
    display_name: maskDisplayName(row.full_name),
    from_location: row.from_location,
    to_location: row.to_location,
    travel_date: row.travel_date,
    airline: row.airline,
    languages: row.languages,
    assistance_offered: row.assistance_offered,
    assistance_needed: row.assistance_needed,
  }));

  return NextResponse.json(
    { ok: true, count: entries.length, entries },
    {
      status: 200,
      headers: {
        ...headers,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
