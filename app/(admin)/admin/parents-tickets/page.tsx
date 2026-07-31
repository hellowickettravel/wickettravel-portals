"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Search, HeartHandshake, Eye, ChevronRight, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { listParentTickets } from "@/lib/actions/parents-tickets";
import {
  PARENT_TICKET_STATUSES,
  PARENT_TICKET_STATUS_LABELS,
  PARENT_TICKET_STATUS_TONE,
  PARENT_TICKET_TYPE_LABELS,
  PARENT_TICKET_TYPE_TONE,
  PARENT_TICKET_TYPES,
  type ParentTicketStatus,
  type ParentTicketType,
} from "@/lib/parents-tickets";
import { useListControls } from "@/lib/hooks/use-list-controls";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TICKETS_KEY = ["admin", "parent-tickets", "list"] as const;
const PAGE_SIZE = 12;

const selectClass =
  "h-10 rounded-control border border-input bg-card px-3 text-base text-foreground outline-none transition-colors focus-visible:border-ocean focus-visible:ring-[3px] focus-visible:ring-ocean/25 sm:text-sm";

const STATUS_TABS: { label: string; value: "all" | ParentTicketStatus }[] = [
  { label: "All", value: "all" },
  ...PARENT_TICKET_STATUSES.map((s) => ({
    label: PARENT_TICKET_STATUS_LABELS[s],
    value: s,
  })),
];

/** From → To with an arrow, truncating gracefully on narrow screens. */
function Route({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <span className="truncate">{from}</span>
      <ArrowRight className="size-3.5 shrink-0 text-ocean" />
      <span className="truncate">{to}</span>
    </span>
  );
}

export default function AdminParentsTicketsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const { data, isLoading, isError } = useQuery({
    queryKey: TICKETS_KEY,
    queryFn: listParentTickets,
    // Realtime is the primary live path; this is a safety net so the board is
    // never more than a minute stale even if the socket drops.
    refetchInterval: 60_000,
  });

  // Realtime: any insert/update/delete on the leads table refreshes the board
  // instantly (admin RLS scopes the stream to all rows). Enabled in migration
  // 0019 (publication + replica identity).
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

  const [statusTab, setStatusTab] = useState<"all" | ParentTicketStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ParentTicketType>("all");

  const all = useMemo(() => data ?? [], [data]);

  const narrowed = useMemo(
    () =>
      all.filter(
        (e) =>
          (statusTab === "all" || e.status === statusTab) &&
          (typeFilter === "all" || e.enquiry_type === typeFilter)
      ),
    [all, statusTab, typeFilter]
  );

  // Rows arrive newest-first from the server; search narrows by name, email or
  // #PT reference.
  const { query, setQuery, visible, total, hasMore, loadMore } = useListControls(
    narrowed,
    PAGE_SIZE,
    (e, q) =>
      e.full_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.reference_number.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Leads"
        title="Parents Tickets"
        subtitle="Companion requests and offers submitted from the website."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-surface bg-sunk p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusTab(t.value)}
              className={cn(
                "shrink-0 rounded-control px-3.5 py-1.5 text-sm font-medium transition-colors",
                statusTab === t.value
                  ? "bg-ocean text-tx-invert"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            aria-label="Filter by type"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as "all" | ParentTicketType)
            }
            className={cn(selectClass, "w-full sm:w-44")}
          >
            <option value="all">All types</option>
            {PARENT_TICKET_TYPES.map((t) => (
              <option key={t} value={t}>
                {PARENT_TICKET_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search parents tickets by name, email or reference"
              placeholder="Search name, email or reference…"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <SectionCard flush>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={6} />
          </div>
        ) : isError ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Couldn’t load parents tickets. If this is a fresh setup, run
            APPLY_PARENTS_TICKETS.sql in the Supabase SQL editor first.
          </p>
        ) : all.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-surface bg-sky-tint text-ocean-deep">
              <HeartHandshake className="size-6" />
            </div>
            <p className="tracking-heading text-base font-semibold text-foreground">
              No parents tickets yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Companion requests and offers submitted through the website will
              appear here the moment they arrive.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 p-4 md:hidden">
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No leads match your filters.
                </p>
              ) : (
                visible.map((e) => (
                  <Link
                    key={e.id}
                    href={`/admin/parents-tickets/${e.id}`}
                    className="block"
                  >
                    <MobileRecordCard
                      title={<span className="text-tx-head">{e.full_name}</span>}
                      subtitle={e.reference_number}
                      action={
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-ocean">
                          View
                          <ChevronRight className="size-4" />
                        </span>
                      }
                      badge={
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <StatusBadge
                            tone={PARENT_TICKET_STATUS_TONE[e.status]}
                          >
                            {PARENT_TICKET_STATUS_LABELS[e.status]}
                          </StatusBadge>
                          {e.is_public ? (
                            <StatusBadge tone="green">On website</StatusBadge>
                          ) : null}
                        </div>
                      }
                      fields={[
                        {
                          label: "Type",
                          value: (
                            <StatusBadge
                              tone={PARENT_TICKET_TYPE_TONE[e.enquiry_type]}
                            >
                              {PARENT_TICKET_TYPE_LABELS[e.enquiry_type]}
                            </StatusBadge>
                          ),
                        },
                        { label: "Travel date", value: fmtDate(e.travel_date) },
                        {
                          label: "Route",
                          value: `${e.from_location} → ${e.to_location}`,
                          wide: true,
                        },
                        { label: "Submitted", value: fmtDate(e.created_at) },
                      ]}
                    />
                  </Link>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Reference</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Travel date</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((e) => (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/parents-tickets/${e.id}`)
                      }
                    >
                      <TableCell className="pl-6 font-medium tabular-nums text-tx-head">
                        {e.reference_number}
                      </TableCell>
                      <TableCell>
                        <span className="block font-medium text-foreground">
                          {e.full_name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {e.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={PARENT_TICKET_TYPE_TONE[e.enquiry_type]}
                        >
                          {PARENT_TICKET_TYPE_LABELS[e.enquiry_type]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <Route from={e.from_location} to={e.to_location} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(e.travel_date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(e.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge
                            tone={PARENT_TICKET_STATUS_TONE[e.status]}
                          >
                            {PARENT_TICKET_STATUS_LABELS[e.status]}
                          </StatusBadge>
                          {e.is_public ? (
                            <StatusBadge tone="green">On website</StatusBadge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className="pr-6 text-right"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <Link
                          href={`/admin/parents-tickets/${e.id}`}
                          className="inline-flex items-center gap-1.5 rounded-control border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-ocean hover:text-ocean"
                        >
                          <Eye className="size-4" />
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No leads match your filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {hasMore ? (
              <div className="flex justify-center border-t border-border p-4">
                <Button variant="outline" size="sm" onClick={loadMore}>
                  Load more ({total - visible.length} more)
                </Button>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </div>
  );
}
