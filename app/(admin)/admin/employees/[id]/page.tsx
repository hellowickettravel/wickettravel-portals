import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plane, ShoppingBag, MessageSquare, Shield } from "lucide-react";
import { getEmployeeDetail } from "@/lib/actions/admin";
import { SectionCard } from "@/components/admin/section-card";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { UserCell } from "@/components/admin/user-cell";
import { EmployeePasswordReset } from "@/components/admin/employee-password-reset";
import {
  ACCESS_LEVEL_LABELS,
  normalizeAccess,
  type AccessLevel,
} from "@/lib/access";
import type { OrderStatus } from "@/lib/db/types";
import { gbp, fmtDate, titleCase } from "@/lib/format";

const ACCESS_TONE: Record<AccessLevel, Tone> = {
  full: "blue",
  semi_admin: "amber",
  chat_only: "violet",
  view_only: "slate",
};
const ORDER_TONE: Record<OrderStatus, Tone> = {
  open: "blue",
  closed: "green",
  cancelled: "red",
};

export default async function AdminEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getEmployeeDetail(id);
  if (!detail) notFound();

  const { profile, ordersCreated, assignmentCount } = detail;
  const level = normalizeAccess(profile.access_level);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/employees"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
      >
        <ArrowLeft className="size-4" />
        Back to employees
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <UserCell name={profile.full_name || "Unnamed"} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{profile.email ?? "—"}</span>
            <StatusBadge tone={ACCESS_TONE[level]}>
              {ACCESS_LEVEL_LABELS[level]}
            </StatusBadge>
            <StatusBadge tone={profile.is_active ? "green" : "slate"}>
              {profile.is_active ? "Active" : "Inactive"}
            </StatusBadge>
          </div>
        </div>
        <EmployeePasswordReset employeeId={profile.id} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Orders created" value={String(ordersCreated.length)} icon={ShoppingBag} />
        <StatCard label="Conversations" value={String(assignmentCount)} icon={MessageSquare} hint="currently assigned" />
        <StatCard label="Access level" value={ACCESS_LEVEL_LABELS[level]} icon={Shield} />
      </div>

      {/* Orders created */}
      <SectionCard title={`Orders created (${ordersCreated.length})`} flush>
        {ordersCreated.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            This employee hasn’t created any orders yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {ordersCreated.map((o) => (
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
                      #{o.id.slice(0, 8)} · {fmtDate(o.created_at)}
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
    </div>
  );
}
