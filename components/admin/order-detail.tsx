"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  MessageSquare,
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
import { BoardingPass } from "@/components/admin/boarding-pass";
import { BackLink, type PillTone } from "@/components/admin/ui";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FlightDetailsCard,
  PreOrderNoteCard,
} from "@/components/orders/order-record";
import { OrderInbox } from "@/components/orders/order-inbox";
import { updateOrder, setOrderStatus, assignOrder } from "@/lib/actions/admin";
import type { OrderWithRelations, OrderStatus, Profile } from "@/lib/db/types";
import type { SignedOrderAttachment } from "@/lib/db/order-messages";
import { gbp, fmtDate, titleCase } from "@/lib/format";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  new: "blue",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};

const selectClass =
  "border-line-field text-ink-800 focus:border-marine-500 focus:shadow-[0_0_0_3px_var(--color-marine-200)] h-10 w-full cursor-pointer rounded-[10px] border bg-white px-3.5 text-[13.5px] font-normal outline-none transition-[border-color,box-shadow] duration-[130ms] disabled:opacity-50";

function fieldLabel(text: string) {
  return (
    <span className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
      {text}
    </span>
  );
}

/** Status → the design's pill tone, for the boarding-pass stub. */
const PILL_TONE: Record<OrderStatus, PillTone> = {
  new: "marine",
  in_progress: "warn",
  completed: "ok",
  cancelled: "ink",
};

