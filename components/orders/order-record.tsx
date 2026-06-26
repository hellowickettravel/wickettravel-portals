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
import { SectionCard } from "@/components/admin/section-card";
import type { Order } from "@/lib/db/types";
import type { SignedOrderAttachment } from "@/lib/db/order-messages";
import { cabinLabel, tripTypeLabel } from "@/lib/orders/form";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Plane;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 text-slate-400" />
        {label}
      </span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
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
    <SectionCard title="Flight details">
      <div className="divide-y divide-border">
        <DetailRow
          icon={Route}
          label="Route"
          value={`${order.route_from ?? "—"} → ${order.route_to ?? "—"}`}
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
            value={order.child_ages.join(", ")}
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
        <div className="mt-4 border-t border-border pt-4">
          <p className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
            Passenger names
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {order.passenger_names.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-chip px-3 py-1 text-sm font-medium text-brand-dark"
              >
                <Users className="size-3.5" />
                {name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
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
    <SectionCard
      title="Pre-order note"
      description="What the customer shared before placing the order."
    >
      {!hasContent ? (
        <p className="text-sm text-muted-foreground">
          No specific flights or files were shared — the customer asked us to find
          the best options.
        </p>
      ) : (
        <div className="space-y-4">
          {note ? (
            <div className="flex gap-3">
              <FileText className="mt-0.5 size-4 shrink-0 text-brand" />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {note}
              </p>
            </div>
          ) : null}

          {attachments.length > 0 ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 font-label text-xs font-medium uppercase tracking-wider text-slate-600">
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
                      className="group block overflow-hidden rounded-xl border border-border bg-neutral-soft"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={att.url}
                        alt={att.file_name ?? "attachment"}
                        className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </a>
                  ) : (
                    <a
                      key={att.id}
                      href={att.url || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border border-border bg-neutral-soft px-3 py-2.5 text-sm transition-colors hover:bg-muted",
                        !att.url && "pointer-events-none opacity-60"
                      )}
                    >
                      <FileText className="size-5 shrink-0 text-brand" />
                      <span className="min-w-0 flex-1 truncate text-foreground">
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
    </SectionCard>
  );
}
