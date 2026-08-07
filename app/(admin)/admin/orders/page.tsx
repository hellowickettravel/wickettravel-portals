"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { listOrders } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/db/types";
import { gbp, fmtDate, titleCase } from "@/lib/format";
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
  ExportIcon,
  OrdersIcon,
  PercentIcon,
  PlusIcon,
  PoundIcon,
  ClockIcon,
} from "@/components/admin/icons";

const PAGE_SIZE = 10;

const TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];
type Tab = (typeof TABS)[number]["value"];

const ORDERS_KEY = ["admin", "orders"] as const;

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

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

  // Sorted by the flight that departs next — the design's own rule. Orders with
  // no travel date fall to the bottom; newest-created breaks any tie.
  const all = useMemo(() => {
    const rows = orders ?? [];
    return [...rows].sort((a, b) => {
      const at = a.travel_date;
      const bt = b.travel_date;
      if (at && bt) {
        if (at !== bt) return at < bt ? -1 : 1;
      } else if (at) {
        return -1;
      } else if (bt) {
        return 1;
      }
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
  }, [orders]);
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
        intro="Sorted by the flight that departs next. Orders without a travel date fall to the bottom."
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

      <KpiGrid>
        <Kpi
          label="Total orders"
          value={totals.total}
          meta="All time"
          tone="marine"
          icon={<OrdersIcon size={18} />}
        />
        <Kpi
          label="Active orders"
          value={totals.active}
          meta="New and In progress"
          tone="warn"
          icon={<ClockIcon size={18} />}
        />
        <Kpi
          label="Revenue"
          value={gbp(totals.revenue)}
          meta="Completed orders only"
          tone="teal"
          icon={<PoundIcon size={18} />}
        />
        <Kpi
          label="Commission"
          value={gbp(totals.commission)}
          meta="Earned on completed orders"
          tone="ok"
          valueClass="text-ok-ink"
          icon={<PercentIcon size={18} />}
        />
      </KpiGrid>

      <Card>
        <div className="border-line-soft flex flex-wrap items-center gap-3 border-b px-5 py-4">
          <div className="relative flex min-w-0 flex-[1_1_260px]">
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
            <Table min={1000}>
              <Thead>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Route</Th>
                <Th>Travel date</Th>
                <Th align="right">Pax</Th>
                <Th align="right">Selling price</Th>
                <Th>Status</Th>
                <Th>Assigned</Th>
                <Th align="right" />
              </Thead>
              <tbody>
                {visible.map((o) => (
                  <Tr key={o.id}>
                    <Td className="text-marine-600 text-[12.5px] font-medium tabular-nums">
                      <Link href={`/admin/orders/${o.id}`}>
                        {o.order_number}
                      </Link>
                    </Td>
                    <Td className="text-ink-800 font-medium">
                      {o.customer?.name ?? "—"}
                    </Td>
                    <Td>
                      {o.route_from ?? "—"} → {o.route_to ?? "—"}
                    </Td>
                    <Td
                      className={cn(
                        "text-[12.5px]",
                        o.travel_date ? "text-ink-700" : "text-ink-450"
                      )}
                    >
                      {o.travel_date ? fmtDate(o.travel_date) : "No date yet"}
                    </Td>
                    <Td align="right" className="text-[12.5px] tabular-nums">
                      {o.passengers ?? "—"}
                    </Td>
                    <Td align="right" className="font-medium tabular-nums">
                      {o.selling_price != null ? gbp(o.selling_price) : "—"}
                    </Td>
                    <Td>
                      <Pill>{titleCase(o.status)}</Pill>
                    </Td>
                    <Td
                      className={cn(
                        "text-[12.5px]",
                        o.assigned_employee?.full_name
                          ? "text-ink-700"
                          : "text-ink-450"
                      )}
                    >
                      {o.assigned_employee?.full_name ?? "Unassigned"}
                    </Td>
                    <Td align="right">
                      <ViewButton href={`/admin/orders/${o.id}`} />
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
                <Btn onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                  Load {PAGE_SIZE} more — {filtered.length - limit} remaining
                </Btn>
              ) : null
            }
          />
        ) : null}
      </Card>
    </Screen>
  );
}
