import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plane, MessageSquare, Ticket } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { getOrderById } from "@/lib/db/orders";
import { getPreOrderAttachments } from "@/lib/db/order-messages";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  FlightDetailsCard,
  PreOrderNoteCard,
} from "@/components/orders/order-record";
import { OrderInbox } from "@/components/orders/order-inbox";
import type { OrderStatus } from "@/lib/db/types";
import { gbp, fmtDate } from "@/lib/format";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  new: "blue",
  in_progress: "gold",
  completed: "green",
  cancelled: "red",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Received",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // getOrderById runs under RLS (orders_select_customer), so a customer only
  // ever resolves their own order — anything else comes back null.
  const order = await getOrderById(id);
  if (!order) notFound();

  const [attachments, { user }] = await Promise.all([
    getPreOrderAttachments(id),
    getUserAndProfile(),
  ]);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <Link
        href="/customer/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-marine transition-colors hover:text-marine-deep"
      >
        <ArrowLeft className="size-4" />
        Back to my orders
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-card bg-marine-tint text-marine-deep">
            <Plane className="size-5 -rotate-45" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <p className="tracking-heading text-lg font-semibold text-tx-head">
                Order {order.order_number}
              </p>
              <StatusBadge tone={ORDER_TONE[order.status]}>
                {STATUS_LABEL[order.status]}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              {order.route_from ?? "—"} → {order.route_to ?? "—"} · placed{" "}
              {fmtDate(order.created_at)}
            </p>
          </div>
        </div>

        <Button
          render={<Link href="/customer/messages" />}
          variant="outline"
          size="sm"
        >
          <MessageSquare className="size-4" />
          Message team
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FlightDetailsCard order={order} />

        <div className="space-y-5">
          <SectionCard title="Your quote">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-card bg-marine-tint text-marine-deep">
                <Ticket className="size-5" />
              </div>
              <div>
                {order.selling_price != null ? (
                  <>
                    <p className="tracking-heading text-2xl font-semibold text-tx-head">
                      {gbp(order.selling_price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total price · all passengers
                    </p>
                  </>
                ) : (
                  <>
                    <p className="tracking-heading text-base font-semibold text-foreground">
                      Awaiting quote
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Our team will reply with fares shortly.
                    </p>
                  </>
                )}
              </div>
            </div>
          </SectionCard>

          <PreOrderNoteCard note={order.customer_note} attachments={attachments} />
        </div>
      </div>

      {user ? (
        <OrderInbox
          orderId={order.id}
          status={order.status}
          viewerRole="customer"
          currentUserId={user.id}
        />
      ) : null}
    </div>
  );
}
