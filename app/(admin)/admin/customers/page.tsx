"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Contact, Download, Eye, ChevronRight } from "lucide-react";
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
import { listCustomersWithStats } from "@/lib/actions/admin";
import { useListControls } from "@/lib/hooks/use-list-controls";
import { downloadCsv } from "@/lib/csv";
import { fmtDate } from "@/lib/format";

const CUSTOMERS_KEY = ["admin", "customers", "list"] as const;
const PAGE_SIZE = 12;

export default function AdminCustomersPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: listCustomersWithStats,
  });

  const all = data ?? [];
  const { query, setQuery, visible, total, hasMore, loadMore } = useListControls(
    all,
    PAGE_SIZE,
    (c, q) =>
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.wa_phone ?? "").toLowerCase().includes(q)
  );

  function exportCsv() {
    downloadCsv(
      "customers.csv",
      ["Name", "WhatsApp", "Has account", "Orders", "Conversations", "Created"],
      all.map((c) => [
        c.name ?? "",
        c.wa_phone ?? "",
        c.profile_id ? "Yes" : "No",
        c.orderCount,
        c.conversationCount,
        fmtDate(c.created_at),
      ])
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="People"
        title="Customers"
        subtitle="Everyone who's booked or messaged Wicket."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={all.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      <div className="relative sm:w-80">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone…"
          className="h-10 rounded-[10px] bg-card pl-9"
        />
      </div>

      <SectionCard flush>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={5} />
          </div>
        ) : isError ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Couldn’t load customers. Refresh to try again.
          </p>
        ) : all.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
              <Contact className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              No customers yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Customers appear here once they sign up or message in.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 p-4 md:hidden">
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No customers match your search.
                </p>
              ) : (
                visible.map((c) => (
                  <Link key={c.id} href={`/admin/customers/${c.id}`} className="block">
                    <MobileRecordCard
                      title={<span className="text-navy">{c.name || "Unnamed"}</span>}
                      subtitle={c.wa_phone ?? "No phone"}
                      action={
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-brand">
                          View
                          <ChevronRight className="size-4" />
                        </span>
                      }
                      badge={
                        <StatusBadge tone={c.profile_id ? "green" : "slate"}>
                          {c.profile_id ? "Account" : "Lead"}
                        </StatusBadge>
                      }
                      fields={[
                        { label: "Orders", value: c.orderCount },
                        { label: "Chats", value: c.conversationCount },
                        { label: "Created", value: fmtDate(c.created_at), wide: true },
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
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-center">Conversations</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="pr-6 text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/customers/${c.id}`)}
                    >
                      <TableCell className="pl-6 font-medium text-navy">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="hover:text-brand"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.name || "Unnamed"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.wa_phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={c.profile_id ? "green" : "slate"}>
                          {c.profile_id ? "Account" : "Lead"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {c.orderCount}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {c.conversationCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(c.created_at)}
                      </TableCell>
                      <TableCell
                        className="pr-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
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
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No customers match your search.
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
