"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plane,
  ChevronDown,
  Calendar,
  Users,
  Ticket,
  UserRound,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  CUSTOMER_ORDERS,
  customerStatusTone,
} from "@/lib/mock/customer";
import { gbp } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const [openId, setOpenId] = useState<string | null>(CUSTOMER_ORDERS[0]?.id ?? null);
  const orders = CUSTOMER_ORDERS;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Bookings"
        title="My Orders"
        subtitle="Every quote and booking you've made with Wicket."
      />

      {orders.length === 0 ? (
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
          {orders.map((o) => {
            const open = openId === o.id;
            return (
              <div
                key={o.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : o.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-soft"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chip text-brand-dark">
                    <Plane className="size-5 -rotate-45" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold text-navy">
                      {o.from} → {o.to}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.fromCity} – {o.toCity} · {o.departDate}
                      {o.returnDate ? ` → ${o.returnDate}` : ""}
                    </p>
                  </div>
                  <div className="hidden items-center gap-4 sm:flex">
                    {o.price ? (
                      <span className="font-display text-sm font-semibold text-foreground">
                        {gbp(o.price)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No quote yet</span>
                    )}
                    <StatusBadge tone={customerStatusTone(o.status)}>
                      {o.status}
                    </StatusBadge>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </button>

                {/* Mobile status row */}
                <div className="flex items-center justify-between px-5 pb-3 sm:hidden">
                  {o.price ? (
                    <span className="font-display text-sm font-semibold text-foreground">
                      {gbp(o.price)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No quote yet</span>
                  )}
                  <StatusBadge tone={customerStatusTone(o.status)}>
                    {o.status}
                  </StatusBadge>
                </div>

                {/* Detail panel */}
                {open ? (
                  <div className="border-t border-border bg-neutral-soft/60 px-5 py-5">
                    <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                      <DetailRow icon={Ticket} label="Reference" value={o.reference} />
                      <DetailRow icon={Plane} label="Trip type" value={o.tripType} />
                      <DetailRow icon={Calendar} label="Departure" value={o.departDate} />
                      <DetailRow icon={Calendar} label="Return" value={o.returnDate ?? "—"} />
                      <DetailRow icon={Users} label="Passengers" value={`${o.pax}`} />
                      <DetailRow icon={UserRound} label="Cabin" value={o.cabin} />
                      <DetailRow icon={UserRound} label="Your agent" value={o.agent} />
                      <DetailRow
                        icon={Ticket}
                        label="Total price"
                        value={o.price ? gbp(o.price) : "Awaiting quote"}
                      />
                    </div>
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
