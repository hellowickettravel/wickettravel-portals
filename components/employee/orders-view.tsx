"use client";

import { Plus, MoreHorizontal, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, orderTone } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MY_ORDERS } from "@/lib/mock/employee";
import { type AccessLevel, isReadOnly } from "@/lib/access";
import { gbp } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EmployeeOrders({ accessLevel }: { accessLevel: AccessLevel }) {
  const readOnly = isReadOnly(accessLevel);

  const myOpen = MY_ORDERS.filter(
    (o) => o.status === "Open" || o.status === "In Progress"
  ).length;
  const myCommission = MY_ORDERS.reduce((s, o) => s + o.commission, 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="My work"
        title="My Orders"
        subtitle="Bookings assigned to you."
        actions={
          readOnly ? undefined : (
            <Button
              onClick={() =>
                toast.success("New order", {
                  description: "UI only — the order form lands here later.",
                })
              }
            >
              <Plus className="size-4" />
              New Order
            </Button>
          )
        }
      />

      {/* Personal totals (NOT company-wide) */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-1 shadow-card sm:grid-cols-3">
        {[
          { label: "My orders", value: String(MY_ORDERS.length) },
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Travel date</TableHead>
              <TableHead className="text-center">Pax</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MY_ORDERS.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="pl-6 font-medium text-navy">{o.id}</TableCell>
                <TableCell>{o.customer}</TableCell>
                <TableCell className="font-medium text-muted-foreground">{o.from} → {o.to}</TableCell>
                <TableCell className="text-muted-foreground">{o.date}</TableCell>
                <TableCell className="text-center tabular-nums">{o.pax}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{gbp(o.price)}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600">{gbp(o.commission)}</TableCell>
                <TableCell>
                  <StatusBadge tone={orderTone(o.status)}>{o.status}</StatusBadge>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger aria-label={`Actions for order ${o.id}`} className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-brand/25">
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem className="cursor-pointer">
                        <Eye className="size-4" />
                        View
                      </DropdownMenuItem>
                      {!readOnly ? (
                        <DropdownMenuItem className="cursor-pointer">
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {readOnly ? (
        <p className="text-center text-xs text-muted-foreground">
          You have read-only access — viewing is allowed, editing is disabled.
        </p>
      ) : null}
    </div>
  );
}
