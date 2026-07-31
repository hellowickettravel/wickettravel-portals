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
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { FareStub } from "@/components/portal/fare-stub";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FlightDetailsCard,
  PreOrderNoteCard,
} from "@/components/orders/order-record";
import { OrderInbox } from "@/components/orders/order-inbox";
import { updateOrder, setOrderStatus, assignOrder } from "@/lib/actions/admin";
import type { OrderWithRelations, OrderStatus, Profile } from "@/lib/db/types";
import type { SignedOrderAttachment } from "@/lib/db/order-messages";
import { cabinLabel } from "@/lib/orders/form";
import { gbp, fmtDate, routeCode, routeLabel } from "@/lib/format";

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
      <span className="text-[14.5px] text-tx-muted">{label}</span>
      <span className="text-right text-[14.5px] font-semibold text-tx-head">
        {value}
      </span>
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

  const fareMeta = [
    { label: "Departs", value: fmtDate(order.travel_date) },
    {
      label: "Returns",
      value: order.return_date ? fmtDate(order.return_date) : "One way",
    },
    { label: "Cabin", value: cabinLabel(order.cabin_class) },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded-chip text-[14.5px] font-semibold text-ocean underline-offset-[3px] outline-none transition-colors duration-150 ease-brand hover:text-ocean-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>

        {/* Header — the order's identity and everything you can do to it. */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-[19px] font-medium tracking-[0.01em] text-tx-head">
                {order.order_number}
              </p>
              <OrderStatusBadge status={order.status} />
            </div>
            <h1 className="mt-2 text-[25px] leading-[1.26] font-bold tracking-heading text-tx-head sm:text-[32px] sm:leading-[1.16] sm:tracking-[-0.015em]">
              {order.customer?.name ?? "Unknown customer"}
            </h1>
            <p className="mt-2 text-[14.5px] text-tx-muted">
              Created {fmtDate(order.created_at)} by {createdByLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil />
              Edit
            </Button>

            {order.status !== "completed" && order.status !== "cancelled" ? (
              <>
                <Button
                  onClick={() => changeStatus("completed")}
                  disabled={busy === "status"}
                >
                  {busy === "status" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <CheckCircle2 />
                  )}
                  Mark as completed
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setCancelOpen(true)}
                  disabled={busy === "status"}
                >
                  <XCircle />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => changeStatus("in_progress")}
                disabled={busy === "status"}
              >
                {busy === "status" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RotateCcw />
                )}
                Reopen
              </Button>
            )}
          </div>
        </div>

        {/* The booking itself, as the signature fare stub. One per screen. */}
        <FareStub
          from={routeCode(order.route_from)}
          to={routeCode(order.route_to)}
          caption={routeLabel(order.route_from, order.route_to)}
          meta={fareMeta}
          fare={
            order.selling_price != null ? (
              gbp(order.selling_price)
            ) : (
              /* A 27px flame em dash reads as a mistake. Say what's true. */
              <span className="text-[19px] font-semibold text-tx-muted">
                Not priced
              </span>
            )
          }
          fareLabel="Sells for"
          fareNote={
            order.commission != null
              ? `${gbp(order.commission)} commission`
              : undefined
          }
        />
      </div>

      {/* items-start: the record card sizes to its own content instead of
          stretching to match the three cards stacked beside it. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Flight details (full Chunk 1 record) */}
        <FlightDetailsCard order={order} />

        <div className="space-y-5">
          {/* Pricing */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-line-faint">
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
                    order.commission != null ? (
                      <span className="text-gold">{gbp(order.commission)}</span>
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-line-faint">
                <DataRow
                  label="Name"
                  value={
                    order.customer?.id ? (
                      <Link
                        href={`/admin/customers/${order.customer.id}`}
                        className="rounded-chip text-ocean underline-offset-[3px] outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
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
                        className="inline-flex items-center gap-1.5 rounded-chip text-ocean underline-offset-[3px] outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
                      >
                        <MessageSquare className="size-4" />
                        View chat
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Attribution */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-line-faint">
                <DataRow label="Created by" value={createdByLabel} />
                <DataRow label="Created" value={fmtDate(order.created_at)} />
                <DataRow
                  label="Completed"
                  value={order.closed_at ? fmtDate(order.closed_at) : "—"}
                />
              </div>
              <div className="mt-4 border-t border-line-faint pt-4">
                <Label htmlFor="assign-employee">Assigned employee</Label>
                <div className="mt-2 flex items-center gap-3">
                  <NativeSelect
                    id="assign-employee"
                    value={assignId}
                    onChange={(e) => setAssignId(e.target.value)}
                    disabled={busy === "assign"}
                    className="w-full"
                  >
                    <option value="">— Unassigned —</option>
                    {activeEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name || emp.email || emp.id}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button
                    variant="secondary"
                    onClick={saveAssignment}
                    disabled={busy === "assign" || !assignmentDirty}
                  >
                    {busy === "assign" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PreOrderNoteCard note={order.customer_note} attachments={attachments} />

      {order.notes ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Internal notes</CardTitle>
            <CardDescription>Not visible to the customer.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-[14.5px] leading-[1.6] text-tx-body">
              {order.notes}
            </p>
          </CardContent>
        </Card>
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
            <DialogTitle>Edit order</DialogTitle>
            <DialogDescription>
              Update trip and pricing details. Customer can&apos;t be changed here.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveEdit}>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2">
                <Field label="From" htmlFor="eo-from" required>
                  <Input
                    id="eo-from"
                    value={routeFrom}
                    onChange={(e) => setRouteFrom(e.target.value)}
                    placeholder="London (LHR)"
                    required
                    disabled={busy === "edit"}
                  />
                </Field>
                <Field label="To" htmlFor="eo-to" required>
                  <Input
                    id="eo-to"
                    value={routeTo}
                    onChange={(e) => setRouteTo(e.target.value)}
                    placeholder="Dubai (DXB)"
                    required
                    disabled={busy === "edit"}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2">
                <Field label="Travel date" htmlFor="eo-travel">
                  <Input
                    id="eo-travel"
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    disabled={busy === "edit"}
                  />
                </Field>
                <Field label="Return date" htmlFor="eo-return">
                  <Input
                    id="eo-return"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    disabled={busy === "edit"}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2">
                <Field label="Passengers" htmlFor="eo-pax">
                  <Input
                    id="eo-pax"
                    type="number"
                    min={1}
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    disabled={busy === "edit"}
                  />
                </Field>
                <Field label="Selling price (£)" htmlFor="eo-sell">
                  <Input
                    id="eo-sell"
                    type="number"
                    min={0}
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0.00"
                    disabled={busy === "edit"}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2">
                <Field label="Cost price (£)" htmlFor="eo-cost">
                  <Input
                    id="eo-cost"
                    type="number"
                    min={0}
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    disabled={busy === "edit"}
                  />
                </Field>
                <Field label="Commission (£)" htmlFor="eo-comm">
                  <Input
                    id="eo-comm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="0.00"
                    disabled={busy === "edit"}
                  />
                </Field>
              </div>

              <Field
                label="Internal notes"
                htmlFor="eo-notes"
                hint="Only the team sees these."
              >
                <Textarea
                  id="eo-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={busy === "edit"}
                />
              </Field>
            </FieldGroup>

            <DialogFooter className="mt-8">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditOpen(false)}
                disabled={busy === "edit"}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy === "edit"}>
                {busy === "edit" ? (
                  <>
                    <Loader2 className="animate-spin" />
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
