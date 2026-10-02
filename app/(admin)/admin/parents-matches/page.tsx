"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { deleteMatch, listMatches } from "@/lib/actions/parents-matches";
import {
  MATCH_STATUSES,
  MATCH_STATUS_LABELS,
  PARTY_RESPONSE_LABELS,
  type MatchStatus,
} from "@/lib/parents-marketplace";
import {
  MATCH_TONE,
  RESPONSE_TONE,
  scoreTone,
} from "@/components/admin/match-review";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Btn,
  Card,
  EmptyState,
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
} from "@/components/admin/ui";
import { HowItWorks } from "@/components/admin/how-it-works";
import { LoadMore } from "@/components/admin/load-more";
import { DeleteRowButton } from "@/components/admin/delete-row";

const KEY = ["admin", "parent-matches"] as const;
const PAGE_SIZE = 8;

type Tab = "all" | MatchStatus;

const TABS: { label: string; value: Tab }[] = [
  { label: "All", value: "all" },
  ...MATCH_STATUSES.map((s) => ({
    label: MATCH_STATUS_LABELS[s],
    value: s as Tab,
  })),
];

/**
 * The matches queue. An introduction here is a brokered service, so every row
 * is something Wicket created by hand from a listing's ranked candidates —
 * there is no path for a customer to pair themselves with anyone.
 */
export default function AdminParentsMatchesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: KEY,
    queryFn: listMatches,
  });

  const [tab, setTab] = useState<Tab>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    const channel = supabase
      .channel("admin-parent-matches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parent_ticket_matches" },
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
        (m) =>
          !q ||
          `${m.reference_number} ${m.traveller?.reference_number ?? ""} ${
            m.requester?.reference_number ?? ""
          } ${m.traveller?.profile?.full_name ?? ""} ${
            m.requester?.profile?.full_name ?? ""
          } ${m.traveller?.from_airport ?? ""} ${m.traveller?.to_airport ?? ""}`
            .toLowerCase()
            .includes(q)
      ),
    [all, q]
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: searched.length };
    for (const s of MATCH_STATUSES) {
      out[s] = searched.filter((m) => m.match_status === s).length;
    }
    return out;
  }, [searched]);

  const rows = useMemo(
    () => searched.filter((m) => tab === "all" || m.match_status === tab),
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
        title="Matches"
        intro="Traveller and requester pairings. Both sides have to accept before contact details can be released, and releasing them is a separate step tied to a payment."
      />

      <HowItWorks
        title="How matches work"
        cta={{ href: "/admin/parents-listings", label: "Open parent listings" }}
        steps={[
          {
            label: "A listing is approved",
            body: "Someone posts a trip they are already taking, or asks for help for a parent. You approve it under Parent listings.",
          },
          {
            label: "You propose the match",
            body: "An approved listing shows its ranked candidates. Only staff can create a match — the introduction is the service being paid for.",
          },
          {
            label: "Both sides answer",
            body: "Each party accepts or declines from their own portal. Nothing is released while either is still deciding.",
          },
          {
            label: "Payment, then introduction",
            body: "Once both have accepted AND the payment is marked paid, releasing contact opens the thread. That step is irreversible.",
          },
        ]}
      />

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
            title="Couldn't load matches"
            body={`If this is a fresh setup, run APPLY_PARENTS_FULLSCOPE_0.sql in the Supabase SQL editor first, then reload. (${
              error instanceof Error ? error.message : "Unknown error"
            })`}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? "No matches yet" : "Nothing matches these filters"}
            body={
              all.length === 0
                ? "Open an approved listing under Parent listings — its ranked candidates are there, and proposing one creates a match."
                : "Clear the status filter to widen the list."
            }
            action={
              all.length === 0 ? (
                <Btn as="link" href="/admin/parents-listings">
                  Go to parent listings
                </Btn>
              ) : (
                <Btn onClick={() => setTab("all")}>Clear all filters</Btn>
              )
            }
          />
        ) : (
          <>
            <TableScroll>
              <Table min={1060}>
                <Thead>
                  <Th>Match</Th>
                  <Th>Score</Th>
                  <Th>Traveller</Th>
                  <Th>Requester</Th>
                  <Th>Route</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th align="right" />
                </Thead>
                <tbody>
                  {visible.map((m) => (
                    <Tr
                      key={m.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/parents-matches/${m.id}`)}
                    >
                      <Td className="text-marine-600 text-[13px] font-semibold tabular-nums">
                        {m.reference_number}
                      </Td>
                      <Td>
                        <Pill tone={scoreTone(m.match_score)}>
                          {m.match_score ?? "—"}
                        </Pill>
                      </Td>
                      <Td>
                        <span className="flex min-w-0 flex-col">
                          <span className="text-[13px] font-medium">
                            {m.traveller?.profile?.full_name ?? "—"}
                          </span>
                          <Pill tone={RESPONSE_TONE[m.traveller_response]}>
                            {PARTY_RESPONSE_LABELS[m.traveller_response]}
                          </Pill>
                        </span>
                      </Td>
                      <Td>
                        <span className="flex min-w-0 flex-col">
                          <span className="text-[13px] font-medium">
                            {m.requester?.profile?.full_name ?? "—"}
                          </span>
                          <Pill tone={RESPONSE_TONE[m.requester_response]}>
                            {PARTY_RESPONSE_LABELS[m.requester_response]}
                          </Pill>
                        </span>
                      </Td>
                      <Td>
                        {m.traveller
                          ? `${m.traveller.from_airport} → ${m.traveller.to_airport}`
                          : "—"}
                      </Td>
                      <Td className="text-ink-600 text-[13px]">
                        {m.traveller?.travel_date
                          ? fmtDate(m.traveller.travel_date)
                          : "—"}
                      </Td>
                      <Td>
                        <Pill tone={MATCH_TONE[m.match_status]}>
                          {MATCH_STATUS_LABELS[m.match_status]}
                        </Pill>
                      </Td>
                      <Td align="right" onClick={(ev) => ev.stopPropagation()}>
                        <span className="inline-flex items-center gap-2">
                          <DeleteRowButton
                            what="match"
                            name={m.reference_number ?? "this match"}
                            body={`This permanently removes the match between ${m.traveller?.profile?.full_name ?? "the traveller"} and ${m.requester?.profile?.full_name ?? "the requester"}, with its messages. Both listings stay and can be matched again. Matches with a payment pending, paid or refunded can't be deleted. This can't be undone.`}
                            action={() => deleteMatch(m.id)}
                            onDeleted={() => queryClient.invalidateQueries({ queryKey: KEY })}
                          />
                          <ViewButton href={`/admin/parents-matches/${m.id}`} />
                        </span>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <TableFoot
              shown={visible.length}
              total={rows.length}
              noun="matches"
              action={
                remaining > 0 ? (
                  <LoadMore
                    remaining={remaining}
                    pageSize={PAGE_SIZE}
                    noun="matches"
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
