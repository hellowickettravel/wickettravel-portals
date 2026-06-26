"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Download, ChevronRight, Receipt } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { listOrders, listEmployees } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/db/types";
import { fmtDate, titleCase } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const ORDER_TONE: Record<OrderStatus, Tone> = {
  new: "blue",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};

const STATUS_TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const selectClass =
  "h-10 rounded-[10px] border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25";

const ORDERS_KEY = ["admin", "orders"] as const;

/**
 * Transactions — the master record of every order across all customers. Distinct
 * from the sales-focused Orders page: this is a record-keeping lens with employee
 * + date filters and explicit creation/completion dates. Each row opens the same
 * full order-detail view (flight details, pre-order note + the per-order inbox).
 */
export default function TransactionsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | OrderStatus>("all");
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ORDERS_KEY,
    queryFn: listOrders,
  });
  const { data: employees } = useQuery({
    queryKey: ["admin", "employees"],
    queryFn: listEmployees,
  });

  const all = useMemo(() => orders ?? [], [orders]);
  const employeeOptions = useMemo(
    () => (employees ?? []).filter((e) => e.is_active),
    [employees]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((o) => {
      const matchesTab = tab === "all" || o.status === tab;
      const matchesEmployee =
        employeeId === "all" ||
        (employeeId === "unassigned"
          ? !o.assigned_employee_id
          : o.assigned_employee_id === employeeId);
      const created = o.created_at.slice(0, 10);
      const matchesFrom = !from || created >= from;
      const matchesTo = !to || created <= to;
      const matchesQuery =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        (o.customer?.name ?? "").toLowerCase().includes(q);
      return matchesTab && matchesEmployee && matchesFrom && matchesTo && matchesQuery;
    });
  }, [all, tab, employeeId, from, to, query]);

  // Reset paging whenever the filters change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(PAGE_SIZE);
  }, [tab, employeeId, from, to, query]);

  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  function exportCsv() {
    downloadCsv(
      "transactions.csv",
      ["Order", "Customer", "Assigned", "Status", "Created", "Completed"],
      filtered.map((o) => [
        o.order_number,
        o.customer?.name ?? "",
        o.assigned_employee?.full_name ?? "",
        o.status,
        fmtDate(o.created_at),
        o.closed_at ? fmtDate(o.closed_at) : "",
      ])
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Records"
        title="Transactions"
        subtitle="The complete record of every order across all customers."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={all.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                  tab === t.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative lg:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by order # or customer…"
              className="h-10 rounded-[10px] bg-card pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5">
            <Label className="font-label text-[11px] font-medium uppercase tracking-wider text-slate-600">
              Employee
            </Label>
            <select
              aria-label="Filter by assigned employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={cn(selectClass, "w-full sm:w-52")}
            >
              <option value="all">All employees</option>
              <option value="unassigned">Unassigned</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name || e.email || "Employee"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-label text-[11px] font-medium uppercase tracking-wider text-slate-600">
              Created from
            </Label>
            <Input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 w-full rounded-[10px] bg-card sm:w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-label text-[11px] font-medium uppercase tracking-wider text-slate-600">
              Created to
            </Label>
            <Input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-full rounded-[10px] bg-card sm:w-44"
            />
          </div>
          {(from || to || employeeId !== "all") ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setFrom("");
                setTo("");
                setEmployeeId("all");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {/* Record */}
      <SectionCard flush>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} columns={6} />
          </div>
        ) : isError ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Couldn’t load transactions. Refresh to try again.
          </p>
        ) : all.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
              <Receipt className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              No transactions yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Every order placed across the portal will be recorded here.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="space-y-3 p-4 md:hidden">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No transactions match your filters.
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
                          label: "Assigned",
                          value: o.assigned_employee?.full_name ?? "Unassigned",
                          wide: true,
                        },
                        { label: "Created", value: fmtDate(o.created_at) },
                        {
                          label: "Completed",
                          value: o.closed_at ? fmtDate(o.closed_at) : "—",
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
                    <TableHead>Assigned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="pr-6 text-right">Open</TableHead>
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
                      <TableCell className="text-muted-foreground">
                        {o.assigned_employee?.full_name ?? "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={ORDER_TONE[o.status]}>
                          {titleCase(o.status)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(o.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {o.closed_at ? fmtDate(o.closed_at) : "—"}
                      </TableCell>
                      <TableCell
                        className="pr-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
                        >
                          <Eye className="size-4" />
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No transactions match your filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {hasMore ? (
              <div className="flex justify-center border-t border-border p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                >
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
