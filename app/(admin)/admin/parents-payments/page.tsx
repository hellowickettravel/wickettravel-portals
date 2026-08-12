"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { listPayments } from "@/lib/actions/parents-payments";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  type PaymentStatus,
} from "@/lib/parents-marketplace";
import { fmtDate } from "@/lib/format";
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
  type PillTone,
} from "@/components/admin/ui";
import { HowItWorks } from "@/components/admin/how-it-works";
import { LoadMore } from "@/components/admin/load-more";
import { PoundIcon, RouteIcon, UnlockIcon } from "@/components/admin/icons";

const KEY = ["admin", "parent-payments"] as const;
const PAGE_SIZE = 10;

const STATUS_TONE: Record<PaymentStatus, PillTone> = {
  unpaid: "ink",
  pending: "warn",
  paid: "ok",
  refunded: "violet",
  cancelled: "ink",
};

type Tab = "all" | PaymentStatus;

const TABS: { label: string; value: Tab }[] = [
  { label: "All", value: "all" },
  ...PAYMENT_STATUSES.map((s) => ({
    label: PAYMENT_STATUS_LABELS[s],
    value: s as Tab,
  })),
];

function gbp(n: number): string {
  return `£${n.toFixed(2)}`;
}

/**
 * The manual payment records (full scope items 7 + 8).
 *
 * Stage A means every row here was typed by a person after money moved
 * somewhere else, so this screen is a ledger rather than a payments dashboard —
 * it reports what was recorded, and the only figures that are summed are the
 * ones actually marked paid.
 */
