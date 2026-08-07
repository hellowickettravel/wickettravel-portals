"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Stamp, Eye, ChevronRight, Mail, Phone, MessageCircle } from "lucide-react";
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
import { listVisaEnquiries } from "@/lib/actions/visa";
import {
  VISA_STATUSES,
  VISA_STATUS_LABELS,
  VISA_STATUS_TONE,
  type PreferredContactMethod,
  type VisaEnquiryStatus,
} from "@/lib/visa";
import { useListControls } from "@/lib/hooks/use-list-controls";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const ENQUIRIES_KEY = ["admin", "visa-enquiries", "list"] as const;
const PAGE_SIZE = 12;

const selectClass =
  "border-line-field text-ink-800 focus:border-marine-500 focus:shadow-[0_0_0_3px_var(--color-marine-200)] h-10 w-full cursor-pointer rounded-[10px] border bg-white px-3.5 text-[13.5px] font-normal outline-none transition-[border-color,box-shadow] duration-[130ms] disabled:opacity-50";

const STATUS_TABS: { label: string; value: "all" | VisaEnquiryStatus }[] = [
  { label: "All", value: "all" },
  ...VISA_STATUSES.map((s) => ({ label: VISA_STATUS_LABELS[s], value: s })),
];

const CONTACT_META: Record<
  PreferredContactMethod,
  { label: string; Icon: typeof Mail }
> = {
  email: { label: "Email", Icon: Mail },
  phone: { label: "Call", Icon: Phone },
  whatsapp: { label: "WhatsApp", Icon: MessageCircle },
};

export default function AdminVisaQueriesPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ENQUIRIES_KEY,
    queryFn: listVisaEnquiries,
  });

  const [statusTab, setStatusTab] = useState<"all" | VisaEnquiryStatus>("all");
  const [visaType, setVisaType] = useState("all");

  const all = useMemo(() => data ?? [], [data]);

  // Distinct visa types actually submitted → the type filter's options.
  const visaTypes = useMemo(
    () => Array.from(new Set(all.map((e) => e.visa_type))).sort(),
    [all]
  );

  const narrowed = useMemo(
    () =>
      all.filter(
        (e) =>
          (statusTab === "all" || e.status === statusTab) &&
          (visaType === "all" || e.visa_type === visaType)
      ),
    [all, statusTab, visaType]
  );

  // Rows arrive newest-first from the server; search narrows by applicant
  // name, email or #VQ reference.
  const { query, setQuery, visible, total, hasMore, loadMore } = useListControls(
    narrowed,
    PAGE_SIZE,
    (e, q) =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.reference_number.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Enquiries"
        title="Visa Queries"
        subtitle="Dubai visa applications submitted from the website."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusTab(t.value)}
              className={cn(
                "flex h-[34px] shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap outline-none transition-colors",
                statusTab === t.value
                  ? "border-ink-800 bg-ink-800 text-white"
                  : "border-line-field text-ink-800 hover:bg-surface-1 bg-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            aria-label="Filter by visa type"
            value={visaType}
            onChange={(e) => setVisaType(e.target.value)}
            className={cn(selectClass, "w-full sm:w-48")}
          >
            <option value="all">All visa types</option>
            {visaTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-600" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search visa enquiries by name, email or reference"
              placeholder="Search name, email or reference…"
              className="h-10 rounded-[10px] bg-white pl-9"
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
          <p className="px-6 py-10 text-center text-sm text-ink-600">
            Couldn’t load visa enquiries. If this is a fresh setup, run
            APPLY_VISA_ENQUIRIES.sql in the Supabase SQL editor first.
          </p>
        ) : all.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-[12px] bg-marine-tint text-marine-600">
              <Stamp className="size-6" />
            </div>
            <p className="font-poppins text-base font-semibold text-ink-800">
              No visa enquiries yet
            </p>
            <p className="max-w-sm text-sm text-ink-600">
              Applications submitted through the website’s Dubai visa form will
              appear here the moment they arrive.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 p-4 md:hidden">
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-600">
                  No enquiries match your filters.
                </p>
              ) : (
                visible.map((e) => {
                  const contact = CONTACT_META[e.preferred_contact_method];
                  return (
                    <Link
                      key={e.id}
                      href={`/admin/visa-queries/${e.id}`}
                      className="block"
                    >
                      <MobileRecordCard
                        title={
                          <span className="text-ink-900">
                            {e.first_name} {e.last_name}
                          </span>
                        }
                        subtitle={e.reference_number}
                        action={
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-marine-600">
                            View
                            <ChevronRight className="size-4" />
                          </span>
                        }
                        badge={
                          <StatusBadge tone={VISA_STATUS_TONE[e.status]}>
                            {VISA_STATUS_LABELS[e.status]}
                          </StatusBadge>
                        }
                        fields={[
                          { label: "Visa type", value: e.visa_type },
                          { label: "Prefers", value: contact.label },
                          {
                            label: "Submitted",
                            value: fmtDate(e.created_at),
                            wide: true,
                          },
                        ]}
                      />
                    </Link>
                  );
                })
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Reference</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Visa type</TableHead>
                    <TableHead>Prefers</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((e) => {
                    const contact = CONTACT_META[e.preferred_contact_method];
                    return (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/admin/visa-queries/${e.id}`)}
                      >
                        <TableCell className="pl-6 font-medium tabular-nums text-ink-900">
                          {e.reference_number}
                        </TableCell>
                        <TableCell>
                          <span className="block font-medium text-ink-800">
                            {e.first_name} {e.last_name}
                          </span>
                          <span className="block text-xs text-ink-600">
                            {e.email}
                          </span>
                        </TableCell>
                        <TableCell className="text-ink-600">
                          {e.visa_type}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm text-ink-600">
                            <contact.Icon className="size-4 text-marine-600" />
                            {contact.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-ink-600">
                          {fmtDate(e.created_at)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={VISA_STATUS_TONE[e.status]}>
                            {VISA_STATUS_LABELS[e.status]}
                          </StatusBadge>
                        </TableCell>
                        <TableCell
                          className="pr-6 text-right"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <Link
                            href={`/admin/visa-queries/${e.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line-base bg-white px-3 py-1.5 text-sm font-medium text-ink-800 transition-colors hover:border-marine-500 hover:text-marine-600"
                          >
                            <Eye className="size-4" />
                            View
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-ink-600"
                      >
                        No enquiries match your filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {hasMore ? (
              <div className="flex justify-center border-t border-line-base p-4">
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
