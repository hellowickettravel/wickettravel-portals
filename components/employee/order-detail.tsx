"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  MessageSquare,
  Plane,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateEmployeeOrder,
  setEmployeeOrderStatus,
} from "@/lib/actions/employee";
import type { OrderWithRelations, OrderStatus } from "@/lib/db/types";
import { gbp, fmtDate, titleCase } from "@/lib/format";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  open: "blue",
  closed: "green",
  cancelled: "red",
};

function fieldLabel(text: string) {
  return (
    <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
      {text}
    </span>
  );
}

function parseNum(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

/**
 * Employee order detail. Mirrors the admin order detail, but:
 *   - EDIT + STATUS controls render ONLY when `canEdit` (access_level === 'semi_admin').
 *     For full / view_only / chat_only the page is read-only.
 *   - No assignment control (employees don't reassign orders) and created_by
 *     can't be changed.
 * The server actions independently re-check semi_admin + visibility (and RLS
 * gates the write), so a non-semi_admin can't write even if the UI is bypassed.
 */
export function EmployeeOrderDetail({
  order,
  canEdit,
}: {
  order: OrderWithRelations;
  canEdit: boolean;
}) {
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState<null | "status" | "edit">(null);

  // Edit form
  const [routeFrom, setRouteFrom] = useState(order.route_from ?? "");
  const [routeTo, setRouteTo] = useState(order.route_to ?? "");
  const [travelDate, setTravelDate] = useState(order.travel_date ?? "");
  const [returnDate, setReturnDate] = useState(order.return_date ?? "");
  const [passengers, setPassengers] = useState(
    order.passengers != null ? String(order.passengers) : ""
  );
  const [sellingPrice, setSellingPrice] = useState(
    order.selling_price != null ? String(order.selling_price) : ""
  );
  const [costPrice, setCostPrice] = useState(
    order.cost_price != null ? String(order.cost_price) : ""
  );
  const [commission, setCommission] = useState(
    order.commission != null ? String(order.commission) : ""
  );
  const [notes, setNotes] = useState(order.notes ?? "");

  const createdByLabel = order.created_by
    ? order.created_by_profile?.full_name ?? "Staff"
    : "Customer";

  async function changeStatus(status: OrderStatus) {
    setBusy("status");
    const res = await setEmployeeOrderStatus({ id: order.id, status });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't update status", { description: res.error });
      return;
    }
    toast.success(
      status === "closed"
        ? "Order closed"
        : status === "cancelled"
          ? "Order cancelled"
          : "Order reopened"
    );
    router.refresh();
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!routeFrom.trim() || !routeTo.trim()) {
      toast.error("Both From and To are required.");
      return;
    }
    setBusy("edit");
    const res = await updateEmployeeOrder({
      id: order.id,
      routeFrom,
      routeTo,
      travelDate: travelDate || null,
      returnDate: returnDate || null,
      passengers: parseNum(passengers),
      sellingPrice: parseNum(sellingPrice),
      costPrice: parseNum(costPrice),
      commission: parseNum(commission),
      notes: notes || null,
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't save order", { description: res.error });
      return;
    }
    toast.success("Order updated");
    setEditOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Link
        href="/employee/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
      >
        <ArrowLeft className="size-4" />
        Back to orders
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chip text-brand-dark">
            <Plane className="size-5 -rotate-45" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <p className="font-display text-lg font-semibold text-navy">
                Order #{order.id.slice(0, 8)}
              </p>
              <StatusBadge tone={ORDER_TONE[order.status]}>
                {titleCase(order.status)}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              {order.route_from ?? "—"} → {order.route_to ?? "—"} ·{" "}
              {order.customer?.name ?? "Unknown customer"}
            </p>
          </div>
        </div>

        {/* EDIT + STATUS controls — semi_admin only. */}
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>

            {order.status === "open" ? (
              <>
                <Button
                  size="sm"
                  onClick={() => changeStatus("closed")}
                  disabled={busy === "status"}
                >
                  {busy === "status" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Mark as closed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-300 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                  onClick={() => setCancelOpen(true)}
                  disabled={busy === "status"}
                >
                  <XCircle className="size-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => changeStatus("open")}
                disabled={busy === "status"}
              >
                {busy === "status" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                Reopen
              </Button>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 self-start rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:self-auto">
            <Lock className="size-3.5" />
            View only
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Trip details */}
        <SectionCard title="Trip details">
          <div className="divide-y divide-border">
            <DataRow
              label="Route"
              value={`${order.route_from ?? "—"} → ${order.route_to ?? "—"}`}
            />
            <DataRow label="Travel date" value={fmtDate(order.travel_date)} />
            <DataRow
              label="Return date"
              value={order.return_date ? fmtDate(order.return_date) : "—"}
            />
            <DataRow label="Passengers" value={order.passengers ?? "—"} />
          </div>
        </SectionCard>

        {/* Pricing */}
        <SectionCard title="Pricing">
          <div className="divide-y divide-border">
            <DataRow
              label="Selling price"
              value={order.selling_price != null ? gbp(order.selling_price) : "—"}
            />
            <DataRow
              label="Cost price"
              value={order.cost_price != null ? gbp(order.cost_price) : "—"}
            />
            <DataRow
              label="Commission"
              value={
                <span className="text-emerald-600">
                  {order.commission != null ? gbp(order.commission) : "—"}
                </span>
              }
            />
          </div>
        </SectionCard>

        {/* Customer */}
        <SectionCard title="Customer">
          <div className="divide-y divide-border">
            <DataRow label="Name" value={order.customer?.name ?? "—"} />
            <DataRow label="WhatsApp" value={order.customer?.wa_phone ?? "—"} />
            <DataRow
              label="Conversation"
              value={
                order.conversation_id ? (
                  <Link
                    href={`/employee/messages?c=${order.conversation_id}`}
                    className="inline-flex items-center gap-1 text-brand hover:text-brand-dark"
                  >
                    <MessageSquare className="size-3.5" />
                    View chat
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </div>
        </SectionCard>

        {/* Attribution */}
        <SectionCard title="Attribution">
          <div className="divide-y divide-border">
            <DataRow label="Created by" value={createdByLabel} />
            <DataRow label="Created" value={fmtDate(order.created_at)} />
            <DataRow
              label="Closed"
              value={order.closed_at ? fmtDate(order.closed_at) : "—"}
            />
          </div>
        </SectionCard>
      </div>

      {order.notes ? (
        <SectionCard title="Notes">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {order.notes}
          </p>
        </SectionCard>
      ) : null}

      {/* Edit dialog (semi_admin only — never mounted otherwise) */}
      {canEdit ? (
        <>
          <Dialog open={editOpen} onOpenChange={(o) => busy !== "edit" && setEditOpen(o)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Edit order</DialogTitle>
                <DialogDescription>
                  Update trip and pricing details. Customer can&apos;t be changed here.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={saveEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eeo-from">{fieldLabel("From")}</Label>
                    <Input
                      id="eeo-from"
                      value={routeFrom}
                      onChange={(e) => setRouteFrom(e.target.value)}
                      required
                      disabled={busy === "edit"}
                      className="h-10 rounded-[10px] bg-neutral-soft"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eeo-to">{fieldLabel("To")}</Label>
                    <Input
                      id="eeo-to"
                      value={routeTo}
                      onChange={(e) => setRouteTo(e.target.value)}
                      required
                      disabled={busy === "edit"}
                      className="h-10 rounded-[10px] bg-neutral-soft"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eeo-travel">{fieldLabel("Travel date")}</Label>
                    <Input
                      id="eeo-travel"
                      type="date"
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                      disabled={busy === "edit"}
                      className="h-10 rounded-[10px] bg-neutral-soft"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eeo-return">{fieldLabel("Return date")}</Label>
                    <Input
                      id="eeo-return"
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      disabled={busy === "edit"}
                      className="h-10 rounded-[10px] bg-neutral-soft"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eeo-pax">{fieldLabel("Passengers")}</Label>
                    <Input
                      id="eeo-pax"
                      type="number"
                      min={1}
                      value={passengers}
                      onChange={(e) => setPassengers(e.target.value)}
                      disabled={busy === "edit"}
                      className="h-10 rounded-[10px] bg-neutral-soft"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eeo-sell">{fieldLabel("Selling price (£)")}</Label>
                    <Input
                      id="eeo-sell"
                      type="number"
                      min={0}
                      step="0.01"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="0.00"
                      disabled={busy === "edit"}
                      className="h-10 rounded-[10px] bg-neutral-soft"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eeo-cost">{fieldLabel("Cost price (£)")}</Label>
                    <Input
                      id="eeo-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="0.00"
                      disabled={busy === "edit"}
                      className="h-10 rounded-[10px] bg-neutral-soft"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eeo-comm">{fieldLabel("Commission (£)")}</Label>
                    <Input
                      id="eeo-comm"
                      type="number"
                      min={0}
                      step="0.01"
                      value={commission}
                      onChange={(e) => setCommission(e.target.value)}
                      placeholder="0.00"
                      disabled={busy === "edit"}
                      className="h-10 rounded-[10px] bg-neutral-soft"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eeo-notes">{fieldLabel("Notes")}</Label>
                  <Textarea
                    id="eeo-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    disabled={busy === "edit"}
                    className="rounded-[10px] bg-neutral-soft"
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditOpen(false)}
                    disabled={busy === "edit"}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy === "edit"}>
                    {busy === "edit" ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Cancel confirmation */}
          <ConfirmDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            title="Cancel this order?"
            description="The order will be marked as cancelled and excluded from revenue. You can reopen it later."
            confirmLabel="Cancel order"
            destructive
            onConfirm={() => changeStatus("cancelled")}
          />
        </>
      ) : null}
    </div>
  );
}
