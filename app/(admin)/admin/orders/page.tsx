"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { deleteOrder, listOrders } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/db/types";
import { gbp, fmtDate, fmtStamp, routeLabel, statusLabel } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
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
} from "@/components/admin/ui";
import {
  LoadMore,
  arrivedInLastPage,
} from "@/components/admin/load-more";
import {
  ExportIcon,
  OrdersIcon,
  PercentIcon,
  PlusIcon,
  PoundIcon,
  ClockIcon,
} from "@/components/admin/icons";
import { DeleteRowButton } from "@/components/admin/delete-row";

const PAGE_SIZE = 10;

const TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];
type Tab = (typeof TABS)[number]["value"];

/**
 * Row order. Deliberately a separate axis from the status chips above rather
 * than a sixth chip alongside them: the chips decide WHICH rows are shown and
 * are mutually exclusive, so folding a sort into that group would make
 * "New" and "newest first" impossible to hold at the same time. Kept apart,
 * every status can be read in either order.
 */
type SortKey = "departing" | "created";

const SORTS: { label: string; value: SortKey; intro: string }[] = [
  {
    label: "Departing next",
    value: "departing",
    intro:
      "Sorted by the flight that departs next. Orders without a travel date fall to the bottom.",
  },
  {
    label: "Created date",
    value: "created",
    intro:
      "Sorted by when the order was placed — the most recent first, then the one before it, and so on.",
  },
];

