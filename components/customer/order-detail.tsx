import Link from "next/link";
import type { Order, OrderStatus } from "@/lib/db/types";
import type { SignedOrderAttachment } from "@/lib/db/order-messages";
import { cabinLabel, tripTypeLabel } from "@/lib/orders/form";
import { paxSummary, splitPlace } from "@/lib/orders/display";
import {
  gbp,
  fmtDate,
  fmtFullDate,
  customerStatusLabel,
  titleCase,
} from "@/lib/format";
import { BoardingPass } from "@/components/admin/boarding-pass";
import { OrderThread } from "@/components/admin/order-thread";
import { ApproveOrder } from "@/components/customer/approve-order";
import {
  BackLink,
  Btn,
  Card,
  CardHead,
  FieldTile,
  MiniField,
  Pill,
  Screen,
  type PillTone,
} from "@/components/admin/ui";
import {
  ChatIcon,
  DocumentIcon,
  DownloadDocIcon,
  Ico,
  LifebuoyIcon,
  UserIcon,
  iconForField,
} from "@/components/admin/icons";

const PILL_TONE: Record<OrderStatus, PillTone> = {
  new: "marine",
  in_progress: "warn",
  completed: "ok",
  cancelled: "ink",
};

/** What the status means for the person waiting on it, in one line. */
const STATUS_LINE: Record<OrderStatus, string> = {
  new: "We have your request and a consultant is picking it up.",
  in_progress: "Our team is working on this — we'll message you as it moves.",
  completed: "Booked and ticketed. Your documents are in this thread.",
  cancelled: "This order was cancelled. Start a new booking any time.",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid_in_full: "Paid in full",
  deposit: "Deposit taken",
  unpaid: "Awaiting payment",
  refunded: "Refunded",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: "Card",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  unpaid: "Not paid",
};

/**
 * The traveller's view of one order, on the design's own order screen — the
 * boarding pass, the flight-detail tiles and the live thread that /admin and
 * /employee use, with the business's side of the record removed.
 *
 * There is no cost price, no commission and no assignment card here: those
 * belong to the company, not the buyer. There are no edit or status controls
 * either — a customer asks the team for a change, they don't make it
 * themselves, which is exactly what RLS enforces.
 */
