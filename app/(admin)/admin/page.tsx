import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrders } from "@/lib/db/orders";
import { getRecentActivity, type ActivityTone } from "@/lib/db/activity";
import { gbp, fmtDate, fmtLongDate, fmtRelative, titleCase } from "@/lib/format";
import {
  Btn,
  Card,
  CardHead,
  Kpi,
  KpiGrid,
  PageHead,
  Pill,
  Screen,
} from "@/components/admin/ui";
import {
  ChatIcon,
  ClockIcon,
  OrdersIcon,
  PlusIcon,
  StaffIcon,
} from "@/components/admin/icons";

/** The activity feed's dot colour — the design's `tint(kind)[1]`. */
const ACTIVITY_DOT: Record<ActivityTone, string> = {
  marine: "var(--color-marine-600)",
  ember: "var(--color-warn-ink)",
  success: "var(--color-ok-ink)",
  ink: "var(--color-ink-700)",
};

function sinceDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const last30 = sinceDays(30);
  const last7 = sinceDays(7);

  const [
    orders,
    employeesActive,
    employeesOff,
    conversationsCount,
    conversationsNew,
    activity,
  ] = await Promise.all([
    getOrders(),
    supabase
      .from("profiles")
      .select("id", head)
      .eq("role", "employee")
      .eq("is_active", true)
      .then((r) => r.count ?? 0),
    supabase
      .from("profiles")
      .select("id", head)
      .eq("role", "employee")
      .eq("is_active", false)
      .then((r) => r.count ?? 0),
    supabase.from("conversations").select("id", head).then((r) => r.count ?? 0),
    supabase
      .from("conversations")
      .select("id", head)
      .gte("created_at", last30)
      .then((r) => r.count ?? 0),
    getRecentActivity(7),
  ]);

  const active = orders.filter(
    (o) => o.status === "new" || o.status === "in_progress"
  );
  const ordersLast30 = orders.filter(
    (o) => (o.created_at ?? "") >= last30
  ).length;
  const activeLast7 = active.filter((o) => (o.created_at ?? "") >= last7).length;

  const bookValue = orders.reduce((s, o) => s + (o.selling_price ?? 0), 0);
  const recentOrders = orders.slice(0, 7);

  return (
    <Screen>
      <PageHead
        title="Today"
        intro={`A live snapshot of the whole business — ${fmtLongDate(new Date().toISOString())}.`}
        actions={
          <Btn as="link" href="/admin/orders/new" variant="ember">
            <PlusIcon size={15} />
            New order
          </Btn>
        }
      />

      <KpiGrid>
        <Kpi
          label="Total orders"
          value={orders.length}
          meta="Every order on the platform"
          tone="marine"
          icon={<OrdersIcon size={18} />}
          trend={ordersLast30 ? `+${ordersLast30}` : null}
        />
        <Kpi
          label="Active Orders"
          value={active.length}
          meta="Everything currently New or In progress"
          tone="warn"
          icon={<ClockIcon size={18} />}
          trend={activeLast7 ? `+${activeLast7}` : null}
        />
        <Kpi
          label="Conversations"
          value={conversationsCount}
          meta="Customer threads on the platform"
          tone="teal"
          icon={<ChatIcon size={18} />}
          trend={conversationsNew ? `+${conversationsNew}` : null}
        />
        <Kpi
          label="Employees"
          value={employeesActive + employeesOff}
          meta={`${employeesActive} active · ${employeesOff} deactivated`}
          tone="ok"
          icon={<StaffIcon size={18} />}
        />
      </KpiGrid>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-stretch gap-4">
        {/* ------------------------------------------- Recent orders */}
        <Card className="flex h-full flex-col">
          <CardHead
            title="Recent orders"
            action={
              <Link
                href="/admin/orders"
                className="text-marine-600 text-[12.5px] font-medium whitespace-nowrap no-underline hover:no-underline"
              >
                All orders
              </Link>
            }
          />
          <div className="min-h-0 flex-1">
            {recentOrders.length === 0 ? (
              <p className="text-ink-600 m-0 px-5 py-10 text-center text-[13px]">
                No orders yet. They appear here within a minute of being placed.
              </p>
            ) : (
              recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="border-line-soft hover:bg-surface-1 flex w-full items-center gap-4 border-b px-5 py-3 text-left no-underline hover:no-underline"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-ink-800 max-w-full truncate text-[13px] font-medium">
                        {o.customer?.name ?? "Unassigned customer"}
                      </span>
                      <span className="text-ink-500 text-[11.5px] font-normal tabular-nums">
                        {o.order_number}
                      </span>
                    </span>
                    <span className="text-ink-600 text-[12.5px] font-normal">
                      {o.route_from ?? "—"} → {o.route_to ?? "—"} ·{" "}
                      {o.travel_date ? fmtDate(o.travel_date) : "Date to confirm"}
                    </span>
                  </span>
                  <Pill>{titleCase(o.status)}</Pill>
                  <span className="text-ink-800 min-w-[60px] flex-none text-right text-[13px] font-medium tabular-nums">
                    {o.selling_price != null ? gbp(o.selling_price) : "—"}
                  </span>
                </Link>
              ))
            )}
          </div>
          <div className="border-line-soft mt-auto flex flex-none items-center justify-between gap-3 border-t px-5 py-3.5">
            <span className="text-ink-600 text-[12px] font-normal">
              Showing {recentOrders.length} of {orders.length} orders
            </span>
            <Btn as="link" href="/admin/orders" size="sm">
              Load more
            </Btn>
          </div>
        </Card>

        {/* ----------------------------------------- Recent activity */}
        <Card className="flex h-full flex-col">
          <CardHead title="Recent activity" />
          <div className="min-h-0 flex-1 px-5 pt-2 pb-1">
            {activity.items.length === 0 ? (
              <p className="text-ink-600 m-0 py-10 text-center text-[13px]">
                Nothing has happened yet. Orders, replies and assignments show
                up here as your team works.
              </p>
            ) : (
              activity.items.map((a) => (
                <div
                  key={a.id}
                  className="border-line-soft flex gap-4 border-b py-3 last:border-b-0"
                >
                  <span
                    style={{ background: ACTIVITY_DOT[a.tone] }}
                    className="mt-1.5 block size-2 flex-none rounded-full"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-ink-700 text-[12.5px] leading-[1.5] font-normal text-pretty">
                      <span className="text-ink-800 font-medium">{a.actor}</span>{" "}
                      {a.verb}{" "}
                      <Link href={a.link} className="font-medium">
                        {a.record}
                      </Link>
                    </span>
                    <span className="text-ink-500 text-[11.5px] font-normal">
                      {fmtRelative(a.at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-line-soft mt-auto flex flex-none items-center justify-between gap-3 border-t px-5 py-3.5">
            <span className="text-ink-600 text-[12px] font-normal">
              Showing {activity.items.length} of {activity.total} events
            </span>
            <Btn as="link" href="/admin/notifications" size="sm">
              Load more
            </Btn>
          </div>
        </Card>
      </div>

      {/* --------------------------------------------- Book of business */}
      <div className="bg-marine-50 border-marine-line grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-6 rounded-[12px] border px-[clamp(18px,2.2vw,24px)] py-6">
        <div className="flex flex-col gap-2">
          <span className="text-ember-700 text-[11px] font-medium tracking-[0.13em] uppercase">
            Book of business
          </span>
          <span className="text-ink-600 max-w-[220px] text-[12.5px] leading-[1.55] font-normal text-pretty">
            Running totals across every order and conversation on the platform.
          </span>
        </div>
        {[
          { label: "Orders placed", value: String(orders.length) },
          { label: "Total order value", value: gbp(bookValue) },
          { label: "Conversations", value: String(conversationsCount) },
        ].map((b) => (
          <div key={b.label} className="flex flex-col gap-2">
            <span className="text-ink-600 text-[11px] font-normal tracking-[0.06em] uppercase">
              {b.label}
            </span>
            <span className="font-poppins text-ink-800 text-[24px] leading-[1.1] font-medium tracking-[-0.022em] tabular-nums">
              {b.value}
            </span>
          </div>
        ))}
      </div>
    </Screen>
  );
}
