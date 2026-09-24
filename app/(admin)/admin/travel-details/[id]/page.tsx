import Link from "next/link";
import { notFound } from "next/navigation";
import { getTravellerDetail } from "@/lib/actions/travellers";
import { fmtBirthday, fmtDaysUntil } from "@/lib/birthdays";
import { fmtDate, fmtRelative, gbp, routeLabel, statusLabel } from "@/lib/format";
import { cabinLabel } from "@/lib/orders/form";
import {
  ROLE_LABEL,
  SOURCE_LABEL,
  ageOn,
  passportState,
  relationLine,
} from "@/lib/travellers";
import {
  BackLink,
  Btn,
  Card,
  CardHead,
  DataRow,
  Kpi,
  KpiGrid,
  PageTitle,
  Pill,
  Screen,
  avatarFor,
  initialsOf,
  shadowE1,
} from "@/components/admin/ui";
import { Ico, iconForField, ChatIcon, UserIcon } from "@/components/admin/icons";
import { TravellerActions, TravellerBirthdaySend } from "@/components/admin/traveller-actions";

export default async function TravellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTravellerDetail(id);
  if (!t) notFound();

  const tint = avatarFor(t.fullName);
  const travelled = t.trips.filter((x) => x.role !== "booker" && x.status !== "cancelled");
  const past = travelled.filter((x) => x.travelDate && x.travelDate < t.todayISO);
  const upcoming = travelled
    .filter((x) => x.travelDate && x.travelDate >= t.todayISO)
    .sort((a, b) => a.travelDate!.localeCompare(b.travelDate!));
  const lastTrip = past[0] ?? null;
  const nextTrip = upcoming[0] ?? null;
  const lastBooking = [...t.trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const age = ageOn(t.dateOfBirth, t.todayISO);
  const passport = passportState(t.passportExpiry, t.todayISO);
  const relation = t.account ? null : relationLine(t.relationship, t.bookedBy?.name);
  const message = t.account?.conversationId ?? t.bookedBy?.conversationId ?? null;
  const firstName = (t.preferredName || t.fullName).trim().split(/\s+/)[0];

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Email", value: t.email ? <a href={`mailto:${t.email}`}>{t.email}</a> : "—" },
    { label: "Phone", value: t.phone ? <a href={`tel:${t.phone.replace(/\s/g, "")}`}>{t.phone}</a> : "—" },
    {
      label: "Date of birth",
      value: t.dateOfBirth ? `${fmtDate(t.dateOfBirth)}${age != null ? ` · age ${age}` : ""}` : "—",
    },
    { label: "Nationality", value: t.nationality ?? "—" },
    { label: "Passport number", value: t.passportNumber ?? "—" },
    {
      label: "Passport expiry",
      value: t.passportExpiry ? (
        <span className="flex flex-wrap items-center gap-2">
          {fmtDate(t.passportExpiry)}
          {passport === "expired" ? (
            <Pill tone="danger">Expired</Pill>
          ) : passport === "soon" ? (
            <Pill tone="warn">Under 6 months left</Pill>
          ) : null}
        </span>
      ) : (
        "—"
      ),
    },
    { label: "Address", value: t.address ? <span className="whitespace-pre-line">{t.address}</span> : "—" },
  ];

  return (
    <Screen width={1180}>
      <BackLink href="/admin/travel-details">Travel details</BackLink>

      {/* ------------------------------------------------------ profile head */}
      <div
        className={`border-line-base flex flex-wrap items-center gap-4 rounded-[12px] border bg-white p-[clamp(18px,2.2vw,24px)] ${shadowE1}`}
      >
        <span
          style={{ background: tint.ink }}
          className="flex size-[58px] flex-none items-center justify-center rounded-full text-[18px] font-medium text-white"
        >
          {initialsOf(t.fullName)}
        </span>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <PageTitle>{t.fullName}</PageTitle>
            {t.account ? <Pill tone="marine">Customer account</Pill> : <Pill tone="ink">Traveller</Pill>}
            {t.marketingOptOut ? <Pill tone="ink">No marketing emails</Pill> : null}
          </div>
          <span className="text-ink-600 text-[13px] font-normal">
            {[
              t.preferredName ? `Goes by ${t.preferredName}` : null,
              relation,
              `${SOURCE_LABEL[t.source]} · saved ${fmtDate(t.createdAt)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {message ? (
            <Btn as="link" href={`/admin/messages?c=${message}`}>
              <ChatIcon size={15} />
              {t.account ? "Message" : `Message ${t.bookedBy?.name.split(" ")[0] ?? "booker"}`}
            </Btn>
          ) : null}
          <TravellerActions
            id={t.id}
            name={t.fullName}
            form={t.form}
            isAccountHolder={!!t.account}
          />
        </div>
      </div>

      <KpiGrid>
        <Kpi
          label="Trips"
          value={travelled.length}
          meta={
            t.trips.some((x) => x.role === "booker")
              ? `Plus ${t.trips.filter((x) => x.role === "booker").length} booked for others`
              : travelled.length
                ? `${upcoming.length} upcoming`
                : "No trips yet"
          }
          icon={<Ico name="flight" size={18} />}
        />
        <Kpi
          label="Last trip"
          value={lastTrip ? routeLabel(lastTrip.from, lastTrip.to) : "—"}
          meta={
            lastTrip
              ? `${fmtDate(lastTrip.travelDate)} · ${lastTrip.orderNumber}`
              : lastBooking
                ? `Last booking ${fmtDate(lastBooking.createdAt)}`
                : "Nothing booked yet"
          }
          tone="teal"
          icon={<Ico name="clock" size={18} />}
        />
        <Kpi
          label="Next trip"
          value={nextTrip ? routeLabel(nextTrip.from, nextTrip.to) : "—"}
          meta={nextTrip ? `${fmtDate(nextTrip.travelDate)} · ${nextTrip.orderNumber}` : "Nothing coming up"}
          tone="violet"
          icon={<Ico name="plane" size={18} />}
        />
        <Kpi
          label="Birthday"
          value={t.dateOfBirth ? fmtBirthday(t.dateOfBirth) : "—"}
          meta={
            t.birthday
              ? `${fmtDaysUntil(t.birthday.daysUntil)}${t.birthday.turning ? ` · turns ${t.birthday.turning}` : ""}`
              : "Not on file — edit to add it"
          }
          tone="warn"
          icon={<Ico name="cake" size={18} />}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 items-start gap-4 min-[1240px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* --------------------------------------------------- trip history */}
        <Card>
          <CardHead
            title="Trip history"
            hint="Every booking they were on, newest departure first."
            icon={<Ico name="route" size={16} />}
          />
          {t.trips.length === 0 ? (
            <p className="text-ink-600 m-0 px-5 py-10 text-center text-[13px]">
              No bookings yet. Their trips appear here automatically once they are on an order.
            </p>
          ) : (
            t.trips.map((trip) => (
              <Link
                key={trip.orderId}
                href={`/admin/orders/${trip.orderId}`}
                className="border-line-soft hover:bg-surface-1 flex w-full items-start gap-4 border-b px-5 py-3.5 text-left no-underline last:border-b-0 hover:no-underline"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-marine-600 text-[12.5px] font-medium tabular-nums">{trip.orderNumber}</span>
                    <span className="text-ink-800 text-[13px] font-medium">{routeLabel(trip.from, trip.to)}</span>
                    <span className="text-ink-500 text-[11.5px]">{ROLE_LABEL[trip.role]}</span>
                  </span>
                  <span className="text-ink-600 text-[12.5px] font-normal">
                    {[
                      trip.travelDate ? fmtDate(trip.travelDate) : "Date to confirm",
                      trip.returnDate ? `back ${fmtDate(trip.returnDate)}` : null,
                      trip.airline,
                      trip.cabinClass ? cabinLabel(trip.cabinClass) : null,
                      trip.ibe ? `IBE ${trip.ibe}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {trip.companions.length ? (
                    <span className="text-ink-500 text-[12px]">
                      With {trip.companions.map((c) => c.name).join(", ")}
                    </span>
                  ) : null}
                  <span className="text-ink-450 text-[11.5px]">Booked {fmtRelative(trip.createdAt)}</span>
                </span>
                <span className="flex flex-none flex-col items-end gap-1.5">
                  <Pill>{statusLabel(trip.status)}</Pill>
                  <span className="text-ink-800 text-[13px] font-medium tabular-nums">
                    {trip.sellingPrice != null ? gbp(trip.sellingPrice) : ""}
                  </span>
                </span>
              </Link>
            ))
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHead title="Personal details" icon={<UserIcon size={16} />} />
            <div className="px-5 pt-3 pb-5">
              {details.map((f) => (
                <DataRow
                  key={f.label}
                  label={f.label}
                  value={f.value}
                  icon={<Ico name={iconForField(f.label)} size={15} width={1.6} />}
                />
              ))}
            </div>
          </Card>

          {t.birthday ? (
            <TravellerBirthdaySend
              id={t.id}
              name={t.fullName}
              birthday={t.birthday}
              mailOff={t.mail.mode === "off"}
              customerId={t.account?.id ?? null}
            />
          ) : null}

          <Card>
            <CardHead title="Family & relatives" icon={<Ico name="parents" size={16} />} />
            <div className="flex flex-col">
              {t.account ? (
                <PersonLink
                  href={`/admin/customers/${t.account.id}`}
                  name={t.account.name}
                  meta={t.account.hasLogin ? "Their customer account · can sign in" : "Their customer record"}
                />
              ) : null}
              {t.bookedBy ? (
                <PersonLink
                  href={`/admin/customers/${t.bookedBy.id}`}
                  name={t.bookedBy.name}
                  meta={
                    t.relationship && t.relationship !== "Other"
                      ? `Books their travel · ${firstName} is their ${t.relationship.toLowerCase()}`
                      : "Books their travel"
                  }
                />
              ) : null}
              {t.booksFor.map((p) => (
                <PersonLink
                  key={p.id}
                  href={`/admin/travel-details/${p.id}`}
                  name={p.name}
                  meta={
                    p.relationship && p.relationship !== "Other"
                      ? `${firstName}'s ${p.relationship.toLowerCase()} · ${firstName} books for them`
                      : `${firstName} books for them`
                  }
                />
              ))}
              {t.travelsWith
                .filter((p) => !t.booksFor.some((b) => b.id === p.id))
                .map((p) => (
                  <PersonLink
                    key={p.id}
                    href={`/admin/travel-details/${p.id}`}
                    name={p.name}
                    meta={`Travelled together ${p.trips} ${p.trips === 1 ? "time" : "times"}`}
                  />
                ))}
              {!t.account && !t.bookedBy && t.booksFor.length === 0 && t.travelsWith.length === 0 ? (
                <p className="text-ink-600 m-0 px-5 py-8 text-center text-[13px]">
                  No relatives on record. Edit to set who books for them.
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHead title="Notes" icon={<Ico name="chat" size={16} />} />
            <p className="text-ink-700 m-0 px-5 py-4 text-[13px] leading-[1.6] whitespace-pre-line">
              {t.notes || "Nothing noted yet."}
            </p>
            <p className="text-ink-450 border-line-soft m-0 border-t px-5 py-3 text-[11.5px]">
              Last updated {fmtRelative(t.updatedAt)}
            </p>
          </Card>
        </div>
      </div>
    </Screen>
  );
}

function PersonLink({ href, name, meta }: { href: string; name: string; meta: string }) {
  const tint = avatarFor(name);
  return (
    <Link
      href={href}
      className="border-line-soft hover:bg-surface-1 flex items-center gap-3 border-b px-5 py-3 no-underline last:border-b-0 hover:no-underline"
    >
      <span
        style={{ background: tint.bg, color: tint.ink }}
        className="flex size-[30px] flex-none items-center justify-center rounded-full text-[11px] font-semibold"
      >
        {initialsOf(name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-ink-800 truncate text-[13px] font-medium">{name}</span>
        <span className="text-ink-500 truncate text-[12px]">{meta}</span>
      </span>
      <span className="text-marine-600 text-[12px] font-medium">Open →</span>
    </Link>
  );
}
