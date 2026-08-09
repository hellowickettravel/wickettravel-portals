"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { listAllListings } from "@/lib/actions/parents-listings";
import {
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  type ListingStatus,
} from "@/lib/parents-marketplace";
import { LISTING_TONE } from "@/components/customer/listings-view";
import { fmtDate, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Avatar,
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
import { GlobeIcon } from "@/components/admin/icons";

const KEY = ["admin", "parent-listings"] as const;
const PAGE_SIZE = 8;

type Tab = "all" | ListingStatus;

const TABS: { label: string; value: Tab }[] = [
  { label: "All", value: "all" },
  ...LISTING_STATUSES.map((s) => ({
    label: LISTING_STATUS_LABELS[s],
    value: s as Tab,
  })),
];

/**
 * The Parents Tickets listings queue — the admin half of the approval
 * workflow. Nothing here is matchable or publicly visible until a human moves
 * it out of "Awaiting review".
 */
export default function AdminParentsListingsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: KEY,
    queryFn: listAllListings,
  });

  const [tab, setTab] = useState<Tab>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    const channel = supabase
      .channel("admin-parent-listings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parent_ticket_listings" },
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
        (l) =>
          !q ||
          `${l.reference_number} ${l.from_airport} ${l.to_airport} ${
            l.profile?.full_name ?? ""
          } ${l.profile?.email ?? ""} ${l.airline ?? ""} ${l.flight_number ?? ""}`
            .toLowerCase()
            .includes(q)
      ),
    [all, q]
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: searched.length };
    for (const s of LISTING_STATUSES) {
      out[s] = searched.filter((l) => l.listing_status === s).length;
    }
    return out;
  }, [searched]);

  const rows = useMemo(
    () => searched.filter((l) => tab === "all" || l.listing_status === tab),
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
        title="Parent listings"
        intro="Traveller listings and parent requests from verified customers. Every one is approved by hand before it can be matched or shown on the public board."
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
            title="Couldn't load listings"
            body={`If this is a fresh setup, run APPLY_PARENTS_FULLSCOPE_0.sql in the Supabase SQL editor first, then reload. (${
              error instanceof Error ? error.message : "Unknown error"
            })`}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              all.length === 0
                ? "No listings yet"
                : "No listings match these filters"
            }
            body={
              all.length === 0
                ? "When a verified customer sends a traveller listing or a parent request for approval, it lands here."
                : "Clear the status filter to widen the list."
            }
            action={
              all.length === 0 ? undefined : (
                <Btn onClick={() => setTab("all")}>Clear all filters</Btn>
              )
            }
          />
        ) : (
          <>
            <TableScroll>
              <Table min={1020}>
                <Thead>
                  <Th>Reference</Th>
                  <Th>Posted by</Th>
                  <Th>Side</Th>
                  <Th>Route</Th>
                  <Th>Travel date</Th>
                  <Th>Status</Th>
                  <Th>Updated</Th>
                  <Th align="right" />
                </Thead>
                <tbody>
                  {visible.map((l) => (
                    <Tr
                      key={l.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/parents-listings/${l.id}`)}
                    >
                      <Td className="text-marine-600 text-[13px] font-semibold tabular-nums">
                        {l.reference_number}
                      </Td>
                      <Td>
                        <span className="flex items-center gap-3">
                          <Avatar name={l.profile?.full_name ?? "?"} size={30} />
                          <span className="flex min-w-0 flex-col">
                            <span className="text-[13px] font-medium">
                              {l.profile?.full_name ?? "Unnamed"}
                            </span>
                            <span
                              className={cn(
                                "text-[11.5px] font-normal",
                                l.identity?.verification_status === "verified"
                                  ? "text-ok-ink"
                                  : "text-warn-ink"
                              )}
                            >
                              {l.identity?.verification_status === "verified"
                                ? "Verified"
                                : "Not verified"}
                            </span>
                          </span>
                        </span>
                      </Td>
                      <Td>
                        {l.listing_kind === "requester" ? (
                          <span className="bg-warn-bg text-warn-ink inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap">
                            Needs help
                          </span>
                        ) : (
                          <span className="bg-cyan-bg text-cyan-ink inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap">
                            Offering help
                          </span>
                        )}
                      </Td>
                      <Td>
                        {l.from_airport} → {l.to_airport}
                      </Td>
                      <Td className="text-ink-600 text-[13px]">
                        {l.travel_date ? fmtDate(l.travel_date) : "No date"}
                      </Td>
                      <Td>
                        <span className="flex items-center gap-2">
                          <Pill tone={LISTING_TONE[l.listing_status]}>
                            {LISTING_STATUS_LABELS[l.listing_status]}
                          </Pill>
                          {l.is_public ? (
                            <span title="On the public board" className="text-ink-500 flex">
                              <GlobeIcon size={14} />
                            </span>
                          ) : null}
                        </span>
                      </Td>
                      <Td className="text-ink-600 text-[13px]">
                        {fmtRelative(l.updated_at)}
                      </Td>
                      <Td align="right" onClick={(ev) => ev.stopPropagation()}>
                        <ViewButton href={`/admin/parents-listings/${l.id}`} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <TableFoot
              shown={visible.length}
              total={rows.length}
              noun="listings"
              action={
                remaining > 0 ? (
                  <Btn onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                    Load {Math.min(PAGE_SIZE, remaining)} more — {remaining} remaining
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
