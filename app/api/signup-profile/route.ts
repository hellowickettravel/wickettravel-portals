import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Finalizes a public sign-up by forcing the new profile's role to "customer".
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
  let body: { userId?: string; fullName?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { userId, fullName } = body;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

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
      role: "customer",
      full_name: fullName ?? null,
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
