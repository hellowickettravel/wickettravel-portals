"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Clock,
  Download,
  Plane,
  Plus,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { OrderStatusBadge, orderStatusLabel } from "@/components/admin/status-badge";
import {
  FilterBar,
  FilterBarSpacer,
  FilterChips,
  FilterSearch,
} from "@/components/portal/filter-bar";
import { DataTable, type DataColumn } from "@/components/portal/data-table";
import { LoadMoreFooter } from "@/components/portal/pagination";
import { Button } from "@/components/ui/button";
import { listOrders } from "@/lib/actions/admin";
import type { OrderStatus, OrderWithRelations } from "@/lib/db/types";
import { gbp, fmtDate, num, routeLabel } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";

const PAGE_SIZE = 15;

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

  const { data: orders, isLoading, isError } = useQuery({
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

  // Sort by travel date, soonest first — the order flying next sits at the top
  // so the team always sees the most time-critical bookings first. Orders with
  // no travel date sink to the bottom; newest-created breaks any tie.
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((o) => {
      const matchesTab = tab === "all" ? true : o.status === tab;
      const matchesQuery =
        !q ||
        [
          o.id,
          o.order_number,
          o.customer?.name ?? "",
          o.route_from ?? "",
          o.route_to ?? "",
          o.created_by_profile?.full_name ?? "",
          o.assigned_employee?.full_name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchesTab && matchesQuery;
    });
  }, [all, tab, query]);

  // Reset paging whenever the filters change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(PAGE_SIZE);
  }, [tab, query]);

  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  // Counts on the chips, so the filter row says how much is behind each one.
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: all.length };
    for (const o of all) counts[o.status] = (counts[o.status] ?? 0) + 1;
    return counts;
  }, [all]);

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
        orderStatusLabel(o.status),
        o.selling_price ?? "",
        o.commission ?? "",
        o.created_by_profile?.full_name ?? (o.created_by ? "" : "Customer"),
        o.assigned_employee?.full_name ?? "",
      ])
    );
  }

  const columns: DataColumn<OrderWithRelations>[] = [
    {
      key: "order",
      header: "Order",
      mobile: "title",
      // A reference, not prose.
      cell: (o) => (
        <span className="font-mono text-[13.5px] font-medium text-tx-head">
          {o.order_number}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      mobile: "subtitle",
      cell: (o) => o.customer?.name ?? "—",
    },
    {
      key: "route",
      header: "Route",
      wide: true,
      cell: (o) => (
        <span className="text-tx-muted">{routeLabel(o.route_from, o.route_to)}</span>
      ),
    },
    {
      key: "travel",
      header: "Travel date",
      numeric: true,
      cell: (o) => fmtDate(o.travel_date),
    },
    {
      key: "pax",
      header: "Pax",
      numeric: true,
      cell: (o) => o.passengers ?? "—",
    },
    {
      key: "price",
      header: "Price",
      numeric: true,
      cell: (o) =>
        o.selling_price != null ? (
          <span className="font-semibold text-tx-head">{gbp(o.selling_price)}</span>
        ) : (
          <span className="text-tx-faint">—</span>
        ),
    },
    {
      key: "commission",
      header: "Commission",
      numeric: true,
      // Gold is the money hue; it also keeps the two money columns apart.
      // An unpriced order gets a faint dash, not an gold one — the hue is for
      // a figure, and there isn't one.
      cell: (o) =>
        o.commission != null ? (
          <span className="text-gold">{gbp(o.commission)}</span>
        ) : (
          <span className="text-tx-faint">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      mobile: "badge",
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: "created_by",
      header: "Created by",
      // Ten columns don't fit a 1180px measure. This is the one worth dropping
      // first — it only ever says "Customer" or a colleague's name, it is still
      // in the mobile card, and the record itself is one click away. It comes
      // back on a genuinely wide screen.
      className: "hidden 2xl:table-cell",
      cell: (o) => (
        <span className="text-tx-muted">
          {o.created_by_profile?.full_name ?? (o.created_by ? "—" : "Customer")}
        </span>
      ),
    },
    {
      key: "assigned",
      header: "Assigned",
      cell: (o) => (
        <span className="text-tx-muted">
          {o.assigned_employee?.full_name ?? "Unassigned"}
        </span>
      ),
    },
  ];

  const noOrdersAtAll = all.length === 0;

  return (
    <div className="space-y-18">
      <div className="space-y-8">
        <PageHeader
          eyebrow={`${num(totals.active)} active · ${num(totals.total)} all time`}
          title="Orders"
          subtitle="Every booking, its commission and who is looking after it. Sorted by the flight that leaves next."
          actions={
            <>
              <Button variant="secondary" onClick={exportCsv} disabled={noOrdersAtAll}>
                <Download />
                Export CSV
              </Button>
              <Button render={<Link href="/admin/orders/new" />}>
                <Plus />
                New order
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            tone="ocean"
            icon={Plane}
            label="Total orders"
            value={num(totals.total)}
            hint="all time"
          />
          <StatCard
            tone="violet"
            icon={Clock}
            label="Active"
            value={num(totals.active)}
            hint="new and in progress"
          />
          {/* Both of these are money, so both are gold. The hue reports what
              the number is, not which card it sits in. */}
          <StatCard
            tone="gold"
            icon={Wallet}
            label="Revenue"
            value={gbp(totals.revenue)}
            hint="completed orders"
          />
          <StatCard
            tone="gold"
            icon={ClipboardList}
            label="Commission"
            value={gbp(totals.commission)}
            hint="completed orders"
          />
        </div>
      </div>

      <section className="space-y-5">
        <FilterBar>
          <FilterChips
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
            options={TABS.map((t) => ({
              value: t.value,
              label: t.label,
              count: tabCounts[t.value] ?? 0,
            }))}
          />
          <FilterBarSpacer />
          <FilterSearch
            value={query}
            onValueChange={setQuery}
            placeholder="Search orders, customers, routes…"
            aria-label="Search orders"
          />
        </FilterBar>

        <DataTable
          columns={columns}
          rows={visible}
          getRowKey={(o) => o.id}
          rowHref={(o) => `/admin/orders/${o.id}`}
          caption="Orders, soonest departure first"
          unit="orders"
          loading={isLoading}
          error={isError}
          empty={
            noOrdersAtAll
              ? {
                  title: "No orders yet",
                  description: "Orders created by your team appear here.",
                  action: (
                    <Button render={<Link href="/admin/orders/new" />}>
                      <Plus />
                      New order
                    </Button>
                  ),
                }
              : {
                  title: "Nothing matches those filters",
                  description:
                    "Try a different status, or clear the search to see every order.",
                }
          }
          footer={
            hasMore ? (
              <LoadMoreFooter
                remaining={filtered.length - visible.length}
                step={PAGE_SIZE}
                unit="orders"
                onLoadMore={() => setLimit((l) => l + PAGE_SIZE)}
              />
            ) : null
          }
        />
      </section>
    </div>
  );
}
