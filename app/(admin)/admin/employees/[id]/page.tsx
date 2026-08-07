import { notFound } from "next/navigation";
import { getEmployeeDetail } from "@/lib/actions/admin";
import { EmployeePasswordReset } from "@/components/admin/employee-password-reset";
import { EmployeeStatusButton } from "@/components/admin/employee-status-button";
import {
  ACCESS_LEVEL_DESCRIPTIONS,
  ACCESS_LEVEL_LABELS,
  normalizeAccess,
} from "@/lib/access";
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
  const name = profile.full_name || "Unnamed";
  const tint = avatarFor(name);

  const completed = ordersCreated.filter((o) => o.status === "completed");
  const open = ordersCreated.filter(
    (o) => o.status === "new" || o.status === "in_progress"
  );
  const commission = completed.reduce((s, o) => s + (o.commission ?? 0), 0);
  const sold = completed.reduce((s, o) => s + (o.selling_price ?? 0), 0);
  const lastClosed = completed[0];

  const fields = [
    { label: "Email", value: profile.email ?? "—" },
    { label: "Role", value: ACCESS_LEVEL_LABELS[level] },
    { label: "Permissions", value: ACCESS_LEVEL_DESCRIPTIONS[level] },
    { label: "Joined", value: fmtDate(profile.created_at) },
    {
      label: "Account status",
      value: profile.is_active ? "Active" : "Deactivated",
    },
  ];

  return (
    <Screen width={1180}>
      <BackLink href="/admin/employees">Employees</BackLink>

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
            <Pill tone={profile.is_active ? "ok" : "ink"}>
              {profile.is_active ? "Active" : "Deactivated"}
            </Pill>
          </div>
          <span className="text-ink-600 text-[13px] font-normal">
            {ACCESS_LEVEL_LABELS[level]} · joined {fmtDate(profile.created_at)}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Btn as="link" href="/admin/messages">
            <ChatIcon size={15} />
            Message
          </Btn>
          <EmployeePasswordReset employeeId={profile.id} />
          <EmployeeStatusButton
            employeeId={profile.id}
            isActive={profile.is_active}
          />
        </div>
      </div>

      <KpiGrid>
        <Kpi
          label="Open orders"
          value={open.length}
          meta="Currently New or In progress"
        />
        <Kpi
          label="Completed"
          value={completed.length}
          meta={`Of ${ordersCreated.length} created in total`}
        />
        <Kpi
          label="Conversations"
          value={assignmentCount}
          meta="Threads currently assigned"
        />
      </KpiGrid>

      <MoneyPanel
        title="Commission"
        pill={ACCESS_LEVEL_LABELS[level]}
        label="Total earned"
        total={gbp(commission)}
        note="Cleared earnings on completed orders"
        rows={[
          { label: "Gross sales closed", value: gbp(sold) },
          {
            label: "Average per completed order",
            value: gbp(completed.length ? commission / completed.length : 0),
          },
          {
            label: "Last completion",
            value: lastClosed
              ? `${gbp(lastClosed.commission ?? 0)} · ${fmtDate(lastClosed.closed_at ?? lastClosed.created_at)}`
              : "—",
          },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-4 min-[1240px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHead title="Orders created" />
          {ordersCreated.length === 0 ? (
            <p className="text-ink-600 m-0 px-5 py-10 text-center text-[13px]">
              This employee hasn&apos;t created any orders yet.
            </p>
          ) : (
            ordersCreated.map((o) => (
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

        <Card>
          <CardHead title="Details" />
          <div className="px-5 pt-3 pb-5">
            {fields.map((f) => (
              <DataRow
                key={f.label}
                label={f.label}
                value={f.value}
                icon={<Ico name={iconForField(f.label)} size={15} width={1.6} />}
              />
            ))}
            <DataRow
              label="Last activity"
              value={
                ordersCreated[0]
                  ? fmtRelative(ordersCreated[0].created_at)
                  : "No orders yet"
              }
              icon={<Ico name="clock" size={15} width={1.6} />}
            />
          </div>
        </Card>
      </div>
    </Screen>
  );
}
