"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { listMyCustomerOrders } from "@/lib/actions/customer";
import { CUSTOMER_ORDERS_KEY } from "@/lib/query-keys";
import { cabinLabel } from "@/lib/orders/form";
import { paxSummary, splitPlace } from "@/lib/orders/display";
import {
  gbp,
  fmtDate,
  fmtLongDate,
  customerStatusLabel,
  routeLabel,
} from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/db/types";
import { BoardingPass } from "@/components/admin/boarding-pass";
import {
  Btn,
  Card,
  CardHead,
  EmptyState,
  Kpi,
  KpiGrid,
  PageHead,
  Pill,
  Screen,
  type PillTone,
} from "@/components/admin/ui";
import {
  ArrowRightIcon,
  ChatIcon,
  CheckCircleIcon,
  ClockIcon,
  LifebuoyIcon,
  OrdersIcon,
  PlaneIcon,
  PoundIcon,
} from "@/components/admin/icons";

const PILL_TONE: Record<OrderStatus, PillTone> = {
  new: "marine",
  in_progress: "warn",
  completed: "ok",
  cancelled: "ink",
};

/** The soonest departure still ahead of us, on an order that is still alive. */
function nextTripOf(orders: Order[], now: number): Order | null {
  return (
    orders
      .filter(
        (o) =>
          o.status !== "cancelled" &&
          o.travel_date &&
          new Date(o.travel_date).getTime() >= now
      )
      .sort(
        (a, b) =>
          new Date(a.travel_date!).getTime() - new Date(b.travel_date!).getTime()
      )[0] ?? null
  );
}

/**
 * The traveller's home screen, on the same design system as the staff portals.
 * Shares the CUSTOMER_ORDERS_KEY cache with My Orders so both update together,
 * and subscribes to realtime order changes (RLS scopes the refetch to the
 * caller's own orders) — so when the team adds a quote or moves an order on,
 * the figures and the boarding pass change under the customer without a
 * refresh.
 */
