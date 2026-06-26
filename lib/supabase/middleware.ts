import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Session refresh — zaroori, isko mat hatao
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Agar user logged-in NAHI hai aur protected route pe hai → login pe bhej do
  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/admin") ||
    path.startsWith("/employee") ||
    path.startsWith("/customer");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed (e.g. a shared booking link) so login can
    // send them straight there afterwards instead of the default dashboard.
    url.search = `?redirect=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}