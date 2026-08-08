import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { getInboxForEmployee } from "@/lib/db/conversations";
import { getMyVisibleOrders } from "@/lib/db/orders";
import {
  gbp,
  fmtDate,
  fmtInboxTime,
  fmtLongDate,
  routeLabel,
  statusLabel,
} from "@/lib/format";
import {
  Avatar,
  Btn,
  Card,
  CardHead,
  EmptyState,
  Kpi,
  KpiGrid,
  PageHead,
  Pill,
  Screen,
} from "@/components/admin/ui";
import {
  ChatIcon,
  CheckCircleIcon,
  ClockIcon,
  OrdersIcon,
  PlusIcon,
} from "@/components/admin/icons";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function EmployeeDashboardPage() {
  const { user, profile } = await getUserAndProfile();
  const fullName = profile?.full_name?.trim() || user?.email || "there";
  const firstName = fullName.split(/\s+/)[0];

  // Personal data only — both queries run under RLS scoped to this employee.
  const [inbox, orders] = await Promise.all([
    user ? getInboxForEmployee(user.id) : Promise.resolve([]),
    getMyVisibleOrders(),
  ]);

  // Server Component render: reading the request time once is intentional.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const isRecent = (iso: string | null) =>
    !!iso && now - new Date(iso).getTime() <= WEEK_MS;

  const waiting = inbox.reduce((s, c) => s + c.unreadCount, 0);
  const active = orders.filter(
    (o) => o.status === "new" || o.status === "in_progress"
  );
  const closedThisWeek = orders.filter(
    (o) => o.status === "completed" && isRecent(o.created_at)
  ).length;
  const newThisWeek = active.filter((o) => isRecent(o.created_at)).length;

  // What this employee has actually earned, on the orders they closed.
  const commission = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + (o.commission ?? 0), 0);

  const recentConvos = inbox.slice(0, 6);
  const recentOrders = orders.slice(0, 6);

  return (
    <Screen>
      <PageHead
        title="Today"
        intro={`Everything on your plate, ${firstName} — ${fmtLongDate(
          new Date().toISOString()
        )}.`}
        actions={
          <Btn as="link" href="/employee/orders/new" variant="ember">
            <PlusIcon size={15} />
            New order
          </Btn>
        }
      />

      <KpiGrid>
        <Kpi
          label="Assigned chats"
          value={inbox.length}
          meta="Conversations routed to you"
          tone="marine"
          icon={<ChatIcon size={18} />}
        />
        <Kpi
          label="Open orders"
          value={active.length}
          meta="Everything currently New or In progress"
          tone="warn"
          icon={<ClockIcon size={18} />}
          trend={newThisWeek ? `+${newThisWeek}` : null}
        />
        <Kpi
          label="Waiting on a reply"
          value={waiting}
          meta="Customer messages you have not answered"
          tone="teal"
          icon={<OrdersIcon size={18} />}
        />
        <Kpi
          label="Closed this week"
          value={closedThisWeek}
          meta="Orders you completed in the last 7 days"
          tone="ok"
          icon={<CheckCircleIcon size={18} />}
        />
      </KpiGrid>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-stretch gap-4">
        {/* ------------------------------------------- My conversations */}
        <Card className="flex h-full flex-col">
          <CardHead
            title="My conversations"
            action={
              <Link
                href="/employee/messages"
                className="text-marine-600 text-[12.5px] leading-[normal] font-medium whitespace-nowrap no-underline hover:no-underline"
              >
                Open inbox
              </Link>
            }
          />
          <div className="min-h-0 flex-1">
            {recentConvos.length === 0 ? (
              <EmptyState
                title="No conversations yet"
                body="Threads appear here the moment an admin routes one to you, or a customer you own messages in."
              />
            ) : (
              recentConvos.map((c) => {
                const name =
                  c.customer?.name || c.customer?.wa_phone || "Unknown";
                return (
                  <Link
                    key={c.id}
                    href={`/employee/messages?c=${c.id}`}
                    className="border-line-soft hover:bg-surface-1 flex w-full items-center gap-3 border-b bg-white px-5 py-3 text-left leading-[normal] no-underline hover:no-underline"
                  >
                    <Avatar name={name} size={32} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-ink-800 truncate text-[13px] font-medium">
                        {name}
                      </span>
                      <span className="text-ink-600 truncate text-[12.5px] font-normal">
                        {c.preview ?? "No messages yet"}
                      </span>
                    </span>
                    {c.unreadCount > 0 ? (
                      <span className="bg-warn-bg text-warn-ink flex-none rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                        {c.unreadCount}
                      </span>
                    ) : null}
                    <span className="text-ink-500 flex-none text-[11.5px] font-normal whitespace-nowrap">
                      {fmtInboxTime(c.last_message_at)}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
          <div className="border-line-soft mt-auto flex flex-none items-center justify-between gap-3 border-t px-5 py-3.5">
            <span className="text-ink-600 text-[12px] font-normal">
              {inbox.length === 0
                ? "Nothing assigned"
                : `Showing ${recentConvos.length} of ${inbox.length} conversations`}
            </span>
            <Btn as="link" href="/employee/messages" size="sm">
              Open inbox
            </Btn>
          </div>
        </Card>

        {/* -------------------------------------------- My recent orders */}
        <Card className="flex h-full flex-col">
          <CardHead
            title="My recent orders"
            action={
              <Link
                href="/employee/orders"
                className="text-marine-600 text-[12.5px] leading-[normal] font-medium whitespace-nowrap no-underline hover:no-underline"
              >
                All orders
              </Link>
            }
          />
          <div className="min-h-0 flex-1">
            {recentOrders.length === 0 ? (
              <EmptyState
                title="No orders yet"
                body="Orders you create, or that an admin assigns to you, show up here."
                action={
                  <Btn as="link" href="/employee/orders/new" variant="ember">
                    <PlusIcon size={15} />
                    New order
                  </Btn>
                }
              />
            ) : (
              recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/employee/orders/${o.id}`}
                  className="border-line-soft hover:bg-surface-1 flex w-full items-center gap-4 border-b bg-white px-5 py-3 text-left leading-[normal] no-underline hover:no-underline"
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
                      {routeLabel(o.route_from, o.route_to)} ·{" "}
                      {o.travel_date ? fmtDate(o.travel_date) : "Date to confirm"}
                    </span>
                  </span>
                  <Pill>{statusLabel(o.status)}</Pill>
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
            <Btn as="link" href="/employee/orders" size="sm">
              All orders
            </Btn>
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------ your work */}
      <div className="bg-marine-50 border-marine-line grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-6 rounded-[12px] border px-[clamp(18px,2.2vw,24px)] py-6">
        <div className="flex flex-col gap-2">
          <span className="text-ember-700 text-[11px] font-medium tracking-[0.13em] uppercase">
            Your work
          </span>
          <span className="text-ink-600 max-w-[220px] text-[12.5px] leading-[1.55] font-normal text-pretty">
            Running totals across every order you own.
          </span>
        </div>
        {[
          { label: "Orders", value: String(orders.length) },
          { label: "Completed", value: String(orders.filter((o) => o.status === "completed").length) },
          { label: "Commission earned", value: gbp(commission) },
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
