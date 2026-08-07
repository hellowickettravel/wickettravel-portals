"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { listParentTickets } from "@/lib/actions/parents-tickets";
import {
  PARENT_TICKET_STATUSES,
  PARENT_TICKET_STATUS_LABELS,
  type ParentTicketStatus,
} from "@/lib/parents-tickets";
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

const TICKETS_KEY = ["admin", "parent-tickets", "list"] as const;
const PAGE_SIZE = 5;

type Tab = "all" | ParentTicketStatus;

const TABS: { label: string; value: Tab }[] = [
  { label: "All", value: "all" },
  ...PARENT_TICKET_STATUSES.map((s) => ({
    label: PARENT_TICKET_STATUS_LABELS[s],
    value: s as Tab,
  })),
];

/**
 * Parent tickets — the design's second queue. Both sides of the board live on
 * one record: `requester` needs a companion for a parent, `traveller` is
 * offering to help. The Type column carries its own hue pair so a glance
 * separates the two without reading.
 */
export default function AdminParentsTicketsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const { data, isLoading, isError } = useQuery({
    queryKey: TICKETS_KEY,
    queryFn: listParentTickets,
  });

  const [tab, setTab] = useState<Tab>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Live: a new public submission lands in the queue without a reload.
  useEffect(() => {
    const channel = supabase
      .channel("admin-parent-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parent_ticket_enquiries" },
        () => queryClient.invalidateQueries({ queryKey: TICKETS_KEY })
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
        (t) =>
          !q ||
          `${t.full_name} ${t.reference_number} ${t.from_location} ${t.to_location}`
            .toLowerCase()
            .includes(q)
      ),
    [all, q]
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: searched.length };
    for (const s of PARENT_TICKET_STATUSES) {
      out[s] = searched.filter((t) => t.status === s).length;
    }
    return out;
  }, [searched]);

  const rows = useMemo(
    () => searched.filter((t) => tab === "all" || t.status === tab),
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
        title="Parent tickets"
        intro="Requests from parents travelling to their children and children arranging travel for a parent. Both sides of the request live on one record."
      />

      <Card>
        <div className="border-line-soft flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex flex-wrap gap-2">
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
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load parent tickets"
            body="If this is a fresh setup, run APPLY_PARENTS_TICKETS.sql in the Supabase SQL editor first, then reload this page."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              all.length === 0
                ? "No parent tickets yet"
                : "No tickets match these filters"
            }
            body={
              all.length === 0
                ? "Requests submitted through the website's parent-ticket form appear here the moment they arrive."
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
              <Table min={940}>
                <Thead>
                  <Th>Reference</Th>
                  <Th>Requester</Th>
                  <Th>Type</Th>
                  <Th>Route</Th>
                  <Th>Preferred date</Th>
                  <Th>Status</Th>
                  <Th align="right" />
                </Thead>
                <tbody>
                  {visible.map((t) => (
                    <Tr
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/parents-tickets/${t.id}`)
                      }
                    >
                      <Td className="text-marine-600 text-[13px] font-semibold tabular-nums">
                        {t.reference_number}
                      </Td>
                      <Td className="text-[13.5px] font-medium">
                        {t.full_name}
                      </Td>
                      <Td>
                        {t.enquiry_type === "requester" ? (
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
                        {t.from_location} → {t.to_location}
                      </Td>
                      <Td className="text-ink-600 text-[13px]">
                        {t.travel_date ? fmtDate(t.travel_date) : "No date"}
                      </Td>
                      <Td>
                        <Pill>{PARENT_TICKET_STATUS_LABELS[t.status]}</Pill>
                      </Td>
                      <Td align="right" onClick={(ev) => ev.stopPropagation()}>
                        <ViewButton href={`/admin/parents-tickets/${t.id}`} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <TableFoot
              shown={visible.length}
              total={rows.length}
              noun="tickets"
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
