"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Eye } from "lucide-react";
import { toast } from "sonner";
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
import { AdminCreateOrderDialog } from "@/components/admin/create-order-dialog";
import { listOrders } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/db/types";
import { gbp, fmtDate, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  open: "blue",
  closed: "green",
  cancelled: "red",
};

const TABS = ["All", "Open", "Closed", "Cancelled"] as const;
type Tab = (typeof TABS)[number];

const ORDERS_KEY = ["admin", "orders"] as const;

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ORDERS_KEY,
    queryFn: listOrders,
  });

  const all = orders ?? [];

  const totals = useMemo(() => {
    const open = all.filter((o) => o.status === "open").length;
    const revenue = all.reduce((s, o) => s + (o.selling_price ?? 0), 0);
    const commission = all.reduce((s, o) => s + (o.commission ?? 0), 0);
    return { total: all.length, open, revenue, commission };
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((o) => {
      const matchesTab =
        tab === "All" ? true : o.status === (tab.toLowerCase() as OrderStatus);
      const matchesQuery =
        !q ||
        [
          o.id,
          o.customer?.name ?? "",
          o.route_from ?? "",
          o.route_to ?? "",
          o.created_by_profile?.full_name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchesTab && matchesQuery;
    });
  }, [all, tab, query]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        subtitle="Track every booking, its commission and who created it."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New Order
          </Button>
        }
      />

      <AdminCreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Totals strip */}
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-1 shadow-card sm:grid-cols-4">
        {[
          { label: "Total orders", value: String(totals.total) },
          { label: "Open", value: String(totals.open) },
          { label: "Revenue", value: gbp(totals.revenue) },
          { label: "Commission", value: gbp(totals.commission) },
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
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === t
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
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
                filtered.map((o) => (
                  <MobileRecordCard
                    key={o.id}
                    title={<span className="text-navy">#{o.id.slice(0, 8)}</span>}
                    subtitle={o.customer?.name ?? "—"}
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
                        label: "Created by",
                        value: o.created_by_profile?.full_name ?? "—",
                        wide: true,
                      },
                    ]}
                  />
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
                    <TableHead>Travel date</TableHead>
                    <TableHead className="text-center">Pax</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created by</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="pl-6 font-medium text-navy">
                    #{o.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>{o.customer?.name ?? "—"}</TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {o.route_from ?? "—"} → {o.route_to ?? "—"}
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
                    {o.created_by_profile?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Actions for order ${o.id.slice(0, 8)}`}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-brand/25"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() =>
                            toast.info("Order detail", {
                              description: "Detailed order view is coming next.",
                            })
                          }
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
                        colSpan={10}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No orders match your filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