const ORDERS_KEY = ["admin", "orders"] as const;

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<SortKey>("departing");

  // The top bar's search hands this screen its term as ?q= (see SEARCH in
  // admin-shell). It seeds the in-card box and re-syncs whenever the top bar
  // submits again, since that is a soft navigation and never remounts us.
  const topSearch = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(topSearch);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(topSearch);
  }, [topSearch]);

  const {
    data: orders,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ORDERS_KEY,
    queryFn: listOrders,
    // Safety net so the list is never more than a minute stale if realtime drops.
    refetchInterval: 60_000,
  });

  // Realtime: new/updated orders refresh the list instantly. Rows are re-sorted
  // by travel date below, so ordering stays correct as new orders arrive.
  // Admin RLS scopes the stream to every order.
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  // Two orderings, chosen by the sort control in the card header.
  //
  // "departing" is the design's own rule: the *soonest upcoming* departure,
  // not the oldest date on file. Flights that have already gone sit below the
  // upcoming ones (most recent first), and orders with no travel date fall to
  // the bottom of all.
  //
  // "created" is newest-placed first. `created_at` is a non-null timestamptz
  // and Postgres hands it back in ISO 8601, where lexical order *is*
  // chronological order — so this compares strings and never parses a Date.
  const all = useMemo(() => {
    const rows = orders ?? [];

    if (sort === "created") {
      return [...rows].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const rank = (d: string | null) => (!d ? 2 : d >= today ? 0 : 1);
    return [...rows].sort((a, b) => {
      const ra = rank(a.travel_date);
      const rb = rank(b.travel_date);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return a.travel_date! < b.travel_date! ? -1 : a.travel_date! > b.travel_date! ? 1 : 0;
      if (ra === 1) return a.travel_date! > b.travel_date! ? -1 : a.travel_date! < b.travel_date! ? 1 : 0;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
  }, [orders, sort]);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const totals = useMemo(() => {
    const active = all.filter(
      (o) => o.status === "new" || o.status === "in_progress"
    ).length;
    // Earned revenue + commission = COMPLETED orders only. Active is pipeline
    // (not yet earned); cancelled never earns.
    const completed = all.filter((o) => o.status === "completed");
    const revenue = completed.reduce((s, o) => s + (o.selling_price ?? 0), 0);
    const commission = completed.reduce((s, o) => s + (o.commission ?? 0), 0);
    return { total: all.length, active, revenue, commission };
  }, [all]);

  /** Search runs across the eight fields the design names in its placeholder. */
  const matchesQuery = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (o: (typeof all)[number]) =>
      !q ||
      [
        o.order_number,
        o.customer?.name ?? "",
        o.route_from ?? "",
        o.route_to ?? "",
        o.created_by_profile?.full_name ?? "",
        o.assigned_employee?.full_name ?? "",
        o.status,
        o.travel_date ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
  }, [query]);

  // Chip counts respect the search but not the status filter, so switching
  // status never hides how much is behind the other chips.
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

  // Reset paging whenever the filters change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(PAGE_SIZE);
  }, [tab, query]);

  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  const activeSort = SORTS.find((s) => s.value === sort) ?? SORTS[0];
  // The created stamp only earns a column when it is the thing being sorted
  // on — otherwise the pipeline is ordered by a date you cannot see, and you
  // have no way to check the order is what you asked for.
  const showCreated = sort === "created";

  function exportCsv() {
    downloadCsv(
      "orders.csv",
      [
        "Order",
        "Customer",
        "From",
        "To",
        "Travel date",
        "Passengers",
        "Status",
        "Selling price",
        "Commission",
        "Created by",
        "Assigned",
      ],
      filtered.map((o) => [
        o.order_number,
        o.customer?.name ?? "",
        o.route_from ?? "",
        o.route_to ?? "",
        fmtDate(o.travel_date),
        o.passengers ?? "",
        o.status,
        o.selling_price ?? "",
        o.commission ?? "",
        o.created_by_profile?.full_name ?? (o.created_by ? "" : "Customer"),
        o.assigned_employee?.full_name ?? "",
      ])
    );
  }

  return (
    <Screen>
      <PageHead
        title="Order pipeline"
        intro={activeSort.intro}
        actions={
          <>
            <Btn onClick={exportCsv} disabled={all.length === 0}>
              <ExportIcon size={15} />
              Export CSV
            </Btn>
            <Btn as="link" href="/admin/orders/new" variant="ember">
              <PlusIcon size={15} />
              New order
            </Btn>
          </>
        }
      />

      {/* Compact: on this screen the figures are context, the pipeline is the
          work. Full-size tiles pushed the first table row near the fold. */}
      <KpiGrid compact>
        <Kpi
          compact
          label="Total orders"
          value={totals.total}
          meta="All time"
          tone="marine"
          icon={<OrdersIcon size={16} />}
        />
        <Kpi
          compact
          label="Active orders"
          value={totals.active}
          meta="New and In progress"
          tone="warn"
          icon={<ClockIcon size={16} />}
        />
        <Kpi
          compact
          label="Revenue"
          value={gbp(totals.revenue)}
          meta="Completed orders only"
          tone="teal"
          icon={<PoundIcon size={16} />}
        />
        <Kpi
          compact
          label="Commission"
          value={gbp(totals.commission)}
          meta="Earned on completed"
          tone="ok"
          valueClass="text-ok-ink"
          icon={<PercentIcon size={16} />}
        />
      </KpiGrid>

      <Card>
        <div className="border-line-soft flex flex-wrap items-center gap-3 border-b px-5 py-4">
          <div className="relative flex min-w-0 flex-[1_1_240px] sm:max-w-[340px]">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search orders"
              placeholder="Order number, customer, route, creator or assignee"
              className={`${inputInsetClass} focus:border-marine-500 focus:shadow-[0_0_0_3px_var(--color-marine-200)]`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
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

          {/* Its own group, its own tint: the status chips above are black
              when on, so a marine segmented pair reads as a different kind
              of control rather than a sixth status. */}
          <div className="ml-auto flex items-center gap-2">
            <span
              id="orders-sort-label"
              className="text-ink-500 text-[10.5px] font-medium tracking-[0.09em] uppercase"
            >
              Sort
            </span>
            <div
              role="group"
              aria-labelledby="orders-sort-label"
              className="border-line-field flex items-center gap-1 rounded-full border bg-white p-[3px]"
            >
              {SORTS.map((s) => {
                const active = sort === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSort(s.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-[26px] items-center rounded-full px-3 text-[12px] font-medium whitespace-nowrap outline-none",
                      active
                        ? "bg-marine-tint text-marine-600"
                        : "text-ink-600 hover:text-ink-800"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : isError ? (
          <EmptyState
            title="Orders could not be loaded"
            body="The connection dropped while fetching the pipeline. Refresh the page to try again."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No orders match these filters"
            body="Widen the travel-date range or clear the status filter. Orders placed on the website appear here within a minute of submission."
            action={
              <Btn
                onClick={() => {
                  setTab("all");
                  setQuery("");
                }}
              >
                Clear all filters
              </Btn>
            }
          />
        ) : (
          <TableScroll>
            <Table min={showCreated ? 1120 : 1000}>
              <Thead>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Route</Th>
                <Th>Travel date</Th>
                {showCreated ? <Th>Created</Th> : null}
                <Th align="right">Pax</Th>
                <Th align="right">Selling price</Th>
                <Th>Status</Th>
                <Th>Assigned</Th>
                <Th align="right" />
              </Thead>
              <tbody>
                {visible.map((o, i) => (
                  <Tr
                    key={o.id}
                    /* Rows added by the last "Load more" animate in; the ones
                       already on screen don't move, so the eye is told exactly
                       what changed. */
                    className={
                      arrivedInLastPage(i, limit, PAGE_SIZE)
                        ? "wt-row-enter"
                        : undefined
                    }
                  >
                    <Td className="text-marine-600 text-[12.5px] font-medium tabular-nums">
                      <Link href={`/admin/orders/${o.id}`}>
                        {o.order_number}
                      </Link>
                    </Td>
                    <Td className="text-ink-800 font-medium">
                      {o.customer?.name ?? "—"}
                    </Td>
                    <Td>
                      {routeLabel(o.route_from, o.route_to)}
                    </Td>
                    <Td
                      className={cn(
                        "text-[12.5px]",
                        o.travel_date ? "text-ink-800" : "text-ink-500"
                      )}
                    >
                      {o.travel_date ? fmtDate(o.travel_date) : "No travel date"}
                    </Td>
                    {showCreated ? (
                      /* fmtStamp, not fmtDate: today's orders want a clock so
                         a run placed this morning is still readable in order. */
                      <Td className="text-ink-600 text-[12.5px] whitespace-nowrap">
                        {fmtStamp(o.created_at)}
                      </Td>
                    ) : null}
                    <Td align="right" className="text-[12.5px] tabular-nums">
                      {o.passengers ?? "—"}
                    </Td>
                    <Td align="right" className="font-medium tabular-nums">
                      {o.selling_price != null ? gbp(o.selling_price) : "—"}
                    </Td>
                    <Td>
                      <Pill>{statusLabel(o.status)}</Pill>
                    </Td>
                    <Td
                      className={cn(
                        "text-[12.5px]",
                        o.assigned_employee?.full_name
                          ? "text-ink-600"
                          : "text-ink-450"
                      )}
                    >
                      {/* The design writes an unassigned row as an em dash in
                          the placeholder ink, not the word "Unassigned". */}
                      {o.assigned_employee?.full_name ?? "—"}
                    </Td>
                    <Td align="right">
                      <span className="inline-flex items-center gap-2">
                        <DeleteRowButton
                          what="order"
                          name={o.order_number}
                          body={`This permanently removes order ${o.order_number} with its messages and attachments. This can't be undone.`}
                          action={() => deleteOrder(o.id)}
                          onDeleted={() => queryClient.invalidateQueries({ queryKey: ORDERS_KEY })}
                          disabledReason={
                            o.status === "completed"
                              ? "Completed orders are kept for your revenue history and can't be deleted."
                              : undefined
                          }
                        />
                        <ViewButton href={`/admin/orders/${o.id}`} />
                      </span>
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
                /* The design's table footer runs its 40px button at 12.5px,
                   a half-step below the standard 13px control label. */
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
