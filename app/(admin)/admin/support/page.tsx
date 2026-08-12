"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listAllSupportTickets,
  setSupportTicketStatus,
} from "@/lib/actions/support";
import { ADMIN_SUPPORT_TICKETS_KEY } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import { fmtStamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Btn,
  Card,
  EmptyState,
  PageHead,
  Pill,
  Screen,
  TableSkeleton,
  focusRing,
} from "@/components/admin/ui";
import { ChatIcon, CheckIcon, RefreshIcon } from "@/components/admin/icons";
import { SupportThread } from "@/components/admin/support-thread";

const TABS = ["All", "Open", "Resolved"] as const;
type Tab = (typeof TABS)[number];

const SUBMITTERS = [
  { label: "Everyone", value: "all" },
  { label: "Customers", value: "customer" },
  { label: "Helpers", value: "helper" },
  { label: "Team", value: "employee" },
] as const;
type Submitter = (typeof SUBMITTERS)[number]["value"];

/** A short, stable display reference derived from the ticket's real id. */
function ticketRef(id: string) {
  return `#SUP-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/**
 * Support — the design's ticket list: tickets raised by employees and
 * customers about the platform itself, filtered by state and by who raised
 * them, each row carrying its own status pill and resolve action.
 */
export default function AdminSupportPage() {
  const params = useSearchParams();
  const topSearch = (params.get("q") ?? "").trim().toLowerCase();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("All");
  const [submitter, setSubmitter] = useState<Submitter>("all");
  // Which ticket has its thread open. One at a time: the queue is a list, not
  // a set of accordions, and two open threads make it impossible to scan.
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

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

  // A helper's ticket lands in `customer_id` too — that column is the non-staff
  // submitter, not a `customers` row — so both read the same embed and only
  // `submitter_role` tells them apart.
  const submitterName = (t: (typeof tickets)[number]) =>
    t.submitter_role === "employee"
      ? t.employee?.full_name || "Employee"
      : t.customer?.full_name ||
        (t.submitter_role === "helper" ? "Helper" : "Customer");

  const submitterLabel = (role: string) =>
    role === "customer" ? "Customer" : role === "helper" ? "Helper" : "Employee";

  // Counts respect the submitter filter and the top-bar search, so a tab's
  // number always matches what selecting it would show.
  const preTab = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSubmitter =
        submitter === "all" ? true : t.submitter_role === submitter;
      const matchesQuery =
        !topSearch ||
        [t.subject, t.message, submitterName(t), ticketRef(t.id)]
          .join(" ")
          .toLowerCase()
          .includes(topSearch);
      return matchesSubmitter && matchesQuery;
    });
    // submitterName is a stable pure helper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, submitter, topSearch]);

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
    <Screen width={1240}>
      <PageHead
        title="Support"
        intro="Tickets raised by employees and customers about the platform itself."
      />

      <Card>
        <div className="border-line-soft flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={cn(
                  "inline-flex h-[34px] items-center gap-2 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap outline-none",
                  tab === t
                    ? "border-ink-800 bg-ink-800 text-white"
                    : "border-line-field text-ink-700 hover:bg-surface-1 bg-white"
                )}
              >
                {t}
                <span className="text-[11px] font-medium tabular-nums opacity-[0.66]">
                  {tabCounts[t]}
                </span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <span className="text-ink-600 text-[11.5px] font-medium whitespace-nowrap">
              Raised by
            </span>
            <select
              value={submitter}
              onChange={(e) => setSubmitter(e.target.value as Submitter)}
              className={cn(
                "border-line-field text-ink-800 h-[34px] cursor-pointer rounded-full border bg-white pr-8 pl-3.5 text-[12.5px] font-medium outline-none",
                focusRing
              )}
            >
              {SUBMITTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load tickets"
            body="Something went wrong reading the support queue. Refresh the page to try again."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={
              tickets.length === 0
                ? "No support tickets"
                : "No tickets match these filters"
            }
            body={
              tickets.length === 0
                ? "When an employee or customer raises a query from their Support page, it lands here."
                : "Clear the state or raised-by filter to see the rest of the queue."
            }
            action={
              tickets.length === 0 ? undefined : (
                <Btn
                  onClick={() => {
                    setTab("All");
                    setSubmitter("all");
                  }}
                >
                  Clear all filters
                </Btn>
              )
            }
          />
        ) : (
          visible.map((t) => {
            const resolved = t.status === "resolved";
            const busy =
              statusMutation.isPending && statusMutation.variables?.id === t.id;
            const open = replyingTo === t.id;
            return (
              <div
                key={t.id}
                className="border-line-soft flex flex-col gap-4 border-b px-5 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-start gap-4">
                  <span className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
                    <span className="block leading-[1.45]">
                      <span className="text-marine-600 mr-2.5 text-[12.5px] font-medium tabular-nums">
                        {ticketRef(t.id)}
                      </span>
                      <span className="text-ink-880 text-[13.5px] font-medium tracking-[-0.008em]">
                        {t.subject}
                      </span>
                    </span>
                    <span className="text-ink-600 text-[12.5px] leading-[1.55] font-normal whitespace-pre-wrap text-pretty">
                      {t.message}
                    </span>
                    <span className="text-ink-500 text-[11.5px] font-normal">
                      {submitterName(t)} ·{" "}
                      {submitterLabel(t.submitter_role)}{" "}
                      · {fmtStamp(t.created_at)}
                    </span>
                  </span>
                  <span className="flex flex-none flex-wrap items-center gap-3">
                    <Pill tone={resolved ? "ok" : "marine"}>
                      {resolved ? "Resolved" : "Open"}
                    </Pill>
                    {/* The control that was missing entirely: an answer, in
                        the portal, attached to the ticket. */}
                    <Btn
                      aria-expanded={open}
                      onClick={() => setReplyingTo(open ? null : t.id)}
                    >
                      <ChatIcon size={15} />
                      {open ? "Close thread" : "Reply"}
                    </Btn>
                    <Btn
                      pending={busy}
                      pendingLabel={resolved ? "Reopening…" : "Resolving…"}
                      onClick={() =>
                        statusMutation.mutate({
                          id: t.id,
                          status: resolved ? "open" : "resolved",
                        })
                      }
                    >
                      {resolved ? (
                        <RefreshIcon size={15} />
                      ) : (
                        <CheckIcon size={15} />
                      )}
                      {resolved ? "Reopen" : "Mark resolved"}
                    </Btn>
                  </span>
                </div>

                {open ? (
                  <div className="border-line-soft bg-surface-1 wt-fade-in rounded-[12px] border p-4">
                    <SupportThread ticketId={t.id} audience="admin" />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </Card>
    </Screen>
  );
}
