"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, ShoppingBag, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
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
import { CreateOrderDialog } from "@/components/employee/create-order-dialog";
import { listMyOrders } from "@/lib/actions/employee";
import { listMyInbox } from "@/lib/actions/employee";
import { MY_ORDERS_KEY, MY_INBOX_KEY } from "@/lib/query-keys";
import type { OrderStatus } from "@/lib/db/types";
import { type AccessLevel, isReadOnly } from "@/lib/access";
import { gbp, fmtDate, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  new: "blue",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};

export function EmployeeOrders({ accessLevel }: { accessLevel: AccessLevel }) {
  const router = useRouter();
  const readOnly = isReadOnly(accessLevel);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: MY_ORDERS_KEY,
    queryFn: listMyOrders,
  });

  // Conversations the employee can file an order against (the picker source).
  const { data: inbox } = useQuery({
    queryKey: MY_INBOX_KEY,
    queryFn: listMyInbox,
    enabled: !readOnly,
  });

  const rows = orders ?? [];
  const myOpen = rows.filter(
    (o) => o.status === "new" || o.status === "in_progress"
  ).length;
  const myCommission = rows.reduce((s, o) => s + (o.commission ?? 0), 0);

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <PageHeader
        eyebrow="My work"
        title="My Orders"
        subtitle="Bookings you created or tied to your chats."
        actions={
          readOnly ? undefined : (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New Order
            </Button>
          )
        }
      />

      {/* Personal totals (NOT company-wide) */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-1 shadow-card sm:grid-cols-3">
        {[
          { label: "My orders", value: String(rows.length) },
          { label: "My open", value: String(myOpen) },
          { label: "My commission", value: gbp(myCommission) },
        ].map((t, i) => (
          <div key={t.label} className={cn("px-5 py-4", i > 0 && "sm:border-l sm:border-border")}>
            <p className="font-label text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t.label}
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">{t.value}</p>
          </div>
        ))}
      </div>

      <SectionCard flush>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} columns={7} />
          </div>
        ) : isError ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Couldn’t load your orders. Refresh to try again.
          </p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
              <ShoppingBag className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              No orders yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Orders are born from chats — open a conversation and click “Create
              order”, or use New Order to pick one.
            </p>
            {!readOnly ? (
              <Button className="mt-2" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                New Order
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards (no horizontal scroll). Whole card opens the
                order detail; the chevron is the explicit "View" affordance. */}
            <div className="space-y-3 p-4 md:hidden">
              {rows.map((o) => (
                <Link
                  key={o.id}
                  href={`/employee/orders/${o.id}`}
                  className="block transition-opacity active:opacity-70"
                  aria-label={`View order for ${o.customer?.name ?? "customer"}`}
                >
                <MobileRecordCard
                  title={<span className="text-navy">{o.customer?.name ?? "—"}</span>}
                  badge={
                    <StatusBadge tone={ORDER_TONE[o.status]}>
                      {titleCase(o.status)}
                    </StatusBadge>
                  }
                  action={<ChevronRight className="size-4 text-muted-foreground" />}
                  fields={[
                    {
                      label: "Route",
                      value: `${o.route_from ?? "?"} → ${o.route_to ?? "?"}`,
                      wide: true,
                    },
                    { label: "Travel date", value: fmtDate(o.travel_date) },
                    { label: "Pax", value: o.passengers ?? "—" },
                    {
                      label: "Price",
                      value: o.selling_price != null ? gbp(o.selling_price) : "—",
                    },
                    {
                      label: "Commission",
                      value: (
                        <span className="text-emerald-600">
                          {o.commission != null ? gbp(o.commission) : "—"}
                        </span>
                      ),
                    },
                  ]}
                />
                </Link>
              ))}
            </div>

            {/* Desktop: full table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Customer</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Travel date</TableHead>
                    <TableHead className="text-center">Pax</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((o) => (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/employee/orders/${o.id}`)}
                    >
                      <TableCell className="pl-6 font-medium text-navy">
                        {o.customer?.name ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">
                        {o.route_from ?? "?"} → {o.route_to ?? "?"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(o.travel_date)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {o.passengers ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {o.selling_price != null ? gbp(o.selling_price) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600">
                        {o.commission != null ? gbp(o.commission) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={ORDER_TONE[o.status]}>
                          {titleCase(o.status)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Link
                          href={`/employee/orders/${o.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
                        >
                          View
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </SectionCard>

      {readOnly ? (
        <p className="text-center text-xs text-muted-foreground">
          You have read-only access — viewing is allowed, editing is disabled.
        </p>
      ) : (
        <CreateOrderDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          conversations={inbox ?? []}
        />
      )}
    </div>
  );
}
