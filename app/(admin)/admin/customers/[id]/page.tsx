import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plane, MessageSquare, User } from "lucide-react";
import { getCustomerDetail } from "@/lib/actions/admin";
import { SectionCard } from "@/components/admin/section-card";
import { CustomerDangerZone } from "@/components/admin/customer-danger-zone";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import type { OrderStatus, ConversationStatus } from "@/lib/db/types";
import { fmtDate, fmtRelative, titleCase } from "@/lib/format";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  new: "blue",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};
const CONVO_TONE: Record<ConversationStatus, Tone> = {
  open: "blue",
  closed: "green",
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  if (!detail) notFound();

  const { customer, orders, conversations } = detail;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-marine-600 transition-colors hover:text-marine-600"
      >
        <ArrowLeft className="size-4" />
        Back to customers
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 rounded-[12px] border border-line-base bg-white p-5 shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)]">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-marine-tint text-marine-600">
          <User className="size-6" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <p className="font-poppins text-lg font-semibold text-ink-900">
              {customer.name || "Unnamed customer"}
            </p>
            <StatusBadge tone={customer.profile_id ? "green" : "slate"}>
              {customer.profile_id ? "Has account" : "Lead"}
            </StatusBadge>
          </div>
          <p className="text-sm text-ink-600">
            {customer.wa_phone ?? "No phone number"} · joined {fmtDate(customer.created_at)}
          </p>
        </div>
      </div>

      {/* Orders — full record, each opens the same order-detail view + inbox */}
      <SectionCard title={`Orders (${orders.length})`} flush>
        {orders.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-ink-600">
            No orders yet.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-1"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-marine-tint text-marine-600">
                    <Plane className="size-4 -rotate-45" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-poppins text-sm font-semibold text-ink-900">
                      {o.order_number}
                    </p>
                    <p className="truncate text-xs text-ink-600">
                      {o.route_from ?? "—"} → {o.route_to ?? "—"}
                    </p>
                  </div>
                  <div className="hidden text-right text-xs leading-relaxed text-ink-600 sm:block">
                    <p>Created {fmtDate(o.created_at)}</p>
                    <p>
                      {o.closed_at
                        ? `Completed ${fmtDate(o.closed_at)}`
                        : "Not completed"}
                    </p>
                  </div>
                  <StatusBadge tone={ORDER_TONE[o.status]}>
                    {titleCase(o.status)}
                  </StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Conversations */}
      <SectionCard title={`Conversations (${conversations.length})`} flush>
        {conversations.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-ink-600">
            No conversations yet.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/messages/${c.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-1"
                >
                  <MessageSquare className="size-4 text-marine-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800">
                      Conversation #{c.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-ink-600">
                      Last activity {fmtRelative(c.last_message_at)}
                    </p>
                  </div>
                  <StatusBadge tone={CONVO_TONE[c.status]}>
                    {titleCase(c.status)}
                  </StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <CustomerDangerZone
        customerId={customer.id}
        customerName={customer.name || "this customer"}
      />
    </div>
  );
}