export default function AdminParentsPaymentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: KEY,
    queryFn: listPayments,
  });

  const [tab, setTab] = useState<Tab>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    const channel = supabase
      .channel("admin-parent-payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parent_ticket_payments" },
        () => queryClient.invalidateQueries({ queryKey: KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const all = useMemo(() => data ?? [], [data]);

  const searched = useMemo(
    () =>
      all.filter(
        (p) =>
          !q ||
          `${p.reference_number} ${p.match?.reference_number ?? ""} ${
            p.reference_note ?? ""
          }`
            .toLowerCase()
            .includes(q)
      ),
    [all, q]
  );

  // Only settled money counts. A pending record is an intention, not income.
  const totals = useMemo(() => {
    const paid = searched.filter((p) => p.payment_status === "paid");
    return {
      count: paid.length,
      gross: paid.reduce((s, p) => s + Number(p.gross_amount), 0),
      commission: paid.reduce((s, p) => s + Number(p.commission_amount), 0),
      payout: paid.reduce((s, p) => s + Number(p.payout_amount), 0),
    };
  }, [searched]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: searched.length };
    for (const s of PAYMENT_STATUSES) {
      out[s] = searched.filter((p) => p.payment_status === s).length;
    }
    return out;
  }, [searched]);

  const rows = useMemo(
    () => searched.filter((p) => tab === "all" || p.payment_status === tab),
    [searched, tab]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(PAGE_SIZE);
  }, [tab, q]);

  const visible = rows.slice(0, limit);
  const remaining = Math.max(0, rows.length - limit);

  return (
    <Screen>
      <PageHead
        title="Parent payments"
        intro="Money recorded by hand against a match. Nothing here is taken through the portal — an admin writes down a bank transfer, cash or a card machine, and that record is what unlocks an introduction."
      />

      <HowItWorks
        title="How payments work"
        cta={{ href: "/admin/parents-matches", label: "Open matches" }}
        steps={[
          {
            label: "Money moves outside the system",
            body: "Stage A is a ledger, not a processor. Bank transfer, card link, cash — you record what actually happened.",
          },
          {
            label: "Record it on the match",
            body: "Open the match and fill in the payment card there. Payer and payee come from the match, so they cannot be entered wrongly.",
          },
          {
            label: "The payout is derived",
            body: "Gross minus commission. It is never typed, and a commission above gross is rejected rather than silently zeroed.",
          },
          {
            label: "Marking it paid unlocks the introduction",
            body: "Both parties accepted plus a paid payment is the whole gate. Every row here is one of those decisions.",
          },
        ]}
      />

      <KpiGrid>
        <Kpi
          label="Received"
          value={gbp(totals.gross)}
          meta={`Across ${totals.count} settled payment${totals.count === 1 ? "" : "s"}`}
          tone="marine"
          icon={<PoundIcon size={18} />}
        />
        <Kpi
          label="Wicket commission"
          value={gbp(totals.commission)}
          meta="The only figure allowed a success tint"
          tone="ok"
          icon={<PoundIcon size={18} />}
        />
        <Kpi
          label="Owed to travellers"
          value={gbp(totals.payout)}
          meta="Received minus commission"
          tone="violet"
          icon={<RouteIcon size={18} />}
        />
      </KpiGrid>

      <Card>
        <div className="border-line-soft flex flex-wrap items-center gap-2 border-b px-5 py-4">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={tab === t.value}
              className={cn(
                "flex h-[34px] shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap outline-none",
                tab === t.value
                  ? "border-ink-800 bg-ink-800 text-white"
                  : "border-line-field text-ink-700 hover:bg-surface-1 bg-white"
              )}
            >
              {t.label}
              <span className="text-[11px] font-medium tabular-nums opacity-[0.66]">
                {counts[t.value] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load payments"
            body={`If this is a fresh setup, run APPLY_PARENTS_FULLSCOPE_0.sql in the Supabase SQL editor first, then reload. (${
              error instanceof Error ? error.message : "Unknown error"
            })`}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? "No payments recorded yet" : "Nothing matches these filters"}
            body={
              all.length === 0
                ? "Open a match under Matches — the payment is recorded on the match itself, because recording it and introducing the two parties are one decision."
                : "Clear the status filter to widen the list."
            }
            action={
              all.length === 0 ? (
                <Btn as="link" href="/admin/parents-matches">
                  Go to matches
                </Btn>
              ) : (
                <Btn onClick={() => setTab("all")}>Clear all filters</Btn>
              )
            }
          />
        ) : (
          <>
            <TableScroll>
              <Table min={1000}>
                <Thead>
                  <Th>Reference</Th>
                  <Th>Match</Th>
                  <Th align="right">Paid</Th>
                  <Th align="right">Commission</Th>
                  <Th align="right">Payout</Th>
                  <Th>Method</Th>
                  <Th>Status</Th>
                  <Th>Received</Th>
                  <Th align="right" />
                </Thead>
                <tbody>
                  {visible.map((p) => (
                    <Tr
                      key={p.id}
                      className={cn(p.match && "cursor-pointer")}
                      onClick={() =>
                        p.match && router.push(`/admin/parents-matches/${p.match.id}`)
                      }
                    >
                      <Td className="text-ink-600 text-[13px] font-medium tabular-nums">
                        {p.reference_number}
                      </Td>
                      <Td>
                        <span className="flex items-center gap-2">
                          <span className="text-marine-600 text-[13px] font-semibold tabular-nums">
                            {p.match?.reference_number ?? "—"}
                          </span>
                          {p.match?.contact_released ? (
                            <span title="Introduced" className="text-ok-ink flex">
                              <UnlockIcon size={14} />
                            </span>
                          ) : null}
                        </span>
                      </Td>
                      <Td align="right" className="text-[13px] font-medium tabular-nums">
                        {gbp(Number(p.gross_amount))}
                      </Td>
                      <Td align="right">
                        <span className="bg-ok-bg text-ok-ink inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-medium tabular-nums">
                          {gbp(Number(p.commission_amount))}
                        </span>
                      </Td>
                      <Td align="right" className="text-ink-600 text-[13px] tabular-nums">
                        {gbp(Number(p.payout_amount))}
                      </Td>
                      <Td className="text-ink-600 text-[13px]">
                        {p.payment_method
                          ? PAYMENT_METHOD_LABELS[p.payment_method]
                          : "—"}
                      </Td>
                      <Td>
                        <Pill tone={STATUS_TONE[p.payment_status]}>
                          {PAYMENT_STATUS_LABELS[p.payment_status]}
                        </Pill>
                      </Td>
                      <Td className="text-ink-600 text-[13px]">
                        {p.paid_at ? fmtDate(p.paid_at) : "—"}
                      </Td>
                      <Td align="right" onClick={(ev) => ev.stopPropagation()}>
                        {p.match ? (
                          <ViewButton href={`/admin/parents-matches/${p.match.id}`} />
                        ) : null}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <TableFoot
              shown={visible.length}
              total={rows.length}
              noun="payments"
              action={
                remaining > 0 ? (
                  <LoadMore
                    remaining={remaining}
                    pageSize={PAGE_SIZE}
                    noun="payments"
                    onLoad={() => setLimit((l) => l + PAGE_SIZE)}
                  />
                ) : undefined
              }
            />
          </>
        )}
      </Card>
    </Screen>
  );
}
