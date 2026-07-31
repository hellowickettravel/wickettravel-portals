"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Receipt } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge, orderStatusLabel } from "@/components/admin/status-badge";
import {
  FilterBar,
  FilterBarSpacer,
  FilterChips,
  FilterDate,
  FilterSearch,
  FilterSelect,
} from "@/components/portal/filter-bar";
import { DataTable, type DataColumn } from "@/components/portal/data-table";
import { LoadMoreFooter } from "@/components/portal/pagination";
import { Button } from "@/components/ui/button";
import { listOrders, listEmployees } from "@/lib/actions/admin";
import type { OrderStatus, OrderWithRelations } from "@/lib/db/types";
import { fmtDate, num } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";

const PAGE_SIZE = 20;

const STATUS_TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const ORDERS_KEY = ["admin", "orders"] as const;

/**
 * Transactions — the master record of every order across all customers. Distinct
 * from the sales-focused Orders page: this is a record-keeping lens with employee
 * + date filters and explicit creation/completion dates. Each row opens the same
 * full order-detail view (flight details, pre-order note + the per-order inbox).
 */
export default function TransactionsPage() {
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
  const narrowed = Boolean(from || to || employeeId !== "all");

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: all.length };
    for (const o of all) counts[o.status] = (counts[o.status] ?? 0) + 1;
    return counts;
  }, [all]);

  function exportCsv() {
    downloadCsv(
      "transactions.csv",
      ["Order", "Customer", "Assigned", "Status", "Created", "Completed"],
      filtered.map((o) => [
        o.order_number,
        o.customer?.name ?? "",
        o.assigned_employee?.full_name ?? "",
        orderStatusLabel(o.status),
        fmtDate(o.created_at),
        o.closed_at ? fmtDate(o.closed_at) : "",
      ])
    );
  }

  const columns: DataColumn<OrderWithRelations>[] = [
    {
      key: "order",
      header: "Order",
      mobile: "title",
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
      key: "assigned",
      header: "Assigned",
      wide: true,
      cell: (o) => (
        <span className="text-tx-muted">
          {o.assigned_employee?.full_name ?? "Unassigned"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      mobile: "badge",
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: "created",
      header: "Created",
      numeric: true,
      cell: (o) => fmtDate(o.created_at),
    },
    {
      key: "completed",
      header: "Completed",
      numeric: true,
      cell: (o) =>
        o.closed_at ? (
          fmtDate(o.closed_at)
        ) : (
          <span className="text-tx-faint">—</span>
        ),
    },
  ];

  return (
    /* One content block, so this is the 32px head→content step rather than the
       72px section rhythm the dashboard and orders need. */
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${num(all.length)} recorded · ${num(filtered.length)} shown`}
        title="Transactions"
        subtitle="The complete record of every order across all customers, with who handled it and when it closed."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download />
            Export CSV
          </Button>
        }
      />

      <section className="space-y-5">
        <div className="space-y-3">
          <FilterBar>
            <FilterChips
              value={tab}
              onValueChange={(v) => setTab(v as "all" | OrderStatus)}
              options={STATUS_TABS.map((t) => ({
                value: t.value,
                label: t.label,
                count: tabCounts[t.value] ?? 0,
              }))}
            />
            <FilterBarSpacer />
            <FilterSearch
              value={query}
              onValueChange={setQuery}
              placeholder="Search by order # or customer…"
              aria-label="Search transactions"
            />
          </FilterBar>

          {/* The record-keeping filters sit on their own line: they narrow the
              whole ledger, where the chips above only pick a status. */}
          <FilterBar>
            <FilterSelect
              label="Employee"
              value={employeeId}
              onValueChange={setEmployeeId}
              aria-label="Filter by assigned employee"
              options={[
                { value: "all", label: "All employees" },
                { value: "unassigned", label: "Unassigned" },
                ...employeeOptions.map((e) => ({
                  value: e.id,
                  label: e.full_name || e.email || "Employee",
                })),
              ]}
            />
            <FilterDate
              label="From"
              value={from}
              max={to || undefined}
              onValueChange={setFrom}
              aria-label="Created from"
            />
            <FilterDate
              label="To"
              value={to}
              min={from || undefined}
              onValueChange={setTo}
              aria-label="Created to"
            />
            {narrowed ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-12 sm:h-[38px]"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setEmployeeId("all");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </FilterBar>
        </div>

        <DataTable
          columns={columns}
          rows={visible}
          getRowKey={(o) => o.id}
          rowHref={(o) => `/admin/orders/${o.id}`}
          caption="Every order, newest first"
          unit="transactions"
          loading={isLoading}
          error={isError}
          empty={
            all.length === 0
              ? {
                  icon: <Receipt />,
                  title: "No transactions yet",
                  description: "Every order placed across the portal is recorded here.",
                }
              : {
                  icon: <Receipt />,
                  title: "Nothing matches those filters",
                  description:
                    "Widen the date range, or pick a different employee or status.",
                }
          }
          footer={
            hasMore ? (
              <LoadMoreFooter
                remaining={filtered.length - visible.length}
                step={PAGE_SIZE}
                unit="transactions"
                onLoadMore={() => setLimit((l) => l + PAGE_SIZE)}
              />
            ) : null
          }
        />
      </section>
    </div>
  );
}
