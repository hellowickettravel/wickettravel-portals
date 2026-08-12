"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  downgradeAuthCookiesToSession,
  isSessionOnly,
} from "@/lib/auth/session-persistence";

// Dev-only: lazy-load the devtools so the package is never pulled into the
// production bundle. In prod this resolves to a no-op component and the import
// is never evaluated, so it fully tree-shakes out.
const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? dynamic(() =>
        import("@tanstack/react-query-devtools").then(
          (m) => m.ReactQueryDevtools
        )
      )
    : () => null;

/**
 * Client-side data provider. One QueryClient per browser session, created lazily
 * in state so it survives re-renders but isn't shared across requests on the
 * server. Screens start using this in Batch 3b+.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /**
             * Five minutes, not thirty seconds.
             *
             * Every list screen in this portal subscribes to `postgres_changes`
             * for the tables it renders and calls `invalidateQueries` when one
             * moves. Realtime IS the invalidation signal — the clock is only a
             * fallback for a dropped socket. At 30s the app was re-fetching
             * data it already knew was current every time you navigated back
             * to a screen, which is a ~200ms round trip per visit buying
             * nothing.
             *
             * `refetchOnReconnect` stays on so a laptop coming out of sleep
             * (where the socket died and missed events) resyncs immediately.
             */
            staleTime: 5 * 60_000,
            gcTime: 30 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      })
  );

  // Honour an unticked "Keep me signed in" for the whole visit: every token
  // refresh re-writes the auth cookies with Supabase's 400-day Max-Age, so we
  // downgrade them back to session cookies each time the auth state changes.
  // No-op — and no Supabase import evaluated — unless the marker cookie is set.
  useEffect(() => {
    if (!isSessionOnly()) return;
    downgradeAuthCookiesToSession();

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void import("@/lib/supabase/client").then(({ createClient }) => {
      const { data } = createClient().auth.onAuthStateChange(() => {
        if (isSessionOnly()) downgradeAuthCookiesToSession();
      });
      if (cancelled) data.subscription.unsubscribe();
      else unsubscribe = () => data.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
