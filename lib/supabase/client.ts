import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The browser Supabase client, as a per-tab SINGLETON.
 *
 * This used to return a fresh client on every call, and that was a scaling
 * bug rather than a style one: each client opens its OWN Realtime WebSocket.
 * A signed-in user always has the notification bell mounted in the shell, and
 * most screens subscribe to something as well, so every session held two or
 * three sockets instead of one. At a hundred concurrent users that is 200–300
 * connections against a ceiling of 200 — the portal would have started
 * dropping realtime, and the failure would have looked like "the database is
 * down" rather than "we opened too many sockets".
 *
 * One client per tab fixes it. Channels are multiplexed as topics over that
 * single socket, so any number of screens can subscribe for the cost of one
 * connection. Reusing the client is explicitly what @supabase/ssr's browser
 * client is built for — it reads the auth cookies on each request rather than
 * capturing them at construction, so a cached instance never serves a stale
 * session.
 *
 * The cache is guarded on `window`: a client component still renders once on
 * the server during SSR, and caching there would share one client — and one
 * user's session — across concurrent requests.
 */
let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (typeof window === "undefined") {
    // SSR pass: never cache. This instance is thrown away with the request.
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  browserClient ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return browserClient;
}
