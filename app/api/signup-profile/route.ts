import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIMITS, sanitizeLine } from "@/lib/security/limits";

/**
 * Finalizes a public sign-up by forcing the new profile's role to "customer"
 * — or to "helper" when the caller asks for it, which is the only other value
 * this endpoint will ever write. Staff roles are never reachable from here.
 * The DB trigger defaults new profiles to a staff role, so public signups must
 * be corrected here using the service-role key (server-only, never client).
 *
 * Authorization (defends against downgrading an existing account): we only
 * proceed when EITHER
 *   - the caller has a session matching userId (email-confirmation OFF), OR
 *   - the target user is brand-new and still unverified (email-confirmation ON).
 * A verified account with no matching session can never be touched here.
 */
export async function POST(request: Request) {
  let body: { userId?: string; fullName?: string | null; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { userId } = body;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  // Cap length + strip control characters before it lands on profiles/customers.
  // The value only ever renders as escaped React text, but we never trust raw
  // client input on a public-reachable write path.
  const fullName = body.fullName ? sanitizeLine(body.fullName, LIMITS.FULL_NAME) || null : null;

  // The ONLY two values a public sign-up may produce. Anything else — most of
  // all "admin" or "employee" — falls back to customer rather than erroring,
  // because a tampered payload should be quietly ordinary, not informative.
  const role = body.role === "helper" ? "helper" : "customer";

  // Path A: an active session that matches the user (confirmation disabled).
  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  const sessionMatches = sessionUser?.id === userId;

  // Path B: a freshly created, still-unverified user (confirmation enabled).
  const admin = createAdminClient();
  const { data: target, error: lookupError } =
    await admin.auth.admin.getUserById(userId);

  if (lookupError || !target?.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isUnverifiedNewUser = !target.user.email_confirmed_at;

  if (!sessionMatches && !isUnverifiedNewUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      role,
      full_name: fullName ?? null,
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Link a customers row so customer-portal RLS resolves (owns_customer / own
  // conversations + orders all key off customers.profile_id). Best-effort: a
  // failure here shouldn't block account creation. Avoid duplicates on retry.
  //
  // Helpers get NO customers row. They never place an order or hold a
  // conversation, so the row would resolve nothing — and it would put a
  // service provider in the admin's Customers list, which is precisely the
  // confusion the separate role exists to end.
  let customerLinked = true;
  const { data: existingCustomer } =
    role === "customer"
      ? await admin
          .from("customers")
          .select("id")
          .eq("profile_id", userId)
          .maybeSingle()
      : { data: { id: "not-a-customer" } };

  if (!existingCustomer) {
    const { error: customerError } = await admin.from("customers").insert({
      profile_id: userId,
      name: fullName ?? null,
      wa_phone: null,
    });
    if (customerError) customerLinked = false;
  }

  return NextResponse.json({ ok: true, customerLinked });
}
