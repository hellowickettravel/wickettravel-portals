"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { listVisaEnquiries } from "@/lib/actions/visa";
import {
  VISA_STATUSES,
  VISA_STATUS_LABELS,
  type VisaEnquiryStatus,
} from "@/lib/visa";
import { fmtStamp } from "@/lib/format";
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
  focusRing,
} from "@/components/admin/ui";

const ENQUIRIES_KEY = ["admin", "visa-enquiries", "list"] as const;
const PAGE_SIZE = 5;

type Tab = "all" | VisaEnquiryStatus;

const TABS: { label: string; value: Tab }[] = [
  { label: "All", value: "all" },
  ...VISA_STATUSES.map((s) => ({ label: VISA_STATUS_LABELS[s], value: s as Tab })),
];

/**
 * Visa queries — the design's queue screen: filter pills with live counts, an
 * enquiry-type select, a 54px-row table and an explanatory empty state. Text
 * search comes from the shell's top-bar field (`?q=`).
 */
export default function AdminVisaQueriesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();

  const { data, isLoading, isError } = useQuery({
    queryKey: ENQUIRIES_KEY,
    queryFn: listVisaEnquiries,
  });

  const [tab, setTab] = useState<Tab>("all");
  const [visaType, setVisaType] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const all = useMemo(() => data ?? [], [data]);

  const visaTypes = useMemo(
    () => Array.from(new Set(all.map((e) => e.visa_type))).sort(),
    [all]
  );

  const searched = useMemo(
    () =>
      all.filter(
        (e) =>
          !q ||
          `${e.first_name} ${e.last_name} ${e.email} ${e.reference_number} ${e.visa_type}`
            .toLowerCase()
            .includes(q)
      ),
    [all, q]
  );

  // Counts respect the search and the type filter but not the status filter, so
  // switching status never hides what sits behind the other chips.
  const counts = useMemo(() => {
    const base = searched.filter(
      (e) => visaType === "all" || e.visa_type === visaType
    );
    const out: Record<string, number> = { all: base.length };
    for (const s of VISA_STATUSES) {
      out[s] = base.filter((e) => e.status === s).length;
    }
    return out;
  }, [searched, visaType]);

  const rows = useMemo(
    () =>
      searched.filter(
        (e) =>
          (tab === "all" || e.status === tab) &&
          (visaType === "all" || e.visa_type === visaType)
      ),
    [searched, tab, visaType]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(PAGE_SIZE);
  }, [tab, visaType, q]);

  const visible = rows.slice(0, limit);
  const remaining = Math.max(0, rows.length - limit);

  return (
    <Screen>
      <PageHead
        title="Visa queries"
        intro="Enquiries submitted from the public website. Nobody needs an account to send one, so treat contact details as unverified."
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
          <label className="flex items-center gap-2">
            <span className="text-ink-600 text-[11.5px] font-medium whitespace-nowrap">
              Visa type
            </span>
            <select
              value={visaType}
              onChange={(e) => setVisaType(e.target.value)}
              className={cn(
                "border-line-field text-ink-800 h-[34px] cursor-pointer rounded-full border bg-white pr-8 pl-3.5 text-[12.5px] font-medium outline-none",
                focusRing
              )}
            >
              <option value="all">All types</option>
              {visaTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load visa enquiries"
            body="If this is a fresh setup, run APPLY_VISA_ENQUIRIES.sql in the Supabase SQL editor first, then reload this page."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              all.length === 0
                ? "No visa enquiries yet"
                : "No enquiries match these filters"
            }
            body={
              all.length === 0
                ? "Applications submitted through the website's Dubai visa form appear here the moment they arrive."
                : "Clear the status or visa-type filter to widen the list."
            }
            action={
              all.length === 0 ? undefined : (
                <Btn
                  onClick={() => {
                    setTab("all");
                    setVisaType("all");
                  }}
                >
                  Clear all filters
                </Btn>
              )
            }
          />
        ) : (
          <>
            <TableScroll>
              <Table min={940}>
                <Thead>
                  <Th>Reference</Th>
                  <Th>Name</Th>
                  <Th>Visa type</Th>
                  <Th>Received</Th>
                  <Th>Status</Th>
                  <Th align="right" />
                </Thead>
                <tbody>
                  {visible.map((e) => (
                    <Tr
                      key={e.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/visa-queries/${e.id}`)}
                    >
                      <Td className="text-marine-600 text-[13px] font-semibold tabular-nums">
                        {e.reference_number}
                      </Td>
                      <Td className="text-[13.5px] font-medium">
                        {e.first_name} {e.last_name}
                      </Td>
                      <Td>{e.visa_type}</Td>
                      <Td className="text-ink-600 text-[13px]">
                        {fmtStamp(e.created_at)}
                      </Td>
                      <Td>
                        <Pill>{VISA_STATUS_LABELS[e.status]}</Pill>
                      </Td>
                      <Td align="right" onClick={(ev) => ev.stopPropagation()}>
                        <ViewButton href={`/admin/visa-queries/${e.id}`} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <TableFoot
              shown={visible.length}
              total={rows.length}
              noun="enquiries"
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
