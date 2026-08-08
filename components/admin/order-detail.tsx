"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ConfirmSheet,
  Sheet,
  SheetFoot,
  SheetHead,
} from "@/components/admin/sheet";
import { BoardingPass } from "@/components/admin/boarding-pass";
import { OrderThread } from "@/components/admin/order-thread";
import {
  BackLink,
  Btn,
  Card,
  CardHead,
  DataRow,
  FieldTile,
  Pill,
  focusRing,
  initialsOf,
  inputClass,
  textareaClass,
  type PillTone,
} from "@/components/admin/ui";
import {
  ChatIcon,
  CheckCircleIcon,
  CloseIcon,
  DocumentIcon,
  DownloadDocIcon,
  EditIcon,
  Ico,
  RefreshIcon,
  StaffIcon,
  iconForField,
} from "@/components/admin/icons";
import { updateOrder, setOrderStatus, assignOrder } from "@/lib/actions/admin";
import type {
  OrderWithRelations,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Profile,
} from "@/lib/db/types";
import type { SignedOrderAttachment } from "@/lib/db/order-messages";
import type { CustomerSnapshot } from "@/lib/db/customers";
import {
  gbp,
  fmtDate,
  fmtFullDate,
  statusLabel,
  titleCase,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The order record, built to the Claude Design "Admin Portal All Pages" order
 * screen: back link → header (#ref + status + attribution + actions) → boarding
 * pass → a 2.4fr/1fr split with Flight details + the live Messages thread on the
 * left and Passengers / Pricing / Assign employee / Customer down the right.
 */

const PILL_TONE: Record<OrderStatus, PillTone> = {
  new: "marine",
  in_progress: "warn",
  completed: "ok",
  cancelled: "ink",
};

/** The design cycles its field tiles through this tint order. */
const TILE_TINTS = [
  "bg-marine-wash text-marine-600",
  "bg-warn-wash text-warn-ink",
  "bg-ok-wash text-ok-ink",
  "bg-teal-wash text-teal-ink",
  "bg-violet-wash text-violet-ink",
];

const selectClass =
  "border-line-field text-ink-800 h-10 w-full cursor-pointer rounded-[10px] border bg-white px-3.5 text-[13.5px] font-normal outline-none transition-[border-color,box-shadow] duration-[130ms] disabled:opacity-50";

type EditKey =
  | "routeFrom"
  | "routeTo"
  | "travelDate"
  | "returnDate"
  | "passengers"
  | "sellingPrice"
  | "costPrice"
  | "commission"
  | "airline"
  | "flightNumbers"
  | "budgetPerPerson"
  | "paymentMethod"
  | "paymentStatus";

type EditField = {
  key: EditKey;
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  /** Renders a select instead of an input. */
  options?: { value: string; label: string }[];
};

const EDIT_ROWS: EditField[][] = [
  [
    { key: "routeFrom", id: "eo-from", label: "From", required: true },
    { key: "routeTo", id: "eo-to", label: "To", required: true },
  ],
  [
    { key: "travelDate", id: "eo-travel", label: "Travel date", type: "date" },
    { key: "returnDate", id: "eo-return", label: "Return date", type: "date" },
  ],
  [
    { key: "passengers", id: "eo-pax", label: "Passengers", type: "number" },
    { key: "sellingPrice", id: "eo-sell", label: "Selling price (£)", type: "number" },
  ],
  [
    { key: "costPrice", id: "eo-cost", label: "Cost price (£)", type: "number" },
    { key: "commission", id: "eo-comm", label: "Commission (£)", type: "number" },
  ],
  // ----- the design's own fields, stored by migration 0021 -----
  [
    { key: "airline", id: "eo-airline", label: "Airline" },
    { key: "flightNumbers", id: "eo-flights", label: "Flight numbers" },
  ],
  [
    {
      key: "budgetPerPerson",
      id: "eo-budget",
      label: "Budget per person (£)",
      type: "number",
    },
    {
      key: "paymentMethod",
      id: "eo-paymethod",
      label: "Payment method",
      options: [
        { value: "", label: "Not recorded" },
        { value: "card", label: "Card" },
        { value: "bank_transfer", label: "Bank transfer" },
        { value: "cash", label: "Cash" },
        { value: "unpaid", label: "Not paid" },
      ],
    },
  ],
  [
    {
      key: "paymentStatus",
      id: "eo-paystatus",
      label: "Payment status",
      options: [
        { value: "", label: "Not recorded" },
        { value: "paid_in_full", label: "Paid in full" },
        { value: "deposit", label: "Deposit taken" },
        { value: "unpaid", label: "Awaiting payment" },
        { value: "refunded", label: "Refunded" },
      ],
    },
  ],
];

const CABIN_LABEL: Record<string, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "Card",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  unpaid: "Not paid",
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid_in_full: "paid in full",
  deposit: "deposit taken",
  unpaid: "awaiting payment",
  refunded: "refunded",
};

/** The design's Payment row: "Card · paid in full". */
function paymentLine(
  method: PaymentMethod | null | undefined,
  status: PaymentStatus | null | undefined
): string {
  const m = method ? PAYMENT_METHOD_LABEL[method] : null;
  const s = status ? PAYMENT_STATUS_LABEL[status] : null;
  if (m && s) return `${m} · ${s}`;
  return m ?? (s ? titleCase(s) : "Not recorded");
}

/** "2 adults · 1 child" — falls back to the legacy passenger count. */
function paxSummary(adults: number, children: number, passengers: number | null) {
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} adult${adults === 1 ? "" : "s"}`);
  if (children > 0)
    parts.push(`${children} child${children === 1 ? "" : "ren"}`);
  if (parts.length > 0) return parts.join(" · ");
  return passengers != null ? `${passengers}` : "—";
}

function parseNum(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** "Dubai Int'l (DXB)" → "DXB" for the boarding pass, "Dubai Int'l" beneath it. */
function splitPlace(value: string | null): { code: string; city: string } {
  if (!value) return { code: "—", city: "" };
  const m = value.match(/\(([A-Za-z]{3})\)\s*$/);
  if (m) return { code: m[1].toUpperCase(), city: value.slice(0, m.index).trim() };
  const bare = value.trim();
  if (/^[A-Za-z]{3}$/.test(bare)) return { code: bare.toUpperCase(), city: "" };
  return { code: bare.slice(0, 3).toUpperCase(), city: bare };
}

export function OrderDetail({
  order,
  employees,
  attachments,
  customer,
  currentUserId,
  currentUserName,
}: {
  order: OrderWithRelations;
  employees: Profile[];
  attachments: SignedOrderAttachment[];
  /** Email + lifetime summary for the design's Customer card. */
  customer: CustomerSnapshot | null;
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const assignTitleId = useId();
  const editTitleId = useId();
  const [busy, setBusy] = useState<null | "status" | "assign" | "edit">(null);

  const [edit, setEdit] = useState<Record<EditKey, string>>({
    routeFrom: order.route_from ?? "",
    routeTo: order.route_to ?? "",
    travelDate: order.travel_date ?? "",
    returnDate: order.return_date ?? "",
    passengers: order.passengers != null ? String(order.passengers) : "",
    sellingPrice: order.selling_price != null ? String(order.selling_price) : "",
    costPrice: order.cost_price != null ? String(order.cost_price) : "",
    commission: order.commission != null ? String(order.commission) : "",
    airline: order.airline ?? "",
    flightNumbers: order.flight_numbers ?? "",
    budgetPerPerson:
      order.budget_per_person != null ? String(order.budget_per_person) : "",
    paymentMethod: order.payment_method ?? "",
    paymentStatus: order.payment_status ?? "",
  });
  const [notes, setNotes] = useState(order.notes ?? "");

  const activeEmployees = employees.filter((e) => e.is_active);
  const [assignId, setAssignId] = useState(order.assigned_employee_id ?? "");

  const customerName = order.customer?.name ?? "Unknown customer";
  const createdByLabel = order.created_by
    ? (order.created_by_profile?.full_name ?? "Staff")
    : "Customer";
  const settled = order.status === "completed" || order.status === "cancelled";

  const from = splitPlace(order.route_from);
  const to = splitPlace(order.route_to);

  /** Staff sender_id → name, so the thread names people, not just their role. */
  const senderNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of employees) if (e.full_name) map[e.id] = e.full_name;
    if (order.created_by && order.created_by_profile?.full_name) {
      map[order.created_by] = order.created_by_profile.full_name;
    }
    if (currentUserName) map[currentUserId] = currentUserName;
    return map;
  }, [employees, order.created_by, order.created_by_profile, currentUserId, currentUserName]);

  /** The design's nine-tile Flight details grid, every value from the record. */
  const tripFields = useMemo(() => {
    const rows: { label: string; value: string; span?: string }[] = [
      {
        label: "Trip type",
        value: order.return_date
          ? "Return"
          : order.trip_type === "connection"
            ? "Connecting"
            : "One way",
      },
      {
        label: "Cabin",
        value: order.cabin_class
          ? (CABIN_LABEL[order.cabin_class] ?? titleCase(order.cabin_class))
          : "Not set",
      },
      { label: "Airline", value: order.airline?.trim() || "Any airline" },
      { label: "From", value: order.route_from ?? "—" },
      { label: "To", value: order.route_to ?? "—" },
      {
        label: "Departure",
        value: order.travel_date ? fmtFullDate(order.travel_date) : "To confirm",
      },
      {
        label: "Return",
        value: order.return_date ? fmtFullDate(order.return_date) : "One way",
      },
      {
        label: "Baggage",
        value: order.extra_luggage
          ? `${order.extra_luggage_kg ?? 23}kg extra requested`
          : "Standard allowance",
      },
      {
        // The design's ninth tile. Wheelchair and children's ages used to sit
        // here, but the Passengers card already carries both — per traveller,
        // which is where the design puts them too.
        label: "Budget",
        value:
          order.budget_per_person != null
            ? `${gbp(order.budget_per_person)} per person`
            : "Not given",
      },
    ];
    return rows;
  }, [order]);

  const paxNames = order.passenger_names ?? [];

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
    setAssignOpen(false);
    router.refresh();
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit.routeFrom.trim() || !edit.routeTo.trim()) {
      toast.error("Both From and To are required.");
      return;
    }
    setBusy("edit");
    const res = await updateOrder({
      id: order.id,
      routeFrom: edit.routeFrom,
      routeTo: edit.routeTo,
      travelDate: edit.travelDate || null,
      returnDate: edit.returnDate || null,
      passengers: parseNum(edit.passengers),
      sellingPrice: parseNum(edit.sellingPrice),
      costPrice: parseNum(edit.costPrice),
      commission: parseNum(edit.commission),
      notes: notes || null,
      airline: edit.airline || null,
      flightNumbers: edit.flightNumbers || null,
      budgetPerPerson: parseNum(edit.budgetPerPerson),
      paymentMethod: (edit.paymentMethod || null) as PaymentMethod | null,
      paymentStatus: (edit.paymentStatus || null) as PaymentStatus | null,
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
    <div className="flex max-w-[1240px] flex-col gap-6">
      <BackLink href="/admin/orders">All orders</BackLink>

      {/* ------------------------------------------------------ header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-poppins text-ink-700 m-0 text-[clamp(20px,1.5vw,24px)] leading-[1.5] font-medium tracking-[-0.02em] tabular-nums">
              {order.order_number}
            </h1>
            <Pill tone={PILL_TONE[order.status]} className="text-[11.5px]">
              {statusLabel(order.status)}
            </Pill>
          </div>
          <p className="text-ink-600 mt-1.5 text-[13.5px] font-normal">
            {customerName} · created by {createdByLabel} on{" "}
            {fmtDate(order.created_at)} ·{" "}
            {order.assigned_employee?.full_name
              ? `assigned to ${order.assigned_employee.full_name}`
              : "unassigned"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Btn onClick={() => setEditOpen(true)}>
            <EditIcon size={15} />
            Edit order
          </Btn>
          {order.conversation_id ? (
            <Btn
              as="link"
              href={`/admin/messages?c=${order.conversation_id}`}
            >
              <ChatIcon size={15} />
              Message customer
            </Btn>
          ) : null}
          {settled ? (
            <Btn
              variant="marine"
              onClick={() => changeStatus("in_progress")}
              disabled={busy === "status"}
            >
              <RefreshIcon size={15} />
              Reopen order
            </Btn>
          ) : (
            <>
              <Btn
                variant="danger"
                onClick={() => setCancelOpen(true)}
                disabled={busy === "status"}
              >
                <CloseIcon size={15} />
                Cancel
              </Btn>
              <Btn
                variant="marine"
                onClick={() => changeStatus("completed")}
                disabled={busy === "status"}
              >
                <CheckCircleIcon size={15} />
                {busy === "status" ? "Saving…" : "Mark complete"}
              </Btn>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ boarding pass */}
      {/* The design's pass names the carrier and its flight numbers. Until an
          order has them it falls back to the trip shape and the order ref, so
          the header is never blank. */}
      <BoardingPass
        carrier={
          order.airline?.trim() ||
          (order.return_date ? "Return flight" : "One way")
        }
        reference={order.flight_numbers?.trim() || order.order_number}
        fromCode={from.code}
        fromCity={from.city}
        toCode={to.code}
        toCity={to.city}
        departs={order.travel_date ? fmtDate(order.travel_date) : "Not set"}
        returns={order.return_date ? fmtDate(order.return_date) : "—"}
        cabin={
          order.cabin_class
            ? (CABIN_LABEL[order.cabin_class] ?? titleCase(order.cabin_class))
            : "Not set"
        }
        passengers={paxSummary(order.adults, order.children, order.passengers)}
        price={order.selling_price != null ? gbp(order.selling_price) : "—"}
        statusLabel={statusLabel(order.status)}
        statusTone={PILL_TONE[order.status]}
      />

      {/* ------------------------------------------------ the two columns */}
      <div className="grid grid-cols-1 items-stretch gap-4 min-[1100px]:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHead title="Flight details" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(184px,1fr))] gap-3 p-5">
              {tripFields.map((f, i) => (
                <FieldTile
                  key={f.label}
                  label={f.label}
                  value={f.value}
                  span={f.span}
                  chip={TILE_TINTS[i % TILE_TINTS.length]}
                  icon={<Ico name={iconForField(f.label)} size={18} />}
                />
              ))}
            </div>
          </Card>

          {order.customer_note || attachments.length > 0 ? (
            <Card>
              <CardHead
                title="What the customer sent"
                action={
                  attachments.length > 0 ? (
                    <span className="text-ink-600 text-[11.5px] font-normal">
                      {attachments.length} file
                      {attachments.length === 1 ? "" : "s"}
                    </span>
                  ) : undefined
                }
              />
              <div className="flex flex-col gap-3 p-5">
                {order.customer_note ? (
                  <p className="text-ink-700 m-0 text-[13px] leading-[1.6] font-normal whitespace-pre-wrap">
                    {order.customer_note}
                  </p>
                ) : null}
                {attachments.length > 0 ? (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
                    {attachments.map((a) => (
                      <a
                        key={a.id}
                        href={a.url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-line-hair flex min-w-0 items-center gap-3 rounded-[10px] border bg-white px-3.5 py-2.5 no-underline hover:no-underline"
                      >
                        <span className="bg-marine-tint text-marine-600 flex size-[30px] flex-none items-center justify-center rounded-[9px]">
                          <DocumentIcon size={15} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-ink-800 truncate text-[12.5px] font-medium">
                            {a.file_name ?? "Attachment"}
                          </span>
                          <span className="text-ink-500 text-[11px] font-normal">
                            {a.size_bytes
                              ? `${Math.max(1, Math.round(a.size_bytes / 1024))} KB`
                              : "File"}
                          </span>
                        </span>
                        <span className="text-marine-600 flex flex-none">
                          <DownloadDocIcon size={17} />
                        </span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <OrderThread
            orderId={order.id}
            orderNumber={order.order_number}
            customerName={customerName}
            senderNames={senderNames}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHead
              title="Passengers"
              className="px-[18px] py-[15px]"
              action={
                <span className="text-ink-600 text-[11.5px] font-normal">
                  {paxSummary(order.adults, order.children, order.passengers)}
                </span>
              }
            />
            {paxNames.length === 0 ? (
              <p className="text-ink-600 m-0 px-[18px] py-4 text-[12.5px] font-normal">
                No passenger names captured yet.
              </p>
            ) : (
              paxNames.map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="after:bg-line-soft relative flex gap-3 px-[18px] py-3 after:absolute after:inset-x-0 after:bottom-0 after:left-[60px] after:block after:h-px after:content-['']"
                >
                  <span className="bg-marine-tint text-marine-600 flex size-[30px] flex-none items-center justify-center rounded-full text-[11px] font-medium">
                    {initialsOf(name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-ink-800 text-[12.5px] font-medium">
                      {name}
                    </span>
                    <span className="text-ink-600 text-[11px] font-normal">
                      {i < order.adults
                        ? "Adult"
                        : `Child · age ${order.child_ages[i - order.adults] ?? "—"}`}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {order.wheelchair ? (
                        <Pill tone="marine" className="px-[9px] py-[3px] text-[10.5px]">
                          Wheelchair
                        </Pill>
                      ) : null}
                      {order.extra_luggage ? (
                        <Pill tone="warn" className="px-[9px] py-[3px] text-[10.5px]">
                          Extra luggage
                        </Pill>
                      ) : null}
                    </span>
                  </span>
                </div>
              ))
            )}
          </Card>

          <Card>
            <CardHead title="Pricing" />
            <div className="px-[18px] pt-2.5 pb-[18px]">
              {[
                {
                  label: "Net cost",
                  value: order.cost_price != null ? gbp(order.cost_price) : "—",
                },
                {
                  label: "Selling price",
                  value:
                    order.selling_price != null ? gbp(order.selling_price) : "—",
                },
                {
                  label: "Commission",
                  value: order.commission != null ? gbp(order.commission) : "—",
                },
                {
                  // The design's fourth row is Payment, not a margin — the
                  // margin is readable from the three figures above it.
                  label: "Payment",
                  value: paymentLine(order.payment_method, order.payment_status),
                },
              ].map((r) => (
                <div
                  key={r.label}
                  className="border-line-soft flex items-baseline justify-between gap-4 border-b py-[9px]"
                >
                  <span className="text-ink-600 text-[12.5px] font-normal">
                    {r.label}
                  </span>
                  {/* The design leaves these values uncoloured — inside the
                      Pricing card even commission is plain ink. */}
                  <span className="text-[13px] font-medium tabular-nums">
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHead title="Assign Employee" />
            <div className="flex flex-col gap-4 px-[18px] py-4">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-9 flex-none items-center justify-center rounded-full text-[12.5px] font-medium",
                    order.assigned_employee?.full_name
                      ? "bg-marine-500 text-white"
                      : "bg-neutral-bg text-ink-500"
                  )}
                >
                  {order.assigned_employee?.full_name
                    ? initialsOf(order.assigned_employee.full_name)
                    : "—"}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-ink-800 text-[13px] font-medium">
                    {order.assigned_employee?.full_name ?? "Unassigned"}
                  </span>
                  <span className="text-ink-600 text-[11.5px] font-normal">
                    {order.assigned_employee?.full_name
                      ? "Ticketing agent · owns this order"
                      : "Nobody is working this order yet"}
                  </span>
                </span>
              </div>
              <Btn onClick={() => setAssignOpen(true)} className="w-full">
                {order.assigned_employee?.full_name
                  ? "Reassign order"
                  : "Assign an employee"}
              </Btn>
            </div>
          </Card>

          <Card className="flex flex-1 flex-col">
            <CardHead title="Customer" />
            <div className="flex flex-1 flex-col px-[18px] pt-2.5 pb-[18px]">
              <DataRow label="Name" value={customerName} />
              <DataRow label="Email" value={customer?.email ?? "—"} />
              <DataRow label="Phone" value={order.customer?.wa_phone ?? "—"} />
              <DataRow
                label="Orders placed"
                value={
                  customer
                    ? `${customer.orderCount} · ${gbp(customer.lifetimeValue)} lifetime`
                    : "—"
                }
              />
              {order.customer?.id ? (
                <Btn
                  as="link"
                  href={`/admin/customers/${order.customer.id}`}
                  className="mt-auto w-full"
                >
                  View customer profile
                </Btn>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      {order.notes ? (
        <Card>
          <CardHead title="Internal notes" />
          <p className="text-ink-700 m-0 p-5 text-[13px] leading-[1.6] font-normal whitespace-pre-wrap">
            {order.notes}
          </p>
        </Card>
      ) : null}

      {/* -------------------------------------------------- assign dialog */}
      <Sheet
        open={assignOpen}
        onClose={() => busy !== "assign" && setAssignOpen(false)}
        labelledBy={assignTitleId}
        width={460}
      >
        <SheetHead
          icon={<StaffIcon size={20} />}
          title="Assign this order"
          subtitle="The employee sees the order and its thread the moment you save."
          titleId={assignTitleId}
          onClose={() => busy !== "assign" && setAssignOpen(false)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <select
            value={assignId}
            onChange={(e) => setAssignId(e.target.value)}
            disabled={busy === "assign"}
            aria-label="Assigned employee"
            className={cn(selectClass, focusRing)}
          >
            <option value="">— Unassigned —</option>
            {activeEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name || emp.email || emp.id}
              </option>
            ))}
          </select>
        </div>
        <SheetFoot>
          <Btn onClick={() => setAssignOpen(false)} disabled={busy === "assign"}>
            Cancel
          </Btn>
          <Btn
            variant="marine"
            onClick={saveAssignment}
            disabled={busy === "assign"}
          >
            {busy === "assign" ? "Saving…" : "Save assignment"}
          </Btn>
        </SheetFoot>
      </Sheet>

      {/* ---------------------------------------------------- edit dialog */}
      <Sheet
        open={editOpen}
        onClose={() => busy !== "edit" && setEditOpen(false)}
        labelledBy={editTitleId}
        width={620}
      >
        <SheetHead
          icon={<EditIcon size={20} />}
          title="Edit order"
          subtitle="Update trip and pricing details. The customer cannot be changed here."
          titleId={editTitleId}
          onClose={() => busy !== "edit" && setEditOpen(false)}
        />
        <form
          id="edit-order-form"
          onSubmit={saveEdit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
        >
            {EDIT_ROWS.map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-4">
                {row.map((f) => (
                  <div key={f.id} className="flex min-w-0 flex-col gap-2">
                    <label
                      htmlFor={f.id}
                      className="text-ink-700 text-[11.5px] font-medium"
                    >
                      {f.label}
                    </label>
                    {f.options ? (
                      <select
                        id={f.id}
                        value={edit[f.key]}
                        disabled={busy === "edit"}
                        onChange={(e) =>
                          setEdit((s) => ({ ...s, [f.key]: e.target.value }))
                        }
                        className={cn(selectClass, focusRing)}
                      >
                        {f.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={f.id}
                        type={f.type ?? "text"}
                        value={edit[f.key]}
                        required={f.required}
                        disabled={busy === "edit"}
                        onChange={(e) =>
                          setEdit((s) => ({ ...s, [f.key]: e.target.value }))
                        }
                        className={cn(inputClass, focusRing)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="eo-notes"
                className="text-ink-700 text-[11.5px] font-medium"
              >
                Internal notes
              </label>
              <textarea
                id="eo-notes"
                rows={3}
                value={notes}
                disabled={busy === "edit"}
                onChange={(e) => setNotes(e.target.value)}
                className={cn(textareaClass, focusRing)}
              />
            </div>

        </form>
        <SheetFoot>
          <Btn
            type="button"
            onClick={() => setEditOpen(false)}
            disabled={busy === "edit"}
          >
            Cancel
          </Btn>
          <Btn
            type="submit"
            form="edit-order-form"
            variant="ember"
            disabled={busy === "edit"}
          >
            {busy === "edit" ? "Saving…" : "Save changes"}
          </Btn>
        </SheetFoot>
      </Sheet>

      <ConfirmSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => changeStatus("cancelled")}
        destructive
        icon={<CloseIcon size={20} />}
        title="Cancel this order?"
        body="The order is marked as cancelled and drops out of revenue. The customer can no longer message on it, and you can reopen it later."
        confirmLabel="Cancel order"
        cancelLabel="Keep it open"
      />
    </div>
  );
}
