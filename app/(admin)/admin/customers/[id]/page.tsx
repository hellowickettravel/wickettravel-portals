import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MessageSquare,
  Phone,
  Plane,
  User,
} from "lucide-react";

import { getCustomerDetail } from "@/lib/actions/admin";
import { CustomerDangerZone } from "@/components/admin/customer-danger-zone";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { OrdersTable } from "@/components/admin/orders-table";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/portal/states";
import { IconChip } from "@/components/ui/icon-chip";
import { Panel } from "@/components/ui/section";
import type { ConversationStatus } from "@/lib/db/types";
import { fmtDate, fmtRelative, num, titleCase } from "@/lib/format";

/** Open = still live and awaiting a reply; closed = done with. */
const CONVO_TONE: Record<ConversationStatus, Tone> = {
  open: "violet",
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

  const openOrders = orders.filter(
    (o) => o.status === "new" || o.status === "in_progress"
  ).length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;

  const orderRows = orders.map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    customerName: customer.name,
    routeFrom: o.route_from,
    routeTo: o.route_to,
    status: o.status,
    sellingPrice: o.selling_price,
    createdAt: o.created_at,
  }));

  return (
    <div className="space-y-18">
      <div className="space-y-8">
        <div className="space-y-5">
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-1.5 rounded-chip text-[14.5px] font-semibold text-ocean underline-offset-[3px] outline-none transition-colors duration-150 ease-brand hover:text-ocean-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
          >
            <ArrowLeft className="size-4" />
            Back to customers
          </Link>

          {/* Who this is */}
          <div className="flex flex-wrap items-start gap-4">
            <IconChip tone="ocean" className="size-[54px] [&_svg]:size-6">
              <User />
            </IconChip>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                {/* Matches <PageHeader>'s h1 exactly — Fraunces comes from
                    the base rule, so only size and weight are stated. */}
                <h1 className="text-[27px] leading-[1.18] font-semibold text-tx-head sm:text-[36px] sm:leading-[1.1]">
                  {customer.name || "Unnamed customer"}
                </h1>
                <StatusBadge tone={customer.profile_id ? "green" : "slate"}>
                  {customer.profile_id ? "Has account" : "Lead"}
                </StatusBadge>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] text-tx-muted">
                {customer.wa_phone ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-4 text-tx-faint" />
                    <span className="tabular">{customer.wa_phone}</span>
                  </span>
                ) : (
                  <span>No phone number</span>
                )}
                <span aria-hidden className="text-tx-faint">
                  ·
                </span>
                <span>Joined {fmtDate(customer.created_at)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard
            tone="ocean"
            icon={Plane}
            label="Orders"
            value={num(orders.length)}
            hint="all time"
          />
          <StatCard
            tone="violet"
            icon={Clock}
            label="Open orders"
            value={num(openOrders)}
            hint="new and in progress"
          />
          <StatCard
            tone="jade"
            icon={CheckCircle2}
            label="Completed"
            value={num(completedOrders)}
            hint="flown or ticketed"
          />
        </div>
      </div>

      {/* Orders — full record, each opens the same order-detail view + inbox */}
      <section className="space-y-4">
        <h2 className="text-[19px] leading-[1.36] font-semibold tracking-[-0.005em] text-tx-head">
          Orders
        </h2>
        <OrdersTable
          rows={orderRows}
          showCustomer={false}
          caption={`Orders placed by ${customer.name ?? "this customer"}`}
          empty={{
            title: "No orders yet",
            description: "Orders this customer places will be listed here.",
          }}
        />
      </section>

      {/* Conversations */}
      <section className="space-y-4">
        <h2 className="text-[19px] leading-[1.36] font-semibold tracking-[-0.005em] text-tx-head">
          Conversations
        </h2>
        <Panel className="overflow-hidden">
          {conversations.length === 0 ? (
            <EmptyState
              icon={<MessageSquare />}
              title="No conversations yet"
              description="Threads with this customer will appear here."
            />
          ) : (
            <ul className="divide-y divide-line-faint">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/messages/${c.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 outline-none transition-colors duration-150 ease-brand hover:bg-sand focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-flame"
                  >
                    <IconChip tone="ocean" className="size-9 rounded-chip [&_svg]:size-4">
                      <MessageSquare />
                    </IconChip>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[13.5px] font-medium text-tx-head">
                        #{c.id.slice(0, 8)}
                      </p>
                      <p className="text-[13px] text-tx-muted">
                        Last activity {fmtRelative(c.last_message_at)}
                      </p>
                    </div>
                    <StatusBadge
                      tone={CONVO_TONE[c.status]}
                      dot={c.status === "open"}
                    >
                      {titleCase(c.status)}
                    </StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* Carries its own ruby surface — it should look like a warning, not
          like another card on the page. */}
      <CustomerDangerZone
        customerId={customer.id}
        customerName={customer.name || "this customer"}
      />
    </div>
  );
}
