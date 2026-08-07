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
            staleTime: 30_000, // 30s — avoid refetching freshly-loaded data
            refetchOnWindowFocus: false,
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
