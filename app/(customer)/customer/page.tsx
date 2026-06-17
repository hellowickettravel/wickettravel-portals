import Link from "next/link";
import {
  Plane,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { StatCard } from "@/components/admin/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  CUSTOMER_ORDERS,
  customerStatusTone,
} from "@/lib/mock/customer";
import { gbp } from "@/lib/format";

export default async function CustomerDashboardPage() {
  const { user, profile } = await getUserAndProfile();
  const fullName = profile?.full_name?.trim() || user?.email || "Traveller";
  const firstName = fullName.split(/\s+/)[0];

  const active = CUSTOMER_ORDERS.filter(
    (o) => o.status === "Confirmed" || o.status === "Ticketed"
  ).length;
  const completed = CUSTOMER_ORDERS.filter((o) => o.status === "Completed").length;
  const pending = CUSTOMER_ORDERS.filter(
    (o) => o.status === "Quote requested"
  ).length;
  const recent = CUSTOMER_ORDERS.slice(0, 3);

  return (
    <div className="space-y-7">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your trips.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active Orders" value={String(active)} icon={Plane} hint="confirmed & ticketed" />
        <StatCard label="Completed Trips" value={String(completed)} icon={CheckCircle2} hint="all time" />
        <StatCard label="Pending Quotes" value={String(pending)} icon={Clock} hint="awaiting your reply" />
      </div>

      {/* CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#1e3a5f_0%,#0a4a76_55%,#0066a1_100%)] p-7 shadow-card md:p-8">
        <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(120%_120%_at_20%_0%,black,transparent_75%)]" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div className="max-w-md">
            <h2 className="font-display text-xl font-semibold text-white md:text-2xl">
              Planning your next trip?
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              Tell us where you want to go and our team will find you the best fare.
            </p>
          </div>
          <Link
            href="/customer/book"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-sm font-semibold text-brand-dark shadow-sm transition-transform hover:scale-[1.02]"
          >
            Book a New Flight
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <SectionCard
        title="Recent Orders"
        action={
          <Link
            href="/customer/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        }
      >
        <ul className="divide-y divide-border">
          {recent.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-chip text-brand-dark">
                  <Plane className="size-5 -rotate-45" />
                </div>
                <div className="leading-tight">
                  <p className="font-medium text-foreground">
                    {o.from} → {o.to}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {o.fromCity} – {o.toCity}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.departDate}
                    {o.returnDate ? ` · ${o.returnDate}` : ""} · {o.pax} pax
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 pl-13 sm:pl-0">
                {o.price ? (
                  <span className="font-display text-sm font-semibold text-foreground">
                    {gbp(o.price)}
                  </span>
                ) : null}
                <StatusBadge tone={customerStatusTone(o.status)}>
                  {o.status}
                </StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Help footer */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-neutral-soft px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Prefer WhatsApp? You can also chat with our team directly.
        </p>
        <Link
          href="/customer/messages"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-dark"
        >
          Open messages <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
