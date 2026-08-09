"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { listVerifications } from "@/lib/actions/parents-marketplace";
import {
  VERIFICATION_STATUSES,
  VERIFICATION_STATUS_LABELS,
  ID_DOCUMENT_TYPE_LABELS,
  type VerificationStatus,
} from "@/lib/parents-marketplace";
import { fmtRelative } from "@/lib/format";
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
  type PillTone,
} from "@/components/admin/ui";

const KEY = ["admin", "parent-verifications"] as const;
const PAGE_SIZE = 8;

const TONE: Record<VerificationStatus, PillTone> = {
  unverified: "ink",
  pending_review: "warn",
  verified: "ok",
  rejected: "danger",
};

type Tab = "all" | VerificationStatus;

const TABS: { label: string; value: Tab }[] = [
  { label: "All", value: "all" },
  ...VERIFICATION_STATUSES.map((s) => ({
    label: VERIFICATION_STATUS_LABELS[s],
    value: s as Tab,
  })),
];

/**
 * The Parents Tickets verification queue. Ordering is by last activity rather
 * than by status: an admin working this screen wants whatever moved most
 * recently, and the "Awaiting review" tab is one click away for the actual
 * work queue.
 */
export default function AdminParentsVerificationPage() {
  const router = useRouter();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: KEY,
    queryFn: listVerifications,
  });

  const [tab, setTab] = useState<Tab>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Live: someone submitting for review lands here without a reload.
  useEffect(() => {
    const channel = supabase
      .channel("admin-parent-verifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parent_ticket_identities" },
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
        (v) =>
          !q ||
          `${v.legal_name ?? ""} ${v.profile?.full_name ?? ""} ${
            v.profile?.email ?? ""
          } ${v.phone ?? ""}`
            .toLowerCase()
            .includes(q)
      ),
    [all, q]
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: searched.length };
    for (const s of VERIFICATION_STATUSES) {
      out[s] = searched.filter((v) => v.verification_status === s).length;
    }
    return out;
  }, [searched]);

  const rows = useMemo(
    () => searched.filter((v) => tab === "all" || v.verification_status === tab),
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
        title="Verifications"
        intro="Identity checks for Parents Tickets. Every traveller and every family is reviewed by hand before their listing can be approved or matched."
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
            title="Couldn't load verifications"
            body={`If this is a fresh setup, run APPLY_PARENTS_FULLSCOPE_0.sql in the Supabase SQL editor first, then reload. (${
              error instanceof Error ? error.message : "Unknown error"
            })`}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              all.length === 0
                ? "Nobody has started verification yet"
                : "No records match these filters"
            }
            body={
              all.length === 0
                ? "When a customer opens Get verified in their portal, their record appears here — and moves to Awaiting review once they send it."
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
              <Table min={900}>
                <Thead>
                  <Th>Person</Th>
                  <Th>Name on document</Th>
                  <Th>Document</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Last activity</Th>
                  <Th align="right" />
                </Thead>
                <tbody>
                  {visible.map((v) => (
                    <Tr
                      key={v.profile_id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/parents-verification/${v.profile_id}`)
                      }
                    >
                      <Td>
                        <span className="flex items-center gap-3">
                          <Avatar
                            name={v.profile?.full_name ?? v.legal_name ?? "?"}
                            size={30}
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="text-[13px] font-medium">
                              {v.profile?.full_name ?? v.legal_name ?? "Unnamed"}
                            </span>
                            <span className="text-ink-500 text-[11.5px] font-normal">
                              {v.profile?.email ?? "—"}
                            </span>
                          </span>
                        </span>
                      </Td>
                      <Td className="text-[13.5px] font-medium">
                        {v.legal_name ?? "—"}
                      </Td>
                      <Td className="text-ink-600 text-[13px]">
                        {v.id_document_path
                          ? v.id_document_type
                            ? ID_DOCUMENT_TYPE_LABELS[v.id_document_type]
                            : "Uploaded"
                          : "Not uploaded"}
                      </Td>
                      <Td>
                        {v.email_verified ? (
                          <Pill tone="ok">Confirmed</Pill>
                        ) : (
                          <Pill tone="warn">Unconfirmed</Pill>
                        )}
                      </Td>
                      <Td>
                        <Pill tone={TONE[v.verification_status]}>
                          {VERIFICATION_STATUS_LABELS[v.verification_status]}
                        </Pill>
                      </Td>
                      <Td className="text-ink-600 text-[13px]">
                        {fmtRelative(v.updated_at)}
                      </Td>
                      <Td align="right" onClick={(ev) => ev.stopPropagation()}>
                        <ViewButton
                          href={`/admin/parents-verification/${v.profile_id}`}
                        />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <TableFoot
              shown={visible.length}
              total={rows.length}
              noun="records"
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
