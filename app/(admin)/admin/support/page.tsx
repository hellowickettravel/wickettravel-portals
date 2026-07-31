"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, CheckCircle2, RotateCcw, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { UserCell } from "@/components/admin/user-cell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/portal/skeletons";
import {
  listAllSupportTickets,
  setSupportTicketStatus,
} from "@/lib/actions/support";
import { ADMIN_SUPPORT_TICKETS_KEY } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = ["All", "Open", "Resolved"] as const;
type Tab = (typeof TABS)[number];

const SUBMITTERS = [
  { label: "Everyone", value: "all" },
  { label: "Customers", value: "customer" },
  { label: "Team", value: "employee" },
] as const;
type Submitter = (typeof SUBMITTERS)[number]["value"];

const selectClass =
  "h-10 rounded-control border border-input bg-card px-3 text-base text-foreground outline-none transition-colors focus-visible:border-ocean focus-visible:ring-[3px] focus-visible:ring-ocean/25 sm:text-sm";

export default function AdminSupportPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("All");
  const [submitter, setSubmitter] = useState<Submitter>("all");
  const [query, setQuery] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ADMIN_SUPPORT_TICKETS_KEY,
    queryFn: listAllSupportTickets,
  });
  const tickets = useMemo(() => data ?? [], [data]);

  // Realtime: new/updated tickets refresh the queue live.
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () =>
          queryClient.invalidateQueries({ queryKey: ADMIN_SUPPORT_TICKETS_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const statusMutation = useMutation({
    mutationFn: setSupportTicketStatus,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't update ticket", { description: res.error });
        return;
      }
      toast.success("Ticket updated");
      queryClient.invalidateQueries({ queryKey: ADMIN_SUPPORT_TICKETS_KEY });
    },
    onError: () =>
      toast.error("Couldn't update ticket", { description: "Please try again." }),
  });

  const openCount = tickets.filter((t) => t.status === "open").length;

  // Name shown/searched for a ticket depends on who raised it.
  const submitterName = (t: (typeof tickets)[number]) =>
    t.submitter_role === "customer"
      ? t.customer?.full_name || "Customer"
      : t.employee?.full_name || "Employee";

  // Live counts per status tab (respecting the submitter + search filters, so
  // the numbers always match what a tab would actually show).
  const preTab = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      const matchesSubmitter =
        submitter === "all" ? true : t.submitter_role === submitter;
      const matchesQuery =
        !q ||
        [t.subject, t.message, submitterName(t)]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchesSubmitter && matchesQuery;
    });
    // submitterName is a stable pure helper; tickets/submitter/query drive this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, submitter, query]);

  const tabCounts: Record<Tab, number> = {
    All: preTab.length,
    Open: preTab.filter((t) => t.status === "open").length,
    Resolved: preTab.filter((t) => t.status === "resolved").length,
  };

  const visible = useMemo(
    () =>
      preTab.filter((t) =>
        tab === "All" ? true : t.status === tab.toLowerCase()
      ),
    [preTab, tab]
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Support"
        title="Support Queries"
        subtitle="Issues raised by your team and customers — triage and resolve."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex items-center gap-1 rounded-surface bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-control px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === t
                  ? "bg-ocean text-tx-invert"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
              <span
                className={cn(
                  "rounded-chip px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  tab === t
                    ? "bg-ocean-foreground/20 text-tx-invert"
                    : "bg-card text-muted-foreground"
                )}
              >
                {tabCounts[t]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="order-last text-sm text-muted-foreground sm:order-first">
            <span className="font-semibold text-foreground">{openCount}</span> open
          </p>
          <select
            aria-label="Filter by who raised the ticket"
            value={submitter}
            onChange={(e) => setSubmitter(e.target.value as Submitter)}
            className={cn(selectClass, "w-full sm:w-40")}
          >
            {SUBMITTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search support tickets by subject, message or name"
              placeholder="Search subject, message or name…"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <SectionCard flush>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} columns={4} />
          </div>
        ) : isError ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Couldn’t load tickets. Refresh to try again.
          </p>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-surface bg-sky-tint text-ocean-deep">
              <LifeBuoy className="size-6" />
            </div>
            <p className="tracking-heading text-base font-semibold text-foreground">
              No support tickets
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              When an employee or customer raises a query from their Support
              page, it lands here.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            No tickets match your filters.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((t) => {
              const resolved = t.status === "resolved";
              const busy =
                statusMutation.isPending &&
                statusMutation.variables?.id === t.id;
              return (
                <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {t.subject}
                      </p>
                      <StatusBadge tone={resolved ? "green" : "gold"}>
                        {resolved ? "Resolved" : "Open"}
                      </StatusBadge>
                      <StatusBadge
                        tone={t.submitter_role === "customer" ? "violet" : "slate"}
                      >
                        {t.submitter_role === "customer" ? "Customer" : "Employee"}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {t.message}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <UserCell
                        name={
                          t.submitter_role === "customer"
                            ? t.customer?.full_name || "Customer"
                            : t.employee?.full_name || "Employee"
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        · {fmtRelative(t.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        statusMutation.mutate({
                          id: t.id,
                          status: resolved ? "open" : "resolved",
                        })
                      }
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : resolved ? (
                        <RotateCcw className="size-4" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      {resolved ? "Reopen" : "Mark resolved"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
