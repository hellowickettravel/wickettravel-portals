"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plane,
  ChevronDown,
  Calendar,
  Users,
  Ticket,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/portal/skeletons";
import { createClient } from "@/lib/supabase/client";
import { listMyCustomerOrders } from "@/lib/actions/customer";
import { CUSTOMER_ORDERS_KEY } from "@/lib/query-keys";
import type { OrderStatus } from "@/lib/db/types";
import { gbp, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  new: "blue",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Received",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Plane;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-4 text-slate-400" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function CustomerOrdersPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const { data: orders, isLoading } = useQuery({
    queryKey: CUSTOMER_ORDERS_KEY,
    queryFn: listMyCustomerOrders,
  });
  const [openId, setOpenId] = useState<string | null>(null);

  // Realtime: a staff quote/price/status change refetches live (RLS scopes the
  // refetch to the caller's own orders).
  useEffect(() => {
    const channel = supabase
      .channel("customer-orders-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => queryClient.invalidateQueries({ queryKey: CUSTOMER_ORDERS_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const rows = orders ?? [];

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <PageHeader
        eyebrow="Bookings"
        title="My Orders"
        subtitle="Every quote and booking you've made with Wicket."
      />

      {isLoading ? (
        <SectionCard flush>
          <div className="p-4">
            <TableSkeleton rows={4} columns={4} />
          </div>
        </SectionCard>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center shadow-card">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
            <Plane className="size-6 -rotate-45" />
          </div>
          <p className="font-display text-base font-semibold text-foreground">
            No orders yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Request a quote and your bookings will show up here.
          </p>
          <Button render={<Link href="/customer/book" />} className="mt-1">
            Book a Flight
            <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((o) => {
            const open = openId === o.id;
            return (
              <div
                key={o.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : o.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left outline-none transition-colors hover:bg-neutral-soft focus-visible:bg-neutral-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chip text-brand-dark">
                    <Plane className="size-5 -rotate-45" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold text-navy">
                      {o.route_from ?? "?"} → {o.route_to ?? "?"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fmtDate(o.travel_date)}
                      {o.return_date ? ` → ${fmtDate(o.return_date)}` : ""}
                    </p>
                  </div>
                  <div className="hidden items-center gap-4 sm:flex">
                    {o.selling_price != null ? (
                      <span className="font-display text-sm font-semibold text-foreground">
                        {gbp(o.selling_price)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No quote yet</span>
                    )}
                    <StatusBadge tone={ORDER_TONE[o.status]}>
                      {STATUS_LABEL[o.status]}
                    </StatusBadge>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </button>

                <div className="flex items-center justify-between px-5 pb-3 sm:hidden">
                  {o.selling_price != null ? (
                    <span className="font-display text-sm font-semibold text-foreground">
                      {gbp(o.selling_price)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No quote yet</span>
                  )}
                  <StatusBadge tone={ORDER_TONE[o.status]}>
                    {STATUS_LABEL[o.status]}
                  </StatusBadge>
                </div>

                {open ? (
                  <div className="border-t border-border bg-neutral-soft/60 px-5 py-5">
                    <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                      <DetailRow icon={Calendar} label="Departure" value={fmtDate(o.travel_date)} />
                      <DetailRow icon={Calendar} label="Return" value={o.return_date ? fmtDate(o.return_date) : "—"} />
                      <DetailRow icon={Users} label="Passengers" value={`${o.passengers ?? 1}`} />
                      <DetailRow
                        icon={Ticket}
                        label="Total price"
                        value={o.selling_price != null ? gbp(o.selling_price) : "Awaiting quote"}
                      />
                    </div>
                    {o.notes ? (
                      <p className="mt-4 rounded-lg bg-white p-3 text-sm text-muted-foreground">
                        {o.notes}
                      </p>
                    ) : null}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button
                        render={<Link href="/customer/messages" />}
                        variant="outline"
                        size="sm"
                      >
                        Message team
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
