import Link from "next/link";
import {
  MessageSquare,
  ShoppingBag,
  Inbox,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { getInboxForEmployee } from "@/lib/db/conversations";
import { getMyVisibleOrders } from "@/lib/db/orders";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { UserCell } from "@/components/admin/user-cell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrderStatus } from "@/lib/db/types";
import { fmtRelative, titleCase } from "@/lib/format";

const ORDER_TONE: Record<OrderStatus, Tone> = {
  new: "blue",
  in_progress: "gold",
  completed: "green",
  cancelled: "red",
};

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

  const assignedChats = inbox.length;
  const unread = inbox.reduce((s, c) => s + c.unreadCount, 0);
  const openOrders = orders.filter(
    (o) => o.status === "new" || o.status === "in_progress"
  ).length;

  // "Completed this week": completed orders created in the last 7 days, using
  // creation date as a simple proxy for the activity window.
  // Server Component render: reading the request time once is intentional.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const closedThisWeek = orders.filter(
    (o) =>
      o.status === "completed" &&
      now - new Date(o.created_at).getTime() <= WEEK_MS
  ).length;

  const recentConvos = inbox.slice(0, 4);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-tx-head sm:text-2xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s on your plate today.
        </p>
      </div>

      {/* Personal stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My Assigned Chats" value={String(assignedChats)} icon={MessageSquare} hint="assigned to you" />
        <StatCard label="My Open Orders" value={String(openOrders)} icon={ShoppingBag} hint="in progress" />
        <StatCard label="Unread Messages" value={String(unread)} icon={Inbox} hint="need a reply" />
        <StatCard label="Closed This Week" value={String(closedThisWeek)} icon={CheckCircle2} hint="orders closed" />
      </div>

      {/* Recent conversations + orders */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title="My Recent Conversations"
          action={
            <Link href="/employee/messages" className="inline-flex items-center gap-1 text-sm font-medium text-ocean transition-colors hover:text-ocean-deep">
              Open inbox <ArrowRight className="size-4" />
            </Link>
          }
        >
          {recentConvos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No conversations assigned to you yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentConvos.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <UserCell name={c.customer?.name || c.customer?.wa_phone || "Unknown"} />
                  <span className="ml-1 line-clamp-1 flex-1 text-sm text-muted-foreground">
                    {c.preview ?? "No messages yet"}
                  </span>
                  {c.unreadCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-chip bg-ocean px-1.5 py-0.5 text-xs font-semibold text-tx-invert">
                      {c.unreadCount}
                    </span>
                  ) : null}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {fmtRelative(c.last_message_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="My Recent Orders"
          flush
          action={
            <Link href="/employee/orders" className="inline-flex items-center gap-1 px-6 text-sm font-medium text-ocean transition-colors hover:text-ocean-deep">
              View all <ArrowRight className="size-4" />
            </Link>
          }
        >
          {recentOrders.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              You haven&apos;t created any orders yet. Open a chat and use
              “Create order”.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Customer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-6 font-medium text-tx-head">
                      {o.customer?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.route_from ?? "?"} → {o.route_to ?? "?"}
                    </TableCell>
                    <TableCell className="pr-6">
                      <StatusBadge tone={ORDER_TONE[o.status]}>
                        {titleCase(o.status)}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