export function CustomerOrderDetail({
  order,
  attachments,
  customerName,
}: {
  order: Order;
  attachments: SignedOrderAttachment[];
  customerName: string;
}) {
  const from = splitPlace(order.route_from);
  const to = splitPlace(order.route_to);
  const settled = order.status === "completed" || order.status === "cancelled";
  const quoted = order.selling_price != null;

  const tripFields = [
    { label: "Trip type", value: tripTypeLabel(order.trip_type) },
    { label: "Cabin", value: cabinLabel(order.cabin_class) },
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
      label: "Flight numbers",
      value: order.flight_numbers?.trim() || "Confirmed on ticketing",
    },
  ];

  const paxNames = order.passenger_names ?? [];
  const payment =
    order.payment_status || order.payment_method
      ? [
          order.payment_method
            ? (PAYMENT_METHOD_LABEL[order.payment_method] ??
              titleCase(order.payment_method))
            : null,
          order.payment_status
            ? (PAYMENT_STATUS_LABEL[order.payment_status] ??
              titleCase(order.payment_status))
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  const awaitingApproval =
    !!order.delivered_at &&
    order.status !== "completed" &&
    order.status !== "cancelled";

  return (
    <Screen width={1240}>
      <BackLink href="/customer/orders">All my orders</BackLink>

      {/* ------------------------------------------------------- header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-poppins text-ink-700 m-0 text-[clamp(20px,1.5vw,24px)] leading-[1.5] font-medium tracking-[-0.02em] tabular-nums">
              {order.order_number}
            </h1>
            <Pill tone={PILL_TONE[order.status]}>
              {customerStatusLabel(order.status)}
            </Pill>
          </div>
          <p className="text-ink-600 m-0 max-w-[68ch] text-[13.5px] font-normal text-pretty">
            {awaitingApproval
              ? "Your booking is confirmed and waiting for you to approve it."
              : STATUS_LINE[order.status]}{" "}
            Placed {fmtDate(order.created_at)}.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Btn as="link" href="/customer/support">
            <LifebuoyIcon size={15} />
            Get help
          </Btn>
          <Btn as="link" href="/customer/messages" variant="marine">
            <ChatIcon size={15} />
            Message the team
          </Btn>
        </div>
      </div>

      {awaitingApproval ? (
        <ApproveOrder orderId={order.id} deliveredAt={order.delivered_at!} />
      ) : null}

      {/* ------------------------------------------------ boarding pass */}
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
        cabin={cabinLabel(order.cabin_class)}
        passengers={paxSummary(order.adults, order.children, order.passengers)}
        price={quoted ? gbp(order.selling_price!) : "Awaiting quote"}
        priceLabel="Total price"
        statusLabel={customerStatusLabel(order.status)}
        statusTone={PILL_TONE[order.status]}
      />

      {/* ------------------------------------------------ the two columns */}
      <div className="grid grid-cols-1 items-stretch gap-4 min-[1100px]:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHead title="Flight details" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(184px,1fr))] gap-3 p-5">
              {tripFields.map((f) => (
                <FieldTile
                  key={f.label}
                  label={f.label}
                  value={f.value}
                  icon={<Ico name={iconForField(f.label)} size={17} />}
                />
              ))}
            </div>
          </Card>

          {order.customer_note || attachments.length > 0 ? (
            <Card>
              <CardHead
                title="What you told us"
                hint="The notes and files you shared when you placed this order."
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
            viewerRole="customer"
            canSend={!settled}
            lockedNotice={
              order.status === "completed"
                ? "This booking is complete, so its thread is now read-only. Anything else you need, message the team from Messages."
                : "This order was cancelled, so its thread is now read-only. Message the team from Messages and we'll pick it up."
            }
          />
        </div>

        {/* -------------------------------------------------- right rail */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHead title="Travellers" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5 p-5">
              <MiniField label="Adults" value={order.adults} />
              <MiniField label="Children" value={order.children || "None"} />
              {order.children > 0 && order.child_ages.length > 0 ? (
                <MiniField
                  label="Children's ages"
                  value={order.child_ages.join(", ")}
                />
              ) : null}
              <MiniField
                label="Wheelchair"
                value={order.wheelchair ? "Requested" : "Not needed"}
              />
            </div>
            {paxNames.length > 0 ? (
              <div className="border-line-soft flex flex-col gap-2 border-t px-5 py-4">
                <span className="text-ink-500 text-[11px] font-medium tracking-[0.09em] uppercase">
                  Names on the ticket
                </span>
                <div className="flex flex-wrap gap-2">
                  {paxNames.map((name, i) => (
                    <span
                      key={`${name}-${i}`}
                      className="border-line-hair bg-surface-4 text-ink-800 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium"
                    >
                      <UserIcon size={13} />
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHead title="Your quote" />
            <div className="flex flex-col gap-3 p-5">
              {quoted ? (
                <>
                  <span className="font-poppins text-ink-880 text-[27px] leading-none font-semibold tracking-[-0.022em] tabular-nums">
                    {gbp(order.selling_price!)}
                  </span>
                  <span className="text-ink-600 text-[12px] font-normal">
                    Total for {paxSummary(order.adults, order.children, order.passengers)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-ink-800 text-[15px] font-semibold">
                    Awaiting a fare
                  </span>
                  <span className="text-ink-600 text-[12.5px] leading-[1.55] font-normal text-pretty">
                    Our team is comparing options for this trip. The price lands
                    here and we&apos;ll message you the moment it does.
                  </span>
                </>
              )}
              {payment ? (
                <div className="border-line-soft flex flex-col gap-1 border-t pt-3">
                  <span className="text-ink-500 text-[11px] font-medium tracking-[0.09em] uppercase">
                    Payment
                  </span>
                  <span className="text-ink-800 text-[13px] font-medium">
                    {payment}
                  </span>
                </div>
              ) : null}
            </div>
          </Card>

          <div className="bg-marine-50 border-marine-line flex flex-col gap-3 rounded-[12px] border px-5 py-5">
            <span className="text-ember-700 text-[11px] font-medium tracking-[0.13em] uppercase">
              Something to change?
            </span>
            <span className="text-ink-600 text-[12.5px] leading-[1.55] font-normal text-pretty">
              Dates, names, baggage — tell the team in the thread and they will
              update the booking for you.
            </span>
            <Link
              href="/customer/messages"
              className="text-marine-600 text-[12.5px] font-medium no-underline hover:no-underline"
            >
              Open Messages →
            </Link>
          </div>
        </div>
      </div>
    </Screen>
  );
}
