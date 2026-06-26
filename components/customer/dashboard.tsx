"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plane,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { createClient } from "@/lib/supabase/client";
import { listMyCustomerOrders } from "@/lib/actions/customer";
import { CUSTOMER_ORDERS_KEY } from "@/lib/query-keys";
import type { OrderStatus } from "@/lib/db/types";
import { gbp, fmtDate } from "@/lib/format";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  open: "amber",
  closed: "green",
  cancelled: "red",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  open: "In progress",
  closed: "Completed",
  cancelled: "Cancelled",
};

/**
 * Live customer dashboard. Shares the CUSTOMER_ORDERS_KEY cache with My Orders so
 * both update together, and subscribes to realtime order changes (RLS scopes the
 * refetch to the caller's own orders) so a staff quote/price/status change shows
 * up here without a manual refresh. Stat cards + recent list update live.
 */
export function CustomerDashboard({ firstName }: { firstName: string }) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const { data: orders } = useQuery({
    queryKey: CUSTOMER_ORDERS_KEY,
    queryFn: listMyCustomerOrders,
  });
  const rows = useMemo(() => orders ?? [], [orders]);

  useEffect(() => {
    const channel = supabase
      .channel("customer-orders-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => queryClient.invalidateQueries({ queryKey: CUSTOMER_ORDERS_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const active = rows.filter((o) => o.status === "open").length;
  const completed = rows.filter((o) => o.status === "closed").length;
  const cancelled = rows.filter((o) => o.status === "cancelled").length;
  const recent = rows.slice(0, 3);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-navy sm:text-2xl">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your trips.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active Orders" value={String(active)} icon={Plane} hint="in progress" />
        <StatCard label="Completed Trips" value={String(completed)} icon={CheckCircle2} hint="all time" />
        <StatCard label="Cancelled" value={String(cancelled)} icon={Clock} hint="cancelled requests" />
      </div>

      {/* CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#1e3a5f_0%,#152c49_55%,#2c5282_100%)] p-7 shadow-card md:p-8">
        <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(120%_120%_at_20%_0%,black,transparent_75%)]" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div className="max-w-md">
            <h2 className="font-display text-xl font-semibold text-white md:text-2xl">
              Planning your next trip?
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              Tell us where you want to go and our team will find you the best fare.
            </p>
          </div>
          <Link
            href="/customer/book"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-sm font-semibold text-brand-dark shadow-sm transition-transform hover:scale-[1.02]"
          >
            Book a New Flight
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <SectionCard
        title="Recent Orders"
        action={
          <Link
            href="/customer/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        }
      >
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No orders yet — request a quote to get started.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-chip text-brand-dark">
                    <Plane className="size-5 -rotate-45" />
                  </div>
                  <div className="leading-tight">
                    <p className="font-medium text-foreground">
                      {o.route_from ?? "?"} → {o.route_to ?? "?"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(o.travel_date)}
                      {o.return_date ? ` · ${fmtDate(o.return_date)}` : ""} ·{" "}
                      {o.passengers ?? 1} pax
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pl-13 sm:pl-0">
                  {o.selling_price != null ? (
                    <span className="font-display text-sm font-semibold text-foreground">
                      {gbp(o.selling_price)}
                    </span>
                  ) : null}
                  <StatusBadge tone={ORDER_TONE[o.status]}>
                    {STATUS_LABEL[o.status]}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Help footer */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-neutral-soft px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Prefer WhatsApp? You can also chat with our team directly.
        </p>
        <Link
          href="/customer/messages"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-dark"
        >
          Open messages <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
