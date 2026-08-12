"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/admin/ui";

/**
 * Makes a SERVER-rendered screen live.
 *
 * The client screens in this portal each hold a TanStack query and invalidate
 * it from a realtime channel. Analytics (and other screens whose figures are
 * computed during the RSC render) had no such hook at all: the numbers were
 * whatever they were when the page was requested, and an order completing
 * elsewhere never showed up until someone reloaded by hand. Rather than
 * rewriting those screens into client components — which would ship the whole
 * dataset to the browser to recompute figures the server already has — this
 * subscribes to the tables that feed them and calls `router.refresh()`, which
 * re-runs the server render and streams the new markup in.
 *
 * Two things stop it thrashing:
 *   - changes are COALESCED over `settleMs`, so a bulk update produces one
 *     refresh rather than one per row;
 *   - the indicator is honest about what is happening, because a page whose
 *     numbers change under you with no explanation is worse than a stale one.
 */
export function LiveRefresh({
  tables,
  channel,
  settleMs = 700,
  label = "Live",
}: {
  /** Postgres tables whose changes should re-render this screen. */
  tables: string[];
  /** Unique channel name. Two screens sharing one name share one socket topic. */
  channel: string;
  settleMs?: number;
  label?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = tables.join(",");

  useEffect(() => {
    const list = key.split(",").filter(Boolean);

    const onChange = () => {
      setRefreshing(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        router.refresh();
        // The refresh is a server round trip; give the indicator long
        // enough to be seen rather than flashing for one frame.
        setTimeout(() => setRefreshing(false), 600);
      }, settleMs);
    };

    /**
     * ONE CHANNEL PER TABLE, and that is not a style choice.
     *
     * All the tables used to share a single channel. Supabase Realtime
     * validates the whole `postgres_changes` list when the channel joins, and
     * if ANY table in it is missing from the `supabase_realtime` publication
     * it replies:
     *
     *   status: "error" — "Unable to subscribe to changes with given
     *   parameters. Please check Realtime is enabled…"
     *
     * and tears down the ENTIRE channel. One table nobody had added to the
     * publication silently killed live updates for the three that were
     * correctly configured, with no error anywhere in the app — the indicator
     * still said "Live". Per-table channels isolate that: a missing table
     * costs you that table, not the screen.
     *
     * They all still ride the one WebSocket — the browser client is a per-tab
     * singleton — so this costs topics, not sockets.
     */
    const channels = list.map((table) =>
      supabase
        .channel(`${channel}:${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, onChange)
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" && process.env.NODE_ENV !== "production") {
            // Loud in development, silent in production: a screen that cannot
            // go live is degraded, not broken, and the visitor can still read
            // it and reload.
            console.warn(
              `[LiveRefresh] "${table}" did not subscribe — is it in the supabase_realtime publication?`,
              err?.message ?? ""
            );
          }
        })
    );

    return () => {
      if (timer.current) clearTimeout(timer.current);
      for (const ch of channels) void supabase.removeChannel(ch);
    };
  }, [supabase, channel, key, router, settleMs]);

  return (
    <span
      role="status"
      aria-live="polite"
      className="text-ink-600 border-line-field inline-flex h-[34px] items-center gap-2 rounded-full border bg-white px-3.5 text-[12px] font-medium whitespace-nowrap"
    >
      {refreshing ? (
        <>
          <Spinner size={12} />
          Updating…
        </>
      ) : (
        <>
          <span className="bg-ok-ink block size-[7px] flex-none rounded-full" />
          {label}
        </>
      )}
    </span>
  );
}
