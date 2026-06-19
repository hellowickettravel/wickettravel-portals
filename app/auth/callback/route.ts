import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleDashboardPath } from "@/lib/auth";

/** Resolve the public origin, honouring Vercel's forwarding headers. */
function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  return forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;
}

/**
 * Auth callback for email verification and OAuth (PKCE). Exchanges the code
 * for a session, then redirects the user to their role dashboard.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const origin = publicOrigin(request);

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_access`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  let role = profile?.role ?? null;

  // SECURITY: existing admins / employees are NEVER downgraded — keep their role
  // and send them to their portal. Only brand-new OAuth users (no profile, or a
  // default 'customer' one) get provisioned as a CUSTOMER with a linked customers
  // row, mirroring the email-signup path (/api/signup-profile). The DB trigger
  // already defaults new profiles to 'customer'; this also covers a trigger race
  // or a Google user who arrived before that change.
  if (role !== "admin" && role !== "employee") {
    const admin = createAdminClient();
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null;

    if (role !== "customer") {
      const { error: upsertError } = await admin.from("profiles").upsert(
        {
          id: user.id,
          role: "customer",
          full_name: fullName,
          email: user.email ?? null,
        },
        { onConflict: "id" }
      );
      if (!upsertError) role = "customer";
    }

    // Link a customers row so customer-portal RLS resolves (owns_customer / own
    // conversations + orders key off customers.profile_id). Idempotent.
    const { data: existingCustomer } = await admin
      .from("customers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!existingCustomer) {
      await admin.from("customers").insert({
        profile_id: user.id,
        name: fullName,
        wa_phone: null,
      });
    }
  }

  const dest = roleDashboardPath(role) ?? "/login?error=no_access";
  return NextResponse.redirect(`${origin}${dest}`);
}
