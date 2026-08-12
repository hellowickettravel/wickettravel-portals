"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { listMyCustomerOrders } from "@/lib/actions/customer";
import { CUSTOMER_ORDERS_KEY } from "@/lib/query-keys";
import { paxSummary } from "@/lib/orders/display";
import type { OrderStatus } from "@/lib/db/types";
import { gbp, fmtDate, routeLabel, customerStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Btn,
  Card,
  EmptyState,
  Kpi,
  KpiGrid,
  PageHead,
  Pill,
  Screen,
  Table,
  TableFoot,
  TableScroll,
  TableSkeleton,
  Td,
  Th,
  Thead,
  Tr,
  ViewButton,
  inputInsetClass,
  type PillTone,
} from "@/components/admin/ui";
import { LoadMore } from "@/components/admin/load-more";
import {
  CheckCircleIcon,
  ClockIcon,
  OrdersIcon,
  PlaneIcon,
  PoundIcon,
} from "@/components/admin/icons";

const PAGE_SIZE = 10;

const PILL_TONE: Record<OrderStatus, PillTone> = {
  new: "marine",
  in_progress: "warn",
  completed: "ok",
  cancelled: "ink",
};

const TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All", value: "all" },
  { label: "Received", value: "new" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];
type Tab = (typeof TABS)[number]["value"];

/**
 * Every quote and booking the traveller has with us, on the design's own list
 * screen. RLS scopes the read to their own orders, and a realtime subscription
 * on `orders` means a fare the team adds appears here without a refresh.
 *
 * Deliberately narrower than the staff pipeline: no customer column (there is
 * only one), and no cost or commission — those figures are the business's, not
 * the buyer's.
 */
