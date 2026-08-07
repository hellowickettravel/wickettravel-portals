import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/lib/actions/admin";
import { CustomerDangerZone } from "@/components/admin/customer-danger-zone";
import { gbp, fmtDate, fmtRelative, titleCase } from "@/lib/format";
import {
  BackLink,
  Btn,
  Card,
  CardHead,
  DataRow,
  Kpi,
  KpiGrid,
  MoneyPanel,
  PageTitle,
  Pill,
  RecordRow,
  Screen,
  avatarFor,
  initialsOf,
  shadowE1,
} from "@/components/admin/ui";
import { ChatIcon, Ico, iconForField } from "@/components/admin/icons";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  if (!detail) notFound();

  const { customer, orders, conversations } = detail;
  const name = customer.name || "Unnamed customer";
  const tint = avatarFor(name);

  const completed = orders.filter((o) => o.status === "completed");
  const upcoming = orders.filter(
    (o) =>
      (o.status === "new" || o.status === "in_progress") &&
      o.travel_date != null
  );
  const spent = completed.reduce((s, o) => s + (o.selling_price ?? 0), 0);
  const last = orders[0];
  const nextTrip = [...upcoming].sort((a, b) =>
    (a.travel_date ?? "").localeCompare(b.travel_date ?? "")
  )[0];

  const fields = [
    { label: "Phone", value: customer.wa_phone ?? "—" },
    {
      label: "Portal account",
      value: customer.profile_id ? "Yes — can sign in" : "No — lead only",
    },
    { label: "Customer since", value: fmtDate(customer.created_at) },
    { label: "Conversations", value: String(conversations.length) },
  ];

  return (
    <Screen width={1180}>
      <BackLink href="/admin/customers">Customers</BackLink>

      {/* --------------------------------------------------- profile head */}
      <div
        className={`border-line-base flex flex-wrap items-center gap-4 rounded-[12px] border bg-white p-[clamp(18px,2.2vw,24px)] ${shadowE1}`}
      >
        <span
          style={{ background: tint.ink }}
          className="flex size-[58px] flex-none items-center justify-center rounded-full text-[18px] font-medium text-white"
        >
          {initialsOf(name)}
        </span>
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <PageTitle>{name}</PageTitle>
            <Pill tone={customer.profile_id ? "ok" : "ink"}>
              {customer.profile_id ? "Active" : "Lead"}
            </Pill>
          </div>
          <span className="text-ink-600 text-[13px] font-normal">
            Customer since {fmtDate(customer.created_at)} ·{" "}
            {customer.wa_phone ?? "no phone number"}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Btn
            as="link"
            href={
              conversations[0]
                ? `/admin/messages?c=${conversations[0].id}`
                : "/admin/messages"
            }
          >
            <ChatIcon size={15} />
            Message
          </Btn>
        </div>
      </div>

      <KpiGrid>
        <Kpi
          label="Orders placed"
          value={orders.length}
          meta={`${orders.filter((o) => o.status === "new" || o.status === "in_progress").length} currently active`}
        />
        <Kpi
          label="Upcoming trips"
          value={upcoming.length}
          meta={
            nextTrip
              ? `${nextTrip.route_from ?? "—"} → ${nextTrip.route_to ?? "—"} on ${fmtDate(nextTrip.travel_date)}`
              : "Nothing booked yet"
          }
        />
        <Kpi
          label="Conversations"
          value={conversations.length}
          meta={
            last ? `Last order ${fmtRelative(last.created_at)}` : "No orders yet"
          }
        />
      </KpiGrid>

      <MoneyPanel
        title="Lifetime value"
        pill={`Since ${fmtDate(customer.created_at)}`}
        label="Total spent"
        total={gbp(spent)}
        note="Across all completed orders"
        rows={[
          { label: "Completed orders", value: String(completed.length) },
          {
            label: "Average order value",
            value: gbp(completed.length ? spent / completed.length : 0),
          },
          {
            label: "Last order",
            value: last
              ? `${last.selling_price != null ? gbp(last.selling_price) : "—"} · ${fmtDate(last.created_at)}`
              : "—",
          },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-4 min-[1240px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHead title="Order history" />
          {orders.length === 0 ? (
            <p className="text-ink-600 m-0 px-5 py-10 text-center text-[13px]">
              No orders yet. They appear here within a minute of being placed.
            </p>
          ) : (
            orders.map((o) => (
              <RecordRow
                key={o.id}
                href={`/admin/orders/${o.id}`}
                reference={o.order_number}
                who={`${o.route_from ?? "—"} → ${o.route_to ?? "—"}`}
                meta={`${titleCase(o.trip_type ?? "return")} · ${
                  o.travel_date ? fmtDate(o.travel_date) : "Date to confirm"
                }`}
                status={<Pill>{titleCase(o.status)}</Pill>}
                price={o.selling_price != null ? gbp(o.selling_price) : "—"}
              />
            ))
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHead title="Details" />
            <div className="px-5 pt-3 pb-5">
              {fields.map((f) => (
                <DataRow
                  key={f.label}
                  label={f.label}
                  value={f.value}
                  icon={
                    <Ico name={iconForField(f.label)} size={15} width={1.6} />
                  }
                />
              ))}
            </div>
          </Card>

          <Card>
            <CardHead title="Conversations" />
            {conversations.length === 0 ? (
              <p className="text-ink-600 m-0 px-5 py-8 text-center text-[13px]">
                No conversations yet.
              </p>
            ) : (
              conversations.map((c) => (
                <RecordRow
                  key={c.id}
                  href={`/admin/messages?c=${c.id}`}
                  reference={`#${c.id.slice(0, 8)}`}
                  meta={`Last activity ${fmtRelative(c.last_message_at)}`}
                  status={<Pill>{titleCase(c.status)}</Pill>}
                  price=""
                />
              ))
            )}
          </Card>
        </div>
      </div>

      <CustomerDangerZone
        customerId={customer.id}
        customerName={customer.name || "this customer"}
      />
    </Screen>
  );
}
