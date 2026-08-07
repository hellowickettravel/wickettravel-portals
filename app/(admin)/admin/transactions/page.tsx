"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/lib/actions/admin";
import { gbp, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Btn,
  Card,
  EmptyState,
  PageHead,
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
  focusRing,
} from "@/components/admin/ui";

const PAGE_SIZE = 5;

const SIDES = [
  { key: "all", label: "Everyone" },
  { key: "employee", label: "By employee" },
  { key: "customer", label: "By customer" },
] as const;
type Side = (typeof SIDES)[number]["key"];

/**
 * Transactions — the design's commission ledger: every COMPLETED order, what it
 * cost, what it sold for and the commission it earned, sliceable by the
 * employee who closed it or the customer who bought it.
 */
export default function TransactionsPage() {
  const [side, setSide] = useState<Side>("all");
  const [name, setName] = useState("All");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: listOrders,
    refetchInterval: 60_000,
  });

  // A transaction is a completed order: that is when revenue and commission
  // are actually earned. Newest completion first.
  const completed = useMemo(
    () =>
      (data ?? [])
        .filter((o) => o.status === "completed")
        .sort((a, b) =>
          (b.closed_at ?? b.created_at ?? "").localeCompare(
            a.closed_at ?? a.created_at ?? ""
          )
        ),
    [data]
  );

  const names = useMemo(() => {
    const set = new Set<string>();
    for (const o of completed) {
      const v =
        side === "employee"
          ? o.assigned_employee?.full_name
          : o.customer?.name;
      if (v) set.add(v);
    }
    return [...set].sort();
  }, [completed, side]);

  const rows = useMemo(() => {
    if (side === "all" || name === "All") return completed;
    return completed.filter((o) =>
      side === "employee"
        ? o.assigned_employee?.full_name === name
        : o.customer?.name === name
    );
  }, [completed, side, name]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(PAGE_SIZE);
  }, [side, name]);

  const totals = useMemo(() => {
    const sold = rows.reduce((s, o) => s + (o.selling_price ?? 0), 0);
    const net = rows.reduce((s, o) => s + (o.cost_price ?? 0), 0);
    const commission = rows.reduce((s, o) => s + (o.commission ?? 0), 0);
    return {
      sold,
      net,
      commission,
      avg: rows.length ? commission / rows.length : 0,
    };
  }, [rows]);

  const visible = rows.slice(0, limit);
  const remaining = Math.max(0, rows.length - limit);

  return (
    <Screen>
      <PageHead
        title="Transactions"
        intro="Every completed order and the commission it earned, by employee."
      />

      {/* --------------------------------------------- commission summary */}
      <Card>
        <div className="border-line-soft flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <h2 className="text-ink-800 m-0 text-[13.5px] font-semibold tracking-[-0.008em]">
            Commission
          </h2>
          <span className="bg-ok-bg text-ok-ink rounded-full px-3 py-1 text-[11px] font-medium">
            {side === "all" || name === "All" ? "Everyone" : name}
          </span>
        </div>
        <div className="flex flex-wrap items-stretch gap-[clamp(20px,3vw,40px)] p-5">
          <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
            <span className="text-ink-600 text-[11px] font-medium tracking-[0.11em] uppercase">
              Total commission
            </span>
            <span className="font-poppins text-ok-ink text-[clamp(30px,3vw,36px)] leading-none font-medium tracking-[-0.022em] tabular-nums">
              {gbp(totals.commission)}
            </span>
            <span className="text-ink-600 text-[11.5px] font-normal">
              {rows.length} completed{" "}
              {rows.length === 1 ? "order" : "orders"} this period
            </span>
          </div>
          <div className="flex min-w-0 flex-[2_1_280px] flex-col">
            {[
              { label: "Gross sales", value: gbp(totals.sold) },
              { label: "Net cost", value: gbp(totals.net) },
              { label: "Average per order", value: gbp(totals.avg) },
            ].map((r) => (
              <div
                key={r.label}
                className="border-line-soft flex items-baseline justify-between gap-4 border-b py-[11px]"
              >
                <span className="text-ink-600 text-[12.5px] font-normal">
                  {r.label}
                </span>
                <span className="text-[13px] font-medium whitespace-nowrap tabular-nums">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ---------------------------------------------------------- table */}
      <Card>
        <div className="border-line-soft flex flex-wrap items-center gap-3 border-b px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {SIDES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setSide(s.key);
                  setName("All");
                }}
                aria-pressed={side === s.key}
                className={cn(
                  "h-[34px] rounded-full border px-4 text-[13px] font-medium whitespace-nowrap outline-none",
                  side === s.key
                    ? "border-ink-800 bg-ink-800 text-white"
                    : "border-line-field text-ink-700 hover:bg-surface-1 bg-white"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          {side !== "all" ? (
            <label className="flex items-center gap-2">
              <span className="text-ink-600 text-[11.5px] font-medium whitespace-nowrap">
                {side === "employee" ? "Employee" : "Customer"}
              </span>
              <select
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(
                  "border-line-field text-ink-800 h-[34px] cursor-pointer rounded-full border bg-white pr-8 pl-3.5 text-[12.5px] font-medium outline-none",
                  focusRing
                )}
              >
                <option value="All">All</option>
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            body="A transaction appears here the moment an order is marked completed — that is when its revenue and commission are earned."
          />
        ) : (
          <>
            <TableScroll>
              <Table min={900}>
                <Thead>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Employee</Th>
                  <Th>Completed</Th>
                  <Th align="right">Net cost</Th>
                  <Th align="right">Sold for</Th>
                  <Th align="right" />
                </Thead>
                <tbody>
                  {visible.map((o) => (
                    <Tr key={o.id}>
                      <Td className="text-marine-600 text-[12.5px] font-medium tabular-nums">
                        {o.order_number}
                      </Td>
                      <Td>{o.customer?.name ?? "—"}</Td>
                      <Td className="text-ink-600 text-[12.5px]">
                        {o.assigned_employee?.full_name ?? "—"}
                      </Td>
                      <Td className="text-ink-600 text-[12.5px]">
                        {fmtDate(o.closed_at ?? o.created_at)}
                      </Td>
                      <Td align="right" className="tabular-nums">
                        {o.cost_price != null ? gbp(o.cost_price) : "—"}
                      </Td>
                      <Td align="right" className="font-medium tabular-nums">
                        {o.selling_price != null ? gbp(o.selling_price) : "—"}
                      </Td>
                      <Td align="right">
                        <ViewButton href={`/admin/orders/${o.id}`} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <TableFoot
              shown={visible.length}
              total={rows.length}
              noun="transactions"
              action={
                remaining > 0 ? (
                  <Btn onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                    Load {Math.min(PAGE_SIZE, remaining)} more — {remaining}{" "}
                    remaining
                  </Btn>
                ) : undefined
              }
            />
          </>
        )}
      </Card>
    </Screen>
  );
}
