"use client";

import { useMemo, useState } from "react";
import { Plus, Search, MoreHorizontal, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, orderTone } from "@/components/admin/status-badge";
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
import { ORDERS } from "@/lib/mock/admin";
import { gbp } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = ["All", "Open", "Closed", "Cancelled"] as const;
type Tab = (typeof TABS)[number];

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [query, setQuery] = useState("");

  const totals = useMemo(() => {
    const open = ORDERS.filter(
      (o) => o.status === "Open" || o.status === "In Progress"
    ).length;
    const revenue = ORDERS.reduce((s, o) => s + o.price, 0);
    const commission = ORDERS.reduce((s, o) => s + o.commission, 0);
    return { total: ORDERS.length, open, revenue, commission };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ORDERS.filter((o) => {
      const matchesTab =
        tab === "All"
          ? true
          : tab === "Open"
            ? o.status === "Open" || o.status === "In Progress"
            : o.status === tab;
      const matchesQuery =
        !q ||
        [o.id, o.customer, o.from, o.to, o.employee]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchesTab && matchesQuery;
    });
  }, [tab, query]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        subtitle="Track every booking, its commission and assignment."
        actions={
          <Button
            onClick={() =>
              toast.success("New order", {
                description: "UI only — the order form lands here later.",
              })
            }
          >
            <Plus className="size-4" />
            New Order
          </Button>
        }
      />

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
            className={cn(
              "px-5 py-4",
              i > 0 && "sm:border-l sm:border-border"
            )}
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
              <TableHead>Assigned</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="pl-6 font-medium text-navy">{o.id}</TableCell>
                <TableCell>{o.customer}</TableCell>
                <TableCell className="font-medium text-muted-foreground">
                  {o.from} → {o.to}
                </TableCell>
                <TableCell className="text-muted-foreground">{o.date}</TableCell>
                <TableCell className="text-center tabular-nums">{o.pax}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{gbp(o.price)}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600">{gbp(o.commission)}</TableCell>
                <TableCell>
                  <StatusBadge tone={orderTone(o.status)}>{o.status}</StatusBadge>
                </TableCell>
                <TableCell className="text-muted-foreground">{o.employee}</TableCell>
                <TableCell className="pr-6 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground">
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem className="cursor-pointer">
                        <Eye className="size-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  No orders match your filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
