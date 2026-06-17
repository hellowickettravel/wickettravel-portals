import Link from "next/link";
import {
  Users,
  ShoppingBag,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, orderTone } from "@/components/admin/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ORDERS, ACTIVITY, CONVERSATIONS } from "@/lib/mock/admin";
import { gbp } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTIVITY_DOT: Record<string, string> = {
  blue: "bg-brand",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  slate: "bg-slate-400",
};

export default function AdminDashboardPage() {
  const recentOrders = ORDERS.slice(0, 5);
  const openConvos = CONVERSATIONS.filter((c) => c.status === "Open").length;
  const unread = CONVERSATIONS.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Overview"
        title="Admin Dashboard"
        subtitle="A snapshot of your team, orders and conversations."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value="6" icon={Users} trend={{ dir: "up", value: "+1" }} hint="active this month" />
        <StatCard label="Open Orders" value="18" icon={ShoppingBag} trend={{ dir: "up", value: "+12%" }} />
        <StatCard label="Conversations" value="47" icon={MessageSquare} trend={{ dir: "down", value: "-4%" }} />
        <StatCard label="Revenue (Jun)" value={gbp(31250)} icon={TrendingUp} trend={{ dir: "up", value: "+9%" }} />
      </div>

      {/* Recent orders + activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard
          title="Recent Orders"
          className="lg:col-span-2"
          flush
          action={
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
            >
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
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="pl-6 font-medium text-navy">{o.id}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.from} → {o.to}
                  </TableCell>
                  <TableCell className="text-right font-medium">{gbp(o.price)}</TableCell>
                  <TableCell className="pr-6">
                    <StatusBadge tone={orderTone(o.status)}>{o.status}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard title="Recent Activity">
          <ol className="space-y-4">
            {ACTIVITY.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    ACTIVITY_DOT[a.tone]
                  )}
                />
                <div className="leading-snug">
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.meta} · {a.time}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>

      {/* Conversations overview */}
      <SectionCard title="Conversations overview">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-neutral-soft p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-chip text-brand-dark">
              <Inbox className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">47</p>
              <p className="text-xs text-muted-foreground">Total conversations</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-neutral-soft p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">{openConvos}</p>
              <p className="text-xs text-muted-foreground">Open right now</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-neutral-soft p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">{unread}</p>
              <p className="text-xs text-muted-foreground">Unread messages</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