export function CustomerDashboard({
  firstName,
  nowIso,
}: {
  firstName: string;
  /** Request time, read on the server — the render itself stays pure. */
  nowIso: string;
}) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const { data: orders, isLoading } = useQuery({
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
  );
  const awaitingQuote = active.filter((o) => o.selling_price == null).length;
  const completed = rows.filter((o) => o.status === "completed");
  const spent = completed.reduce((s, o) => s + (o.selling_price ?? 0), 0);

  const now = new Date(nowIso).getTime();
  const nextTrip = nextTripOf(rows, now);
  const recent = rows.slice(0, 5);

  const from = nextTrip ? splitPlace(nextTrip.route_from) : null;
  const to = nextTrip ? splitPlace(nextTrip.route_to) : null;

  return (
    <Screen width={1240}>
      <PageHead
        title={`Welcome back, ${firstName}`}
        intro={`Everything you have with us — ${fmtLongDate(nowIso)}.`}
        actions={
          <Btn as="link" href="/customer/book" variant="ember">
            <PlaneIcon size={15} />
            Book a flight
          </Btn>
        }
      />

      <KpiGrid>
        <Kpi
          label="Active orders"
          value={active.length}
          meta="Received or being worked on"
          tone="marine"
          icon={<OrdersIcon size={18} />}
        />
        <Kpi
          label="Awaiting a quote"
          value={awaitingQuote}
          meta="We'll message you the moment a fare is ready"
          tone="warn"
          icon={<ClockIcon size={18} />}
        />
        <Kpi
          label="Completed trips"
          value={completed.length}
          meta="Booked and ticketed"
          tone="ok"
          icon={<CheckCircleIcon size={18} />}
        />
        <Kpi
          label="Total spent"
          value={gbp(spent)}
          meta="Across every completed booking"
          tone="ink"
          icon={<PoundIcon size={18} />}
        />
      </KpiGrid>

      {/* ----------------------------------------------------- next trip */}
      {nextTrip && from && to ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="text-ember-700 text-[11px] font-medium tracking-[0.13em] uppercase">
              Your next trip
            </span>
            <Link
              href={`/customer/orders/${nextTrip.id}`}
              className="text-marine-600 text-[12.5px] font-medium whitespace-nowrap no-underline hover:no-underline"
            >
              Open this order
            </Link>
          </div>
          <BoardingPass
            carrier={
              nextTrip.airline?.trim() ||
              (nextTrip.return_date ? "Return flight" : "One way")
            }
            reference={nextTrip.flight_numbers?.trim() || nextTrip.order_number}
            fromCode={from.code}
            fromCity={from.city}
            toCode={to.code}
            toCity={to.city}
            departs={fmtDate(nextTrip.travel_date)}
            returns={nextTrip.return_date ? fmtDate(nextTrip.return_date) : "—"}
            cabin={cabinLabel(nextTrip.cabin_class)}
            passengers={paxSummary(
              nextTrip.adults,
              nextTrip.children,
              nextTrip.passengers
            )}
            price={
              nextTrip.selling_price != null
                ? gbp(nextTrip.selling_price)
                : "Awaiting quote"
            }
            priceLabel="Total price"
            statusLabel={customerStatusLabel(nextTrip.status)}
            statusTone={PILL_TONE[nextTrip.status]}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-stretch gap-4">
        {/* ---------------------------------------------- recent orders */}
        <Card className="flex h-full flex-col min-[1000px]:col-span-2">
          <CardHead
            title="Recent orders"
            action={
              <Link
                href="/customer/orders"
                className="text-marine-600 text-[12.5px] leading-[normal] font-medium whitespace-nowrap no-underline hover:no-underline"
              >
                View all
              </Link>
            }
          />
          <div className="min-h-0 flex-1">
            {isLoading ? (
              <div className="text-ink-600 px-5 py-10 text-center text-[13px] font-normal">
                Loading your orders…
              </div>
            ) : recent.length === 0 ? (
              <EmptyState
                title="No orders yet"
                body="Tell us where you want to go and our team will come back with a fare. Everything you book then lives here."
                action={
                  <Btn as="link" href="/customer/book" variant="ember">
                    <PlaneIcon size={15} />
                    Book a flight
                  </Btn>
                }
              />
            ) : (
              recent.map((o) => (
                <Link
                  key={o.id}
                  href={`/customer/orders/${o.id}`}
                  className="border-line-soft hover:bg-surface-1 flex w-full items-center gap-4 border-b bg-white px-5 py-3 text-left leading-[normal] no-underline hover:no-underline"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-ink-800 max-w-full truncate text-[13px] font-medium">
                        {routeLabel(o.route_from, o.route_to)}
                      </span>
                      <span className="text-ink-500 text-[11.5px] font-normal tabular-nums">
                        {o.order_number}
                      </span>
                    </span>
                    <span className="text-ink-600 text-[12.5px] font-normal">
                      {o.travel_date ? fmtDate(o.travel_date) : "Date to confirm"}
                      {o.return_date ? ` → ${fmtDate(o.return_date)}` : ""} ·{" "}
                      {paxSummary(o.adults, o.children, o.passengers)}
                    </span>
                  </span>
                  <Pill tone={PILL_TONE[o.status]}>
                    {customerStatusLabel(o.status)}
                  </Pill>
                  <span className="text-ink-800 min-w-[74px] flex-none text-right text-[13px] font-medium tabular-nums">
                    {o.selling_price != null ? gbp(o.selling_price) : "—"}
                  </span>
                </Link>
              ))
            )}
          </div>
          {recent.length > 0 ? (
            <div className="border-line-soft mt-auto flex flex-none items-center justify-between gap-3 border-t px-5 py-3.5">
              <span className="text-ink-600 text-[12px] font-normal">
                Showing {recent.length} of {rows.length} orders
              </span>
              <Btn as="link" href="/customer/orders" size="sm">
                View all
              </Btn>
            </div>
          ) : null}
        </Card>
      </div>

      {/* --------------------------------------------------- talk to us */}
      <div className="bg-marine-50 border-marine-line grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] items-center gap-6 rounded-[12px] border px-[clamp(18px,2.2vw,24px)] py-6">
        <div className="flex flex-col gap-2">
          <span className="text-ember-700 text-[11px] font-medium tracking-[0.13em] uppercase">
            Need a hand?
          </span>
          <span className="text-ink-600 max-w-[320px] text-[12.5px] leading-[1.55] font-normal text-pretty">
            Our team is on the other end of your portal — no phone queues, no
            waiting on email.
          </span>
        </div>
        <Btn as="link" href="/customer/messages" variant="marine">
          <ChatIcon size={15} />
          Message the team
        </Btn>
        <Btn as="link" href="/customer/support">
          <LifebuoyIcon size={15} />
          Visit support
          <ArrowRightIcon size={15} />
        </Btn>
      </div>
    </Screen>
  );
}