export function CustomerOrders({ todayIso }: { todayIso: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: CUSTOMER_ORDERS_KEY,
    queryFn: listMyCustomerOrders,
  });

  useEffect(() => {
    const channel = supabase
      .channel("customer-orders-list")
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

  const [tab, setTab] = useState<Tab>("all");

  // The top bar hands this screen its term as ?q=; it seeds the in-card box.
  const topSearch = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(topSearch);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(topSearch);
  }, [topSearch]);

  // "Departs next": upcoming flights first, then the ones already flown, then
  // orders with no travel date — the same rule the staff pipelines use.
  const all = useMemo(() => {
    const rows = orders ?? [];
    const today = todayIso.slice(0, 10);
    const rank = (d: string | null) => (!d ? 2 : d >= today ? 0 : 1);
    return [...rows].sort((a, b) => {
      const ra = rank(a.travel_date);
      const rb = rank(b.travel_date);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return (a.travel_date ?? "").localeCompare(b.travel_date ?? "");
      if (ra === 1) return (b.travel_date ?? "").localeCompare(a.travel_date ?? "");
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
  }, [orders, todayIso]);

  const [limit, setLimit] = useState(PAGE_SIZE);

  const totals = useMemo(() => {
    const open = all.filter(
      (o) => o.status === "new" || o.status === "in_progress"
    );
    const completed = all.filter((o) => o.status === "completed");
    return {
      total: all.length,
      open: open.length,
      awaiting: open.filter((o) => o.selling_price == null).length,
      completed: completed.length,
      spent: completed.reduce((s, o) => s + (o.selling_price ?? 0), 0),
    };
  }, [all]);

  const matchesQuery = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (o: (typeof all)[number]) =>
      !q ||
      [
        o.order_number,
        o.route_from ?? "",
        o.route_to ?? "",
        o.airline ?? "",
        o.status,
        o.travel_date ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
  }, [query]);

  const counts = useMemo(() => {
    const searched = all.filter(matchesQuery);
    return {
      all: searched.length,
      new: searched.filter((o) => o.status === "new").length,
      in_progress: searched.filter((o) => o.status === "in_progress").length,
      completed: searched.filter((o) => o.status === "completed").length,
      cancelled: searched.filter((o) => o.status === "cancelled").length,
    } as Record<Tab, number>;
  }, [all, matchesQuery]);

  const filtered = useMemo(
    () =>
      all.filter((o) => (tab === "all" || o.status === tab) && matchesQuery(o)),
    [all, tab, matchesQuery]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(PAGE_SIZE);
  }, [tab, query]);

  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  return (
    <Screen width={1240}>
      <PageHead
        title="My orders"
        intro="Every quote and booking you've made with us, sorted by the flight that departs next."
        actions={
          <Btn as="link" href="/customer/book" variant="ember">
            <PlaneIcon size={15} />
            Book a flight
          </Btn>
        }
      />

      <KpiGrid>
        <Kpi
          label="All orders"
          value={totals.total}
          meta="Everything you've asked us for"
          tone="marine"
          icon={<OrdersIcon size={18} />}
        />
        <Kpi
          label="Active"
          value={totals.open}
          meta={
            totals.awaiting > 0
              ? `${totals.awaiting} still waiting on a fare`
              : "All quoted"
          }
          tone="warn"
          icon={<ClockIcon size={18} />}
        />
        <Kpi
          label="Completed"
          value={totals.completed}
          meta="Booked and ticketed"
          tone="ok"
          icon={<CheckCircleIcon size={18} />}
        />
        <Kpi
          label="Total spent"
          value={gbp(totals.spent)}
          meta="Across every completed booking"
          tone="ink"
          icon={<PoundIcon size={18} />}
        />
      </KpiGrid>

      <Card>
        <div className="border-line-soft flex flex-wrap items-center gap-3 border-b px-5 py-4">
          <div className="relative flex min-w-0 flex-[1_1_260px]">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order number, route or airline"
              aria-label="Search my orders"
              className={inputInsetClass}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {/* FilterChip is href-driven; this screen filters in place, so the
                same 34px chip is rendered as a button. */}
            {TABS.map((t) => {
              const active = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex h-[34px] items-center gap-2 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap outline-none",
                    active
                      ? "border-ink-800 bg-ink-800 text-white"
                      : "border-line-field text-ink-800 hover:bg-surface-1 bg-white"
                  )}
                >
                  {t.label}
                  <span className="text-[11px] font-medium tabular-nums opacity-[0.66]">
                    {counts[t.value]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load your orders"
            body="Something went wrong reading the list. Refresh the page to try again."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              all.length === 0 ? "No orders yet" : "No orders match these filters"
            }
            body={
              all.length === 0
                ? "Tell us where you want to go and our team will come back with a fare. Every quote and booking then lives here."
                : "Clear the status filter or try a different order number, route or airline."
            }
            action={
              all.length === 0 ? (
                <Btn as="link" href="/customer/book" variant="ember">
                  <PlaneIcon size={15} />
                  Book a flight
                </Btn>
              ) : (
                <Btn
                  onClick={() => {
                    setTab("all");
                    setQuery("");
                  }}
                >
                  Clear all filters
                </Btn>
              )
            }
          />
        ) : (
          <TableScroll>
            <Table min={880}>
              <Thead>
                <Th>Order</Th>
                <Th>Route</Th>
                <Th>Departs</Th>
                <Th>Returns</Th>
                <Th align="right">Travellers</Th>
                <Th align="right">Total price</Th>
                <Th>Status</Th>
                <Th align="right" />
              </Thead>
              <tbody>
                {visible.map((o) => (
                  <Tr
                    key={o.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/customer/orders/${o.id}`)}
                  >
                    <Td className="text-marine-600 text-[12.5px] font-medium tabular-nums">
                      <Link
                        href={`/customer/orders/${o.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {o.order_number}
                      </Link>
                    </Td>
                    <Td className="text-ink-800 font-medium">
                      {routeLabel(o.route_from, o.route_to)}
                    </Td>
                    <Td
                      className={cn(
                        "text-[12.5px]",
                        o.travel_date ? "text-ink-800" : "text-ink-500"
                      )}
                    >
                      {o.travel_date ? fmtDate(o.travel_date) : "To confirm"}
                    </Td>
                    <Td className="text-ink-600 text-[12.5px]">
                      {o.return_date ? fmtDate(o.return_date) : "—"}
                    </Td>
                    <Td align="right" className="text-[12.5px] tabular-nums">
                      {paxSummary(o.adults, o.children, o.passengers)}
                    </Td>
                    <Td
                      align="right"
                      className={cn(
                        "font-medium tabular-nums",
                        o.selling_price == null && "text-ink-500 font-normal"
                      )}
                    >
                      {o.selling_price != null
                        ? gbp(o.selling_price)
                        : "Awaiting quote"}
                    </Td>
                    <Td>
                      <Pill tone={PILL_TONE[o.status]}>
                        {customerStatusLabel(o.status)}
                      </Pill>
                    </Td>
                    <Td align="right" onClick={(e) => e.stopPropagation()}>
                      <ViewButton href={`/customer/orders/${o.id}`} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}

        {visible.length > 0 ? (
          <TableFoot
            shown={visible.length}
            total={filtered.length}
            noun="orders"
            action={
              hasMore ? (
                <LoadMore
                  remaining={filtered.length - limit}
                  pageSize={PAGE_SIZE}
                  noun="orders"
                  onLoad={() => setLimit((n) => n + PAGE_SIZE)}
                />
              ) : null
            }
          />
        ) : null}
      </Card>
    </Screen>
  );
}
