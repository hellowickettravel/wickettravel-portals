"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/actions/employee";
import { MY_ORDERS_KEY } from "@/lib/query-keys";
import type { OrderStatus } from "@/lib/db/types";
import { type AccessLevel, isReadOnly } from "@/lib/access";
import { gbp, fmtDate, routeLabel, statusLabel } from "@/lib/format";
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
import { LoadMore } from "@/components/admin/load-more";
import {
  ClockIcon,
  OrdersIcon,
  PercentIcon,
  PlusIcon,
  CheckCircleIcon,
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

/**
 * The employee's order pipeline — the admin design's Orders screen, scoped by
 * RLS to what this employee can see. Read-only levels lose the New order
 * action; everything else is identical, because the design is the portal's,
 * not the role's.
 */
export function EmployeeOrders({ accessLevel }: { accessLevel: AccessLevel }) {
  const router = useRouter();
  const readOnly = isReadOnly(accessLevel);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: MY_ORDERS_KEY,
    queryFn: listMyOrders,
    refetchInterval: 60_000,
  });

  const [tab, setTab] = useState<Tab>("all");

  // The top bar hands this screen its term as ?q=; it seeds the in-card box.
  const topSearch = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(topSearch);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(topSearch);
  }, [topSearch]);

  // "Departs next": upcoming flights first, then the ones already gone, then
  // orders with no travel date — the same rule the admin pipeline uses.
  const all = useMemo(() => {
    const rows = orders ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const rank = (d: string | null) => (!d ? 2 : d >= today ? 0 : 1);
    return [...rows].sort((a, b) => {
      const ra = rank(a.travel_date);
      const rb = rank(b.travel_date);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return (a.travel_date ?? "").localeCompare(b.travel_date ?? "");
      if (ra === 1) return (b.travel_date ?? "").localeCompare(a.travel_date ?? "");
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
  }, [orders]);

  const [limit, setLimit] = useState(PAGE_SIZE);

  const totals = useMemo(() => {
    const open = all.filter(
      (o) => o.status === "new" || o.status === "in_progress"
    ).length;
    const completed = all.filter((o) => o.status === "completed");
    return {
      total: all.length,
      open,
      completed: completed.length,
      commission: completed.reduce((s, o) => s + (o.commission ?? 0), 0),
    };
  }, [all]);

  const matchesQuery = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (o: (typeof all)[number]) =>
      !q ||
      [
        o.order_number,
        o.customer?.name ?? "",
        o.route_from ?? "",
        o.route_to ?? "",
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
    <Screen>
      <PageHead
        title="My orders"
        intro="Orders you created or that are assigned to you, sorted by the flight that departs next."
        actions={
          readOnly ? undefined : (
            <Btn as="link" href="/employee/orders/new" variant="ember">
              <PlusIcon size={15} />
              New order
            </Btn>
          )
        }
      />

      <KpiGrid>
        <Kpi
          label="My orders"
          value={totals.total}
          meta="All time"
          tone="marine"
          icon={<OrdersIcon size={18} />}
        />
        <Kpi
          label="Open"
          value={totals.open}
          meta="New and In progress"
          tone="warn"
          icon={<ClockIcon size={18} />}
        />
        <Kpi
          label="Completed"
          value={totals.completed}
          meta="Closed and ticketed"
          tone="teal"
          icon={<CheckCircleIcon size={18} />}
        />
        <Kpi
          label="Commission earned"
          value={gbp(totals.commission)}
          meta="On completed orders only"
          tone="ok"
          icon={<PercentIcon size={18} />}
          valueClass="text-ok-ink"
        />
      </KpiGrid>

      <Card>
        <div className="border-line-soft flex flex-wrap items-center gap-3 border-b px-5 py-4">
          <div className="relative flex min-w-0 flex-[1_1_260px]">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order number, customer or route"
              aria-label="Search orders"
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
                ? "Orders are born from chats — open a conversation and create one, or start a new order from scratch."
                : "Clear the status filter or try a different order number, customer or route."
            }
            action={
              all.length === 0 ? (
                readOnly ? undefined : (
                  <Btn as="link" href="/employee/orders/new" variant="ember">
                    <PlusIcon size={15} />
                    New order
                  </Btn>
                )
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
            <Table min={940}>
              <Thead>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Route</Th>
                <Th>Travel date</Th>
                <Th align="right">Pax</Th>
                <Th align="right">Selling price</Th>
                <Th align="right">Commission</Th>
                <Th>Status</Th>
                <Th align="right" />
              </Thead>
              <tbody>
                {visible.map((o) => (
                  <Tr
                    key={o.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/employee/orders/${o.id}`)}
                  >
                    <Td className="text-marine-600 text-[12.5px] font-medium tabular-nums">
                      <Link
                        href={`/employee/orders/${o.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {o.order_number}
                      </Link>
                    </Td>
                    <Td className="text-ink-800 font-medium">
                      {o.customer?.name ?? "—"}
                    </Td>
                    <Td>{routeLabel(o.route_from, o.route_to)}</Td>
                    <Td
                      className={cn(
                        "text-[12.5px]",
                        o.travel_date ? "text-ink-800" : "text-ink-500"
                      )}
                    >
                      {o.travel_date ? fmtDate(o.travel_date) : "No travel date"}
                    </Td>
                    <Td align="right" className="text-[12.5px] tabular-nums">
                      {o.passengers ?? "—"}
                    </Td>
                    <Td align="right" className="font-medium tabular-nums">
                      {o.selling_price != null ? gbp(o.selling_price) : "—"}
                    </Td>
                    <Td
                      align="right"
                      className="text-ok-ink text-[12.5px] font-medium tabular-nums"
                    >
                      {o.commission != null ? gbp(o.commission) : "—"}
                    </Td>
                    <Td>
                      <Pill>{statusLabel(o.status)}</Pill>
                    </Td>
                    <Td align="right" onClick={(e) => e.stopPropagation()}>
                      <ViewButton href={`/employee/orders/${o.id}`} />
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
