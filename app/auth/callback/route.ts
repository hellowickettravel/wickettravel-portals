import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  // Default to a safe "no access" bounce rather than silently landing unknown
  // users in the customer portal.
  let dest = "/login?error=no_access";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null }>();
    dest = roleDashboardPath(profile?.role) ?? "/login?error=no_access";
  }

  return NextResponse.redirect(`${origin}${dest}`);
}
