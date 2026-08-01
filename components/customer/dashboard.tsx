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
  new: "blue",
  in_progress: "gold",
  completed: "green",
  cancelled: "red",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Received",
  in_progress: "In progress",
  completed: "Completed",
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

  const active = rows.filter(
    (o) => o.status === "new" || o.status === "in_progress"
  ).length;
  const completed = rows.filter((o) => o.status === "completed").length;
  const cancelled = rows.filter((o) => o.status === "cancelled").length;
  const recent = rows.slice(0, 3);

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-tx-head sm:text-2xl">
          Welcome back, {firstName}
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
      <div className="rounded-card bg-marine p-6 md:p-7">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div className="max-w-md">
            <h2 className="tracking-heading text-xl font-semibold text-white md:text-2xl">
              Planning your next trip?
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              Tell us where you want to go and our team will find you the best fare.
            </p>
          </div>
          <Link
            href="/customer/book"
            className="inline-flex h-[42px] items-center gap-2 rounded-control bg-coral px-[18px] text-[15px] font-semibold tracking-ui text-tx-invert outline-none transition-colors duration-150 ease-brand hover:bg-coral-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Book a New Flight
            <ArrowRight className="size-[17px]" />
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <SectionCard
        title="Recent Orders"
        action={
          <Link
            href="/customer/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-marine transition-colors hover:text-marine-deep"
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
                  <div className="flex size-10 items-center justify-center rounded-card bg-marine-tint text-marine-deep">
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
                    <span className="tracking-heading text-sm font-semibold text-foreground">
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
      <div className="flex items-center justify-between rounded-card border border-border bg-sunk px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Have a question? Chat with our team directly in the portal.
        </p>
        <Link
          href="/customer/messages"
          className="inline-flex items-center gap-1 text-sm font-medium text-marine hover:text-marine-deep"
        >
          Open messages <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
