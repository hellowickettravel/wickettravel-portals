import Link from "next/link";
import {
  MessageSquare,
  ShoppingBag,
  Inbox,
  CheckCircle2,
  ArrowRight,
  Trophy,
  Timer,
  Gauge,
} from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, orderTone, type Tone } from "@/components/admin/status-badge";
import { UserCell } from "@/components/admin/user-cell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MY_CONVERSATIONS,
  MY_ORDERS,
  MY_PERFORMANCE,
  type EmpConversationStatus,
} from "@/lib/mock/employee";
import { gbp } from "@/lib/format";

const CONVO_TONE: Record<EmpConversationStatus, Tone> = {
  Open: "blue",
  Pending: "amber",
  Closed: "green",
};

export default async function EmployeeDashboardPage() {
  const { user, profile } = await getUserAndProfile();
  const fullName = profile?.full_name?.trim() || user?.email || "there";
  const firstName = fullName.split(/\s+/)[0];

  const assignedChats = MY_CONVERSATIONS.length;
  const openOrders = MY_ORDERS.filter(
    (o) => o.status === "Open" || o.status === "In Progress"
  ).length;
  const unread = MY_CONVERSATIONS.reduce((s, c) => s + c.unread, 0);
  const recentConvos = MY_CONVERSATIONS.slice(0, 3);
  const recentOrders = MY_ORDERS.slice(0, 5);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy">
          Welcome back, {firstName} 👋
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
        <StatCard label="Closed This Week" value={String(MY_PERFORMANCE.closedThisWeek)} icon={CheckCircle2} hint="orders closed" />
      </div>

      {/* Recent conversations + orders */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title="My Recent Conversations"
          action={
            <Link href="/employee/messages" className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-dark">
              Open inbox <ArrowRight className="size-4" />
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {recentConvos.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <UserCell name={c.customer} />
                <span className="ml-1 line-clamp-1 flex-1 text-sm text-muted-foreground">
                  {c.preview}
                </span>
                {c.unread > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                    {c.unread}
                  </span>
                ) : null}
                <StatusBadge tone={CONVO_TONE[c.status]}>{c.status}</StatusBadge>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="My Recent Orders"
          flush
          action={
            <Link href="/employee/orders" className="inline-flex items-center gap-1 px-6 text-sm font-medium text-brand transition-colors hover:text-brand-dark">
              View all <ArrowRight className="size-4" />
            </Link>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="pl-6 font-medium text-navy">{o.id}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell className="text-muted-foreground">{o.from} → {o.to}</TableCell>
                  <TableCell className="pr-6">
                    <StatusBadge tone={orderTone(o.status)}>{o.status}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>

      {/* Personal performance strip (personal only) */}
      <SectionCard title="My Performance" description="Your personal stats this month.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-neutral-soft p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-chip text-brand-dark">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">{MY_PERFORMANCE.closedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Orders closed this month</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-neutral-soft p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Gauge className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">{MY_PERFORMANCE.responseRate}</p>
              <p className="text-xs text-muted-foreground">Response rate</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-neutral-soft p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Timer className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">{MY_PERFORMANCE.avgResponse}</p>
              <p className="text-xs text-muted-foreground">Avg. response time</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
