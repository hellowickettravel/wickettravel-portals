import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { corsHeaders } from "@/lib/security/cors";
import { isMissingTable } from "@/lib/db/errors";
import { toPublicOptions, type BoardOption } from "@/lib/parent-assist-options";

/**
 * PUBLIC Parent Travel Assist board options — GET /api/parent-ticket/options
 *
 * The airports, airlines, languages and "help needed" options an admin keeps
 * at /admin/parents-options, for the website's board search and filters.
 * Read-only, no auth, active rows only. Nothing here is personal data.
 *
 * Until migration 0027 has been run this answers `{ ok: true, options: null }`
 * and the website falls back to its built-in lists — a missing table is a
 * setup step, not an outage.
 *
 * Cached at the edge for 5 minutes (stale-while-revalidate for an hour):
 * admin edits reach the website within minutes, and visitors never wait on
 * the database.
 */

const CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin"), "GET"),
  });
}

export async function GET(request: Request) {
  const headers = corsHeaders(request.headers.get("origin"), "GET");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("parent_assist_options")
    .select("kind, value, label, region")
    .eq("is_active", true)
    .order("sort_order")
    .order("value");

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        { ok: true, options: null },
        { status: 200, headers: { ...headers, "Cache-Control": CACHE } }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Could not load options." },
      { status: 500, headers: { ...headers, "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { ok: true, options: toPublicOptions((data ?? []) as BoardOption[]) },
    { status: 200, headers: { ...headers, "Cache-Control": CACHE } }
  );
}
