import type { ReactNode } from "react";
import {
  Plane,
  Calendar,
  Users,
  Armchair,
  Accessibility,
  Luggage,
  Route,
  FileText,
  Paperclip,
  Baby,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/ui/icon-chip";
import type { Order } from "@/lib/db/types";
import type { SignedOrderAttachment } from "@/lib/db/order-messages";
import { cabinLabel, tripTypeLabel } from "@/lib/orders/form";
import { fmtDate, routeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One line of an order record: a faint icon and label on the left, the fact on
 * the right in heading colour. Used by the admin, employee and customer views
 * of the same order, so they can't drift apart.
 */
function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Plane;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="flex items-center gap-2 text-[14.5px] text-tx-muted">
        <Icon className="size-4 shrink-0 text-tx-faint" />
        {label}
      </span>
      <span className="text-right text-[14.5px] font-semibold text-tx-head">
        {value}
      </span>
    </div>
  );
}

/** Full flight + passenger record for an order (the Chunk 1 form's fields). */
export function FlightDetailsCard({ order }: { order: Order }) {
  const childPart =
    order.children > 0
      ? `, ${order.children} child${order.children !== 1 ? "ren" : ""}`
      : "";
  const passengerSummary = `${order.adults} adult${
    order.adults !== 1 ? "s" : ""
  }${childPart}`;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Flight details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-line-faint">
          <DetailRow
            icon={Route}
            label="Route"
            value={routeLabel(order.route_from, order.route_to)}
          />
          <DetailRow icon={Plane} label="Trip type" value={tripTypeLabel(order.trip_type)} />
          <DetailRow icon={Armchair} label="Cabin class" value={cabinLabel(order.cabin_class)} />
          <DetailRow icon={Calendar} label="Departure" value={fmtDate(order.travel_date)} />
          <DetailRow
            icon={Calendar}
            label="Return"
            value={order.return_date ? fmtDate(order.return_date) : "—"}
          />
          <DetailRow icon={Users} label="Passengers" value={passengerSummary} />
          {order.children > 0 && order.child_ages.length > 0 ? (
            <DetailRow
              icon={Baby}
              label="Children's ages"
              value={<span className="tabular">{order.child_ages.join(", ")}</span>}
            />
          ) : null}
          <DetailRow
            icon={Accessibility}
            label="Wheelchair"
            value={order.wheelchair ? "Requested" : "Not needed"}
          />
          <DetailRow
            icon={Luggage}
            label="Extra luggage"
            value={
              order.extra_luggage
                ? order.extra_luggage_kg
                  ? `Yes · ${order.extra_luggage_kg} kg`
                  : "Yes"
                : "No"
            }
          />
        </div>

        {order.passenger_names.length > 0 ? (
          <div className="mt-5 border-t border-line-faint pt-4">
            <p className="font-micro text-tx-faint">Passenger names</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {order.passenger_names.map((name, i) => (
                <Badge key={`${name}-${i}`} variant="sky">
                  <Users />
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function isImage(att: SignedOrderAttachment): boolean {
  if (att.mime_type?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(att.file_name ?? att.storage_path);
}

/**
 * The customer's pre-order note + any files they shared in the gate. Always
 * rendered so staff can see whether the customer engaged the gate; shows an
 * empty hint when nothing was provided.
 *
 * The note sits on coral tint — it is the customer's own words, quoted, and
 * the system reserves that surface for exactly this kind of aside.
 */
export function PreOrderNoteCard({
  note,
  attachments,
}: {
  note: string | null;
  attachments: SignedOrderAttachment[];
}) {
  const hasContent = !!note || attachments.length > 0;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Pre-order note</CardTitle>
        <CardDescription>
          What the customer shared before placing the order.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasContent ? (
          <p className="text-[14.5px] leading-[1.6] text-tx-muted">
            No specific flights or files were shared — the customer asked us to find
            the best options.
          </p>
        ) : (
          <div className="space-y-5">
            {note ? (
              <div className="flex gap-3 rounded-card border border-coral-line bg-coral-tint p-4">
                <FileText className="mt-0.5 size-[18px] shrink-0 text-coral" />
                <p className="whitespace-pre-wrap text-[14.5px] leading-[1.6] text-tx-body">
                  {note}
                </p>
              </div>
            ) : null}

            {attachments.length > 0 ? (
              <div className="space-y-2.5">
                <p className="flex items-center gap-1.5 font-micro text-tx-faint">
                  <Paperclip className="size-3.5" />
                  {attachments.length} attachment{attachments.length !== 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {attachments.map((att) =>
                    isImage(att) && att.url ? (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block overflow-hidden rounded-chip border border-line bg-sunk outline-none transition-shadow duration-150 ease-brand hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.url}
                          alt={att.file_name ?? "attachment"}
                          className="h-28 w-full object-cover"
                        />
                      </a>
                    ) : (
                      <a
                        key={att.id}
                        href={att.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-2.5 rounded-chip border border-line bg-sunk px-3 py-2.5 text-[14.5px] outline-none transition-colors duration-150 ease-brand hover:border-line-hover hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral",
                          !att.url && "pointer-events-none opacity-60"
                        )}
                      >
                        <IconChip
                          tone="marine"
                          className="size-8 rounded-chip [&_svg]:size-4"
                        >
                          <FileText />
                        </IconChip>
                        <span className="min-w-0 flex-1 truncate text-tx-body">
                          {att.file_name ?? "attachment"}
                        </span>
                      </a>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
