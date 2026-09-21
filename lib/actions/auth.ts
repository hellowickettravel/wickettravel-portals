"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server action: sign the current user out, then send them somewhere.
 * Use directly as a <form action={signOut}> handler, or bind a destination
 * first — `signOut.bind(null, MARKETING_SITE_URL)` — for a portal where
 * "signed out" shouldn't mean "back at this portal's own login page".
 * The customer portal does this (see AdminShell's `signOutRedirectTo`):
 * a departing traveller lands on the public marketing site, not a login
 * form, while staff portals keep the "/login" default.
 */
export async function signOut(redirectTo: string = "/login") {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(redirectTo);
}
