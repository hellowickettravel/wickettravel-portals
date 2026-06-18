import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plane, MessageSquare, User } from "lucide-react";
import { getCustomerDetail } from "@/lib/actions/admin";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import type { OrderStatus, ConversationStatus } from "@/lib/db/types";
import { gbp, fmtDate, fmtRelative, titleCase } from "@/lib/format";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  open: "blue",
  closed: "green",
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
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
      >
        <ArrowLeft className="size-4" />
        Back to customers
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-chip text-brand-dark">
          <User className="size-6" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <p className="font-display text-lg font-semibold text-navy">
              {customer.name || "Unnamed customer"}
            </p>
            <StatusBadge tone={customer.profile_id ? "green" : "slate"}>
              {customer.profile_id ? "Has account" : "Lead"}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">
            {customer.wa_phone ?? "No WhatsApp number"} · joined {fmtDate(customer.created_at)}
          </p>
        </div>
      </div>

      {/* Orders */}
      <SectionCard title={`Orders (${orders.length})`} flush>
        {orders.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            No orders yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-neutral-soft"
                >
                  <Plane className="size-4 -rotate-45 text-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {o.route_from ?? "—"} → {o.route_to ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{o.id.slice(0, 8)} · {fmtDate(o.travel_date)}
                    </p>
                  </div>
                  <span className="hidden text-sm font-medium text-foreground sm:block">
                    {o.selling_price != null ? gbp(o.selling_price) : "—"}
                  </span>
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
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            No conversations yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/messages/${c.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-neutral-soft"
                >
                  <MessageSquare className="size-4 text-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Conversation #{c.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
    </div>
  );
}
