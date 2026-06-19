"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { UserCell } from "@/components/admin/user-cell";
import { Button } from "@/components/ui/button";
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

export default function AdminSupportPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("All");

  const { data, isLoading, isError } = useQuery({
    queryKey: ADMIN_SUPPORT_TICKETS_KEY,
    queryFn: listAllSupportTickets,
  });
  const tickets = data ?? [];

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
  const visible = tickets.filter((t) =>
    tab === "All" ? true : t.status === tab.toLowerCase()
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Support"
        title="Support Queries"
        subtitle="Issues raised by your team — triage and resolve."
      />

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === t
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{openCount}</span> open
        </p>
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
            <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
              <LifeBuoy className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              No support tickets
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              When an employee raises an issue from their Support page, it lands
              here.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            No {tab.toLowerCase()} tickets.
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
                      <StatusBadge tone={resolved ? "green" : "amber"}>
                        {resolved ? "Resolved" : "Open"}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {t.message}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <UserCell name={t.employee?.full_name || "Employee"} />
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
