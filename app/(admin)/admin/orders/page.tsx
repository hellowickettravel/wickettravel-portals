"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Download,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/portal/skeletons";
import { MobileRecordCard } from "@/components/portal/mobile-record-card";
import { listOrders } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/db/types";
import { gbp, fmtDate, titleCase } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

const ORDER_TONE: Record<OrderStatus, Tone> = {
  new: "blue",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};

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
  const router = useRouter();
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

  // Realtime: new/updated orders refresh the list instantly. The server already
  // returns rows newest-first, so a new order lands at the top automatically.
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

  const all = useMemo(() => orders ?? [], [orders]);
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
    <div className="space-y-7">
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        subtitle="Track every booking, its commission and who created it."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={all.length === 0}>
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button render={<Link href="/admin/orders/new" />}>
              <Plus className="size-4" />
              New Order
            </Button>
          </>
        }
      />

      {/* Totals strip */}
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-1 shadow-card sm:grid-cols-4">
        {[
          { label: "Total orders", value: String(totals.total) },
          { label: "Active", value: String(totals.active) },
          { label: "Revenue (completed)", value: gbp(totals.revenue) },
          { label: "Commission (completed)", value: gbp(totals.commission) },
        ].map((t, i) => (
          <div
            key={t.label}
            className={cn("px-5 py-4", i > 0 && "sm:border-l sm:border-border")}
          >
            <p className="font-label text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t.label}
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">
              {t.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === t.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, customers, routes…"
            className="h-10 rounded-[10px] bg-card pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <SectionCard flush>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={7} />
          </div>
        ) : isError ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Couldn’t load orders. Refresh to try again.
          </p>
        ) : all.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
              <Plus className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              No orders yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Orders created by your team will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards (no horizontal scroll) */}
            <div className="space-y-3 p-4 md:hidden">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No orders match your filters.
                </p>
              ) : (
                visible.map((o) => (
                  <Link key={o.id} href={`/admin/orders/${o.id}`} className="block">
                    <MobileRecordCard
                      title={<span className="text-navy">{o.order_number}</span>}
                      subtitle={o.customer?.name ?? "—"}
                      action={
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-brand">
                          View
                          <ChevronRight className="size-4" />
                        </span>
                      }
                      badge={
                        <StatusBadge tone={ORDER_TONE[o.status]}>
                          {titleCase(o.status)}
                        </StatusBadge>
                      }
                      fields={[
                        {
                          label: "Route",
                          value: `${o.route_from ?? "—"} → ${o.route_to ?? "—"}`,
                          wide: true,
                        },
                        { label: "Travel date", value: fmtDate(o.travel_date) },
                        { label: "Pax", value: o.passengers ?? "—" },
                        {
                          label: "Price",
                          value: o.selling_price != null ? gbp(o.selling_price) : "—",
                        },
                        {
                          label: "Commission",
                          value: (
                            <span className="text-emerald-600">
                              {o.commission != null ? gbp(o.commission) : "—"}
                            </span>
                          ),
                        },
                        {
                          label: "Assigned",
                          value: o.assigned_employee?.full_name ?? "Unassigned",
                          wide: true,
                        },
                      ]}
                    />
                  </Link>
                ))
              )}
            </div>

            {/* Desktop: full table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Requested Data</TableHead>
                    <TableHead>Travel date</TableHead>
                    <TableHead className="text-center">Pax</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created by</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/orders/${o.id}`)}
                >
                  <TableCell className="pl-6 font-medium text-navy">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="hover:text-brand"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {o.order_number}
                    </Link>
                  </TableCell>
                  <TableCell>{o.customer?.name ?? "—"}</TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {o.route_from ?? "—"} → {o.route_to ?? "—"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
                      title="View the details the customer submitted with this order"
                    >
                      <ClipboardList className="size-3.5" />
                      Requested data
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtDate(o.travel_date)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {o.passengers ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {o.selling_price != null ? gbp(o.selling_price) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">
                    {o.commission != null ? gbp(o.commission) : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={ORDER_TONE[o.status]}>
                      {titleCase(o.status)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.created_by_profile?.full_name ??
                      (o.created_by ? "—" : "Customer")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.assigned_employee?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Actions for order ${o.id.slice(0, 8)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-brand/25"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => router.push(`/admin/orders/${o.id}`)}
                        >
                          <Eye className="size-4" />
                          View
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No orders match your filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {hasMore ? (
              <div className="flex justify-center border-t border-border p-4">
                <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  Load more ({filtered.length - visible.length} more)
                </Button>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </div>
  );
}