/** "2 adults · 1 child" — falls back to the legacy passenger count. */
function paxSummary(
  adults: number,
  children: number,
  passengers: number | null
) {
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} adult${adults === 1 ? "" : "s"}`);
  if (children > 0) parts.push(`${children} child${children === 1 ? "" : "ren"}`);
  if (parts.length > 0) return parts.join(" · ");
  return passengers != null ? `${passengers}` : "—";
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
      <span className="text-sm text-ink-600">{label}</span>
      <span className="text-right text-sm font-medium text-ink-800">{value}</span>
    </div>
  );
}

export function OrderDetail({
  order,
  employees,
  attachments,
  currentUserId,
}: {
  order: OrderWithRelations;
  employees: Profile[];
  attachments: SignedOrderAttachment[];
  currentUserId: string;
}) {
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState<null | "status" | "assign" | "edit">(null);

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

  const activeEmployees = employees.filter((e) => e.is_active);
  const [assignId, setAssignId] = useState(order.assigned_employee_id ?? "");

  const createdByLabel = order.created_by
    ? order.created_by_profile?.full_name ?? "Staff"
    : "Customer";

  async function changeStatus(status: OrderStatus) {
    setBusy("status");
    const res = await setOrderStatus({ id: order.id, status });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't update status", { description: res.error });
      return;
    }
    toast.success(
      status === "completed"
        ? "Order completed"
        : status === "cancelled"
          ? "Order cancelled"
          : status === "in_progress"
            ? "Order reopened"
            : "Order status updated"
    );
    router.refresh();
  }

  async function saveAssignment() {
    setBusy("assign");
    const res = await assignOrder({ id: order.id, employeeId: assignId || null });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't assign", { description: res.error });
      return;
    }
    toast.success(assignId ? "Order assigned" : "Order unassigned");
    router.refresh();
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!routeFrom.trim() || !routeTo.trim()) {
      toast.error("Both From and To are required.");
      return;
    }
    setBusy("edit");
    const res = await updateOrder({
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

  const assignmentDirty = (assignId || null) !== (order.assigned_employee_id ?? null);

  return (
    <div className="flex max-w-[1240px] flex-col gap-6">
      <BackLink href="/admin/orders">All orders</BackLink>

      {/* Header — reference + status, attribution line, and the status control */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-poppins text-ink-900 m-0 text-[clamp(20px,1.5vw,24px)] leading-[1.25] font-medium tracking-[-0.02em] tabular-nums">
              {order.order_number}
            </h1>
            <StatusBadge tone={ORDER_TONE[order.status]}>
              {titleCase(order.status)}
            </StatusBadge>
          </div>
          <p className="text-ink-600 mt-1.5 text-[13.5px] font-normal">
            {order.customer?.name ?? "Unknown customer"} · created by{" "}
            {createdByLabel} on {fmtDate(order.created_at)} ·{" "}
            {order.assigned_employee?.full_name
              ? `assigned to ${order.assigned_employee.full_name}`
              : "unassigned"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>

          {order.status !== "completed" && order.status !== "cancelled" ? (
            <>
              <Button
                size="sm"
                onClick={() => changeStatus("completed")}
                disabled={busy === "status"}
              >
                {busy === "status" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Mark as completed
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-danger-line text-danger-ink hover:bg-danger-bg hover:text-danger-ink"
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
              onClick={() => changeStatus("in_progress")}
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
      </div>

      {/* The design leads the record with its boarding pass. */}
      <BoardingPass
        carrier={order.return_date ? "Return flight" : "One way"}
        reference={order.order_number}
        fromCode={order.route_from ?? "—"}
        toCode={order.route_to ?? "—"}
        departs={order.travel_date ? fmtDate(order.travel_date) : "Not set"}
        returns={order.return_date ? fmtDate(order.return_date) : "—"}
        cabin={order.cabin_class ? titleCase(order.cabin_class) : "Not set"}
        passengers={paxSummary(order.adults, order.children, order.passengers)}
        price={order.selling_price != null ? gbp(order.selling_price) : "—"}
        statusLabel={titleCase(order.status)}
        statusTone={PILL_TONE[order.status]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Flight details (full Chunk 1 record) */}
        <FlightDetailsCard order={order} />

        {/* Pricing */}
        <SectionCard title="Pricing">
          <div className="divide-y divide-line-soft">
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
          <div className="divide-y divide-line-soft">
            <DataRow
              label="Name"
              value={
                order.customer?.id ? (
                  <Link
                    href={`/admin/customers/${order.customer.id}`}
                    className="text-marine-600 hover:text-marine-600"
                  >
                    {order.customer.name || "View customer"}
                  </Link>
                ) : (
                  order.customer?.name ?? "—"
                )
              }
            />
            <DataRow label="Phone" value={order.customer?.wa_phone ?? "—"} />
            <DataRow
              label="Conversation"
              value={
                order.conversation_id ? (
                  <Link
                    href={`/admin/messages/${order.conversation_id}`}
                    className="inline-flex items-center gap-1 text-marine-600 hover:text-marine-600"
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
          <div className="divide-y divide-line-soft">
            <DataRow label="Created by" value={createdByLabel} />
            <DataRow label="Created" value={fmtDate(order.created_at)} />
            <DataRow
              label="Completed"
              value={order.closed_at ? fmtDate(order.closed_at) : "—"}
            />
            <div className="pt-3">
              {fieldLabel("Assigned employee")}
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={assignId}
                  onChange={(e) => setAssignId(e.target.value)}
                  disabled={busy === "assign"}
                  className={selectClass}
                >
                  <option value="">— Unassigned —</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name || emp.email || emp.id}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveAssignment}
                  disabled={busy === "assign" || !assignmentDirty}
                >
                  {busy === "assign" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <PreOrderNoteCard note={order.customer_note} attachments={attachments} />

      {order.notes ? (
        <SectionCard title="Internal notes">
          <p className="whitespace-pre-wrap text-sm text-ink-600">
            {order.notes}
          </p>
        </SectionCard>
      ) : null}

      <OrderInbox
        orderId={order.id}
        status={order.status}
        viewerRole="admin"
        currentUserId={currentUserId}
      />

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => busy !== "edit" && setEditOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-poppins">Edit order</DialogTitle>
            <DialogDescription>
              Update trip and pricing details. Customer can&apos;t be changed here.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eo-from">{fieldLabel("From")}</Label>
                <Input
                  id="eo-from"
                  value={routeFrom}
                  onChange={(e) => setRouteFrom(e.target.value)}
                  required
                  disabled={busy === "edit"}
                  className="h-10 rounded-[10px] bg-surface-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eo-to">{fieldLabel("To")}</Label>
                <Input
                  id="eo-to"
                  value={routeTo}
                  onChange={(e) => setRouteTo(e.target.value)}
                  required
                  disabled={busy === "edit"}
                  className="h-10 rounded-[10px] bg-surface-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eo-travel">{fieldLabel("Travel date")}</Label>
                <Input
                  id="eo-travel"
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  disabled={busy === "edit"}
                  className="h-10 rounded-[10px] bg-surface-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eo-return">{fieldLabel("Return date")}</Label>
                <Input
                  id="eo-return"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  disabled={busy === "edit"}
                  className="h-10 rounded-[10px] bg-surface-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eo-pax">{fieldLabel("Passengers")}</Label>
                <Input
                  id="eo-pax"
                  type="number"
                  min={1}
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                  disabled={busy === "edit"}
                  className="h-10 rounded-[10px] bg-surface-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eo-sell">{fieldLabel("Selling price (£)")}</Label>
                <Input
                  id="eo-sell"
                  type="number"
                  min={0}
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                  disabled={busy === "edit"}
                  className="h-10 rounded-[10px] bg-surface-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eo-cost">{fieldLabel("Cost price (£)")}</Label>
                <Input
                  id="eo-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  disabled={busy === "edit"}
                  className="h-10 rounded-[10px] bg-surface-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eo-comm">{fieldLabel("Commission (£)")}</Label>
                <Input
                  id="eo-comm"
                  type="number"
                  min={0}
                  step="0.01"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="0.00"
                  disabled={busy === "edit"}
                  className="h-10 rounded-[10px] bg-surface-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eo-notes">{fieldLabel("Notes")}</Label>
              <Textarea
                id="eo-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={busy === "edit"}
                className="rounded-[10px] bg-surface-1"
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
    </div>
  );
}
