"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTravelDetailsOverview,
  sendTravellerBirthdayWishes,
  deleteTraveller,
  type TravelDetailsOverview,
  type TravellerSendOutcome,
} from "@/lib/actions/travellers";
import {
  BIRTHDAY_WINDOW_DAYS,
  TRAVEL_WEEK_DAYS,
  addDaysISO,
  departsIn,
  relationLine,
  type BirthdayStatus,
  type TravelWindow,
  type TravellerListItem,
} from "@/lib/travellers";
import { fmtBirthday, fmtDaysUntil } from "@/lib/birthdays";
import { fmtDate, fmtRelative, routeLabel } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Btn,
  Card,
  CardHead,
  EmptyState,
  Kpi,
  KpiSkeleton,
  PageHead,
  Pill,
  Screen,
  Table,
  TableFoot,
  TableScroll,
  TableSkeleton,
  Td,
  Th,
  Thead,
  Tr,
  ViewButton,
  inputInsetClass,
  type PillTone,
} from "@/components/admin/ui";
import { LoadMore } from "@/components/admin/load-more";
import { Sheet, SheetFoot, SheetHead } from "@/components/admin/sheet";
import { TravellerForm } from "@/components/admin/traveller-form";
import {
  AlertIcon,
  CakeIcon,
  CalendarIcon,
  ExportIcon,
  FlightIcon,
  IdCardIcon,
  PlaneIcon,
  PlusIcon,
  SendIcon,
} from "@/components/admin/icons";
import { DeleteRowButton } from "@/components/admin/delete-row";

const KEY = ["admin", "travel-details"] as const;
const PAGE_SIZE = 15;

type Tab = "all" | TravelWindow | "birthdays" | "missing";
type Sort = "recent" | "name" | "birthday";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Travelling today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "This week" },
  { value: "birthdays", label: "Birthdays soon" },
  { value: "missing", label: "Missing details" },
];

const isTravelTab = (tab: Tab): tab is TravelWindow => tab === "today" || tab === "tomorrow" || tab === "week";

/** "Fri 25 Sep". The date is a calendar day, so format it in UTC. */
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`)
  );

const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Recent trip" },
  { value: "name", label: "Name" },
  { value: "birthday", label: "Birthday" },
];

const isBirthdaySoon = (t: TravellerListItem) =>
  !!t.birthday && t.birthday.daysUntil <= BIRTHDAY_WINDOW_DAYS;
const isMissing = (t: TravellerListItem) => !t.dateOfBirth || (!t.email && !t.phone);

export default function TravelDetailsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: KEY,
    queryFn: getTravelDetailsOverview,
  });

  // The top bar hands this screen its search as ?q= (SEARCH in admin-shell).
  const topSearch = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(topSearch);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(topSearch);
  }, [topSearch]);

  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [adding, setAdding] = useState(false);

  // Tell the admin once when a visit pulled new people in from bookings.
  const announced = useRef(false);
  useEffect(() => {
    if (!data || announced.current) return;
    announced.current = true;
    if (data.imported > 0) {
      toast.success(
        `${data.imported} ${data.imported === 1 ? "person" : "people"} added from your bookings`,
        { description: "Customers and everyone travelling on their orders are saved automatically." }
      );
    }
  }, [data]);

  const all = useMemo(() => data?.items ?? [], [data]);

  const matches = useMemo(() => {
    // Every word must match somewhere, so "khan dubai" finds the Khan who
    // flew to Dubai rather than every Khan and everyone who went to Dubai.
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (t: TravellerListItem) => words.every((w) => t.haystack.includes(w));
  }, [query]);

  const searched = useMemo(() => all.filter(matches), [all, matches]);

  // The server's today (UK time), so every admin sees the same "today".
  const todayISO = data?.todayISO ?? "";
  const inTab = useMemo(() => {
    return (t: TravellerListItem, which: Tab) =>
      which === "all"
        ? true
        : which === "birthdays"
          ? isBirthdaySoon(t)
          : which === "missing"
            ? isMissing(t)
            : // nextTrip is their earliest trip from today on, so it is the
              // one that decides today / tomorrow / this week.
              departsIn(t.nextTrip?.travelDate, todayISO, which);
  }, [todayISO]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((x) => [x.value, searched.filter((t) => inTab(t, x.value)).length])) as Record<Tab, number>,
    [searched, inTab]
  );

  const rows = useMemo(() => {
    const list = searched.filter((t) => inTab(t, tab));
    const byName = (a: TravellerListItem, b: TravellerListItem) => a.fullName.localeCompare(b.fullName);
    if (sort === "name") return list.sort(byName);
    if (sort === "birthday") {
      return list.sort(
        (a, b) => (a.birthday?.daysUntil ?? 999) - (b.birthday?.daysUntil ?? 999) || byName(a, b)
      );
    }
    if (isTravelTab(tab)) {
      return list.sort(
        (a, b) => (a.nextTrip?.travelDate ?? "").localeCompare(b.nextTrip?.travelDate ?? "") || byName(a, b)
      );
    }
    // Most recently travelled first; people with no trips yet by when saved.
    const stamp = (t: TravellerListItem) => t.nextTrip?.travelDate ?? t.lastTrip?.travelDate ?? t.createdAt;
    return list.sort((a, b) => stamp(b).localeCompare(stamp(a)) || byName(a, b));
  }, [searched, inTab, tab, sort]);

  /** Pick a filter from a card or a tab. Birthdays read best soonest first,
   *  and departures by date, so each brings its natural order with it. */
  function pickTab(next: Tab) {
    setTab(next);
    if (next === "birthdays") setSort("birthday");
    else if (isTravelTab(next) && sort === "birthday") setSort("recent");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(PAGE_SIZE);
  }, [tab, query, sort]);

  const visible = rows.slice(0, limit);

  function exportCsv() {
    downloadCsv(
      "travel-details.csv",
      [
        "Full name",
        "Preferred name",
        "Email",
        "Phone",
        "Date of birth",
        "Next birthday",
        "Nationality",
        "IBE number",
        "Books through",
        "Relationship",
        "Customer account",
        "Trips",
        "Last trip",
        "Last trip date",
        "Next trip",
        "Next trip date",
        "Marketing emails",
      ],
      rows.map((t) => [
        t.fullName,
        t.preferredName ?? "",
        t.email ?? "",
        t.phone ?? "",
        t.dateOfBirth ?? "",
        t.birthday?.date ?? "",
        t.nationality ?? "",
        t.ibeNumber ?? "",
        t.bookedBy?.name ?? "",
        t.relationship ?? "",
        t.customerId ? "Yes" : "No",
        t.tripCount,
        t.lastTrip ? routeLabel(t.lastTrip.from, t.lastTrip.to) : "",
        t.lastTrip?.travelDate ?? "",
        t.nextTrip ? routeLabel(t.nextTrip.from, t.nextTrip.to) : "",
        t.nextTrip?.travelDate ?? "",
        t.marketingOptOut ? "Opted out" : "Yes",
      ])
    );
  }

  const header = (
    <PageHead
      title="Travel details"
      intro="Everyone you book travel for, in one place — customers and the family and friends who travel with them. Search by name, email, phone, passport, order number or destination."
      actions={
        <>
          <Btn onClick={exportCsv} disabled={!data || rows.length === 0}>
            <ExportIcon size={15} />
            Export CSV
          </Btn>
          <Btn variant="ember" onClick={() => setAdding(true)} disabled={!data || data.setup}>
            <PlusIcon size={15} />
            Add traveller
          </Btn>
        </>
      }
    />
  );

  if (isLoading || (!data && !isError)) {
    return (
      <Screen>
        {header}
        <KpiSkeleton count={5} />
        <Card>
          <TableSkeleton rows={8} />
        </Card>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState
            title="Couldn't load Travel details"
            body="Something went wrong reading the directory. Refresh the page to try again."
          />
        </Card>
      </Screen>
    );
  }

  if (data.setup) {
    return (
      <Screen>
        {header}
        <Notice tone="danger" title="One database step before this screen can save anyone">
          Run <code>supabase/migrations/0025_travel_details.sql</code> in the Supabase SQL editor.
          It only adds new tables — nothing that exists today changes. The moment it is in, this
          screen fills itself from your existing customers and bookings.
        </Notice>
      </Screen>
    );
  }

  const withBirthday = all.filter((t) => t.dateOfBirth).length;

  return (
    <Screen>
      {header}

      {data.importError ? (
        <Notice tone="warn" title="Couldn't read your latest bookings">
          Everyone already saved is shown below. New bookings will be picked up on your next visit.
          ({data.importError})
        </Notice>
      ) : data.importPending ? (
        <Notice tone="warn" title="Still reading older bookings">
          There were a lot to go through, so more people will appear the next time you open this screen.
        </Notice>
      ) : null}

      {/* Five figures, each one also a shortcut: clicking a card shows exactly
          those people in the table below (click it again to show everyone). */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[
          {
            tab: "today" as const,
            label: "Travelling today",
            meta: dayLabel(todayISO),
            tone: "teal" as const,
            icon: <PlaneIcon size={16} />,
          },
          {
            tab: "tomorrow" as const,
            label: "Travelling tomorrow",
            meta: dayLabel(addDaysISO(todayISO, 1)),
            tone: "marine" as const,
            icon: <FlightIcon size={16} />,
          },
          {
            tab: "week" as const,
            label: "Travelling this week",
            meta: `${dayLabel(todayISO)} – ${dayLabel(addDaysISO(todayISO, TRAVEL_WEEK_DAYS - 1))}`,
            tone: "violet" as const,
            icon: <CalendarIcon size={16} />,
          },
          {
            tab: "birthdays" as const,
            label: "Birthdays soon",
            meta: `Next ${BIRTHDAY_WINDOW_DAYS} days · ${withBirthday} on file`,
            tone: "warn" as const,
            icon: <CakeIcon size={16} />,
          },
          {
            tab: "missing" as const,
            label: "Missing details",
            meta: "No birthday, or no way to contact",
            tone: all.some(isMissing) ? ("danger" as const) : ("ok" as const),
            icon: <IdCardIcon size={16} />,
          },
        ].map((k) => {
          const active = tab === k.tab;
          return (
            <button
              key={k.tab}
              type="button"
              aria-pressed={active}
              title={active ? "Show everyone" : `Show only: ${k.label.toLowerCase()}`}
              onClick={() => pickTab(active ? "all" : k.tab)}
              className={cn(
                "min-w-0 rounded-[12px] text-left outline-none transition-[box-shadow,transform] duration-150 [&>div]:h-full",
                "hover:-translate-y-px focus-visible:ring-marine-500 focus-visible:ring-2 focus-visible:ring-offset-2",
                active && "ring-ink-800 ring-2"
              )}
            >
              <Kpi
                compact
                label={k.label}
                value={all.filter((t) => inTab(t, k.tab)).length}
                meta={k.meta}
                tone={k.tone}
                icon={k.icon}
              />
            </button>
          );
        })}
      </div>

      <Card>
        <div className="border-line-soft flex flex-wrap items-center gap-3 border-b px-5 py-4">
          <div className="relative flex min-w-0 flex-[1_1_260px] sm:max-w-[380px]">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search travellers"
              placeholder="Name, email, phone, passport, order no. or place"
              className={`${inputInsetClass} focus:border-marine-500 focus:shadow-[0_0_0_3px_var(--color-marine-200)]`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickTab(t.value)}
                  className={cn(
                    "flex h-[34px] items-center gap-2 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap outline-none",
                    active
                      ? "border-ink-800 bg-ink-800 text-white"
                      : "border-line-field text-ink-800 hover:bg-surface-1 bg-white"
                  )}
                >
                  {t.label}
                  <span className="text-[11px] font-medium tabular-nums opacity-[0.66]">{counts[t.value]}</span>
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span id="td-sort-label" className="text-ink-500 text-[10.5px] font-medium tracking-[0.09em] uppercase">
              Sort
            </span>
            <div
              role="group"
              aria-labelledby="td-sort-label"
              className="border-line-field flex items-center gap-1 rounded-full border bg-white p-[3px]"
            >
              {SORTS.map((s) => {
                const active = sort === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSort(s.value)}
                    className={cn(
                      "flex h-[26px] items-center rounded-full px-3 text-[12px] font-medium whitespace-nowrap outline-none",
                      active ? "bg-marine-tint text-marine-600" : "text-ink-600 hover:text-ink-800"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={
              all.length === 0
                ? "Nobody saved yet"
                : isTravelTab(tab) && !query.trim()
                  ? `Nobody travelling ${tab === "week" ? "this week" : tab}`
                  : "Nobody matches"
            }
            body={
              all.length === 0
                ? "Customers and everyone on their bookings appear here automatically. You can also add someone by hand."
                : isTravelTab(tab) && !query.trim()
                  ? "Departures come from the travel date on each booking. Cancelled bookings aren't counted."
                  : "Try part of a name, an email, a phone number, an order number like 7343490, or a place like DXB."
            }
            action={
              all.length === 0 ? (
                <Btn variant="ember" onClick={() => setAdding(true)}>
                  <PlusIcon size={15} />
                  Add traveller
                </Btn>
              ) : (
                <Btn
                  onClick={() => {
                    setQuery("");
                    setTab("all");
                  }}
                >
                  Clear search and filters
                </Btn>
              )
            }
          />
        ) : (
          <>
            <TableScroll>
              <Table min={1040}>
                <Thead>
                  <Th>Traveller</Th>
                  <Th>Contact</Th>
                  <Th>Birthday</Th>
                  <Th>{isTravelTab(tab) ? "Next trip" : "Last trip"}</Th>
                  <Th align="right">Trips</Th>
                  <Th align="right" />
                </Thead>
                <tbody>
                  {visible.map((t) => (
                    <TravellerRow
                      key={t.id}
                      t={t}
                      showNext={isTravelTab(tab)}
                      onOpen={() => router.push(`/admin/travel-details/${t.id}`)}
                      onDeleted={() => queryClient.invalidateQueries({ queryKey: KEY })}
                    />
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <TableFoot
              shown={visible.length}
              total={rows.length}
              noun={rows.length === 1 ? "person" : "people"}
              action={
                rows.length > limit ? (
                  <LoadMore
                    remaining={rows.length - limit}
                    pageSize={PAGE_SIZE}
                    noun="people"
                    onLoad={() => setLimit((l) => l + PAGE_SIZE)}
                  />
                ) : undefined
              }
            />
          </>
        )}
      </Card>

      <BirthdaysCard data={data} onSent={() => queryClient.invalidateQueries({ queryKey: KEY })} />

      <TravellerForm
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(id) => {
          setAdding(false);
          queryClient.invalidateQueries({ queryKey: KEY });
          router.push(`/admin/travel-details/${id}`);
        }}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------ rows */

function TravellerRow({
  t,
  showNext,
  onOpen,
  onDeleted,
}: {
  t: TravellerListItem;
  showNext: boolean;
  onOpen: () => void;
  onDeleted: () => void;
}) {
  const sub = t.customerId ? null : relationLine(t.relationship, t.bookedBy?.name);
  const trip = showNext ? t.nextTrip : t.lastTrip;
  return (
    <Tr onClick={onOpen}>
      <Td>
        <Link
          href={`/admin/travel-details/${t.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-ink-800 flex items-center gap-3 no-underline hover:no-underline"
        >
          <Avatar name={t.fullName} size={32} />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="flex items-center gap-2">
              <span className="max-w-[240px] truncate text-[13px] font-medium">{t.fullName}</span>
              {t.customerId ? (
                <Pill tone="marine" className="px-2 py-[2px] text-[10.5px]">
                  Customer
                </Pill>
              ) : null}
            </span>
            {sub ? <span className="text-ink-500 mt-0.5 max-w-[280px] truncate text-[11.5px]">{sub}</span> : null}
          </span>
        </Link>
      </Td>
      <Td>
        <span className="flex flex-col leading-tight">
          <span className="text-ink-700 max-w-[220px] truncate text-[12.5px]">{t.email ?? "No email"}</span>
          <span className="text-ink-500 mt-0.5 text-[11.5px] tabular-nums">{t.phone ?? "No phone"}</span>
        </span>
      </Td>
      <Td className="tabular-nums">
        {t.dateOfBirth ? (
          <span className="flex flex-col leading-tight">
            <span className="text-ink-800 text-[12.5px]">{fmtBirthday(t.dateOfBirth)}</span>
            <span
              className={cn(
                "mt-0.5 text-[11.5px]",
                isBirthdaySoon(t) ? "text-warn-ink font-medium" : "text-ink-500"
              )}
            >
              {t.birthday && isBirthdaySoon(t)
                ? `${fmtDaysUntil(t.birthday.daysUntil)}${t.birthday.turning ? ` · turns ${t.birthday.turning}` : ""}`
                : t.birthday?.turning
                  ? `Age ${t.birthday.turning - 1}`
                  : ""}
            </span>
          </span>
        ) : (
          <span className="text-ink-450 text-[12.5px]">Not on file</span>
        )}
      </Td>
      <Td className="tabular-nums">
        {trip ? (
          <span className="flex flex-col leading-tight">
            <span className="text-ink-800 text-[12.5px] font-medium">{routeLabel(trip.from, trip.to)}</span>
            <span className="text-ink-500 mt-0.5 text-[11.5px]">
              {trip.travelDate ? fmtDate(trip.travelDate) : "Date to confirm"} · {trip.orderNumber}
            </span>
          </span>
        ) : (
          <span className="text-ink-450 text-[12.5px]">No trips yet</span>
        )}
      </Td>
      <Td align="right" className="font-semibold tabular-nums">
        {t.tripCount}
      </Td>
      <Td align="right" onClick={(e) => e.stopPropagation()}>
        <span className="inline-flex items-center gap-2">
          <DeleteRowButton
            what="traveller"
            name={t.fullName}
            body={`This permanently removes ${t.fullName} and their trip history from Travel details. Orders are not affected. This can't be undone.`}
            action={() => deleteTraveller(t.id)}
            onDeleted={onDeleted}
          />
          <ViewButton href={`/admin/travel-details/${t.id}`} />
        </span>
      </Td>
    </Tr>
  );
}

/* ------------------------------------------------------------- birthdays */

const BDAY: Record<BirthdayStatus, { label: string; tone: PillTone }> = {
  ready: { label: "Ready", tone: "marine" },
  sent: { label: "Sent", tone: "ok" },
  failed: { label: "Failed — retry", tone: "danger" },
  no_email: { label: "No email", tone: "ink" },
  opted_out: { label: "Opted out", tone: "ink" },
  account: { label: "Via Birthdays", tone: "ink" },
};

const canSend = (t: TravellerListItem) => t.birthday?.status === "ready" || t.birthday?.status === "failed";

/**
 * Birthday wishes for the people the Birthdays screen can't reach: travellers
 * with no customer account. Account holders are listed too, so the picture is
 * complete, but they are wished from Birthdays — one place per person, so
 * nobody gets two cards.
 */
function BirthdaysCard({ data, onSent }: { data: TravelDetailsOverview; onSent: () => void }) {
  const rows = useMemo(
    () =>
      data.items
        .filter(isBirthdaySoon)
        .sort((a, b) => a.birthday!.daysUntil - b.birthday!.daysUntil || a.fullName.localeCompare(b.fullName)),
    [data.items]
  );
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<TravellerListItem[] | null>(null);
  const [result, setResult] = useState<TravellerSendOutcome | null>(null);

  // Drop anyone who can no longer be sent to after a refresh.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSel((s) => new Set([...s].filter((id) => rows.some((r) => r.id === id && canSend(r)))));
  }, [rows]);

  const send = useMutation({
    mutationFn: (ids: string[]) => sendTravellerBirthdayWishes({ travellerIds: ids }),
    onSuccess: (res) => {
      setConfirm(null);
      if (!res.ok) {
        toast.error("Couldn't send birthday wishes", { description: res.error });
        return;
      }
      const { sent, skipped, failed } = res.data;
      if (!failed.length && !skipped.length && !sent.some((s) => s.previewUrl)) {
        toast.success(`${sent.length} birthday ${sent.length === 1 ? "wish" : "wishes"} sent`);
      } else {
        setResult(res.data);
      }
      setSel(new Set());
      onSent();
    },
    onError: () => {
      setConfirm(null);
      toast.error("Couldn't send birthday wishes", { description: "Please try again." });
    },
  });

  const sendable = rows.filter(canSend);
  const allOn = sendable.length > 0 && sendable.every((r) => sel.has(r.id));
  const mailOff = data.mail.mode === "off";
  const box = "accent-marine-500 size-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Card>
      <CardHead
        title="Birthdays coming up"
        icon={<CakeIcon size={16} />}
        hint={
          mailOff
            ? "Email isn't set up on the server yet, so wishes can't be sent."
            : `The next ${BIRTHDAY_WINDOW_DAYS} days. Wishes use the message saved on the Birthdays screen. Customers with an account are wished from Birthdays.`
        }
        action={
          <>
            <Btn as="link" href="/admin/birthdays" size="sm">
              Edit the message
            </Btn>
            <Btn
              variant="ember"
              size="sm"
              disabled={sel.size === 0 || mailOff}
              onClick={() => setConfirm(rows.filter((r) => sel.has(r.id)))}
            >
              <SendIcon size={14} />
              Send wishes{sel.size ? ` (${sel.size})` : ""}
            </Btn>
          </>
        }
      />
      {rows.length === 0 ? (
        <p className="text-ink-600 m-0 px-5 py-10 text-center text-[13px]">
          No birthdays in the next {BIRTHDAY_WINDOW_DAYS} days. Add dates of birth to fill this in.
        </p>
      ) : (
        <TableScroll>
          <Table min={760}>
            <Thead>
              <Th className="w-[52px]">
                <input
                  type="checkbox"
                  aria-label="Select everyone who can be sent a wish"
                  className={box}
                  checked={allOn}
                  disabled={sendable.length === 0}
                  onChange={() => setSel(allOn ? new Set() : new Set(sendable.map((r) => r.id)))}
                />
              </Th>
              <Th>Traveller</Th>
              <Th>Email</Th>
              <Th>Birthday</Th>
              <Th align="right">Status</Th>
            </Thead>
            <tbody>
              {rows.map((r) => {
                const s = BDAY[r.birthday!.status];
                const enabled = canSend(r);
                return (
                  <Tr key={r.id} onClick={enabled ? () => toggle(r.id) : undefined} className={cn(!enabled && "opacity-75")}>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.fullName}`}
                        className={box}
                        checked={sel.has(r.id)}
                        disabled={!enabled}
                        onChange={() => toggle(r.id)}
                      />
                    </Td>
                    <Td>
                      <Link
                        href={r.customerId ? `/admin/customers/${r.customerId}` : `/admin/travel-details/${r.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-ink-800 flex items-center gap-3 no-underline hover:no-underline"
                      >
                        <Avatar name={r.fullName} size={30} />
                        <span className="text-[13px] font-medium">{r.fullName}</span>
                      </Link>
                    </Td>
                    <Td className="text-ink-600">{r.email ?? "—"}</Td>
                    <Td className="text-ink-600 tabular-nums">
                      <span className="flex flex-col leading-tight">
                        <span className="text-ink-800">{fmtBirthday(r.birthday!.date)}</span>
                        <span className="text-[11.5px]">
                          {fmtDaysUntil(r.birthday!.daysUntil)}
                          {r.birthday!.turning ? ` · turns ${r.birthday!.turning}` : ""}
                        </span>
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="inline-flex flex-col items-end gap-1" title={r.birthday!.error ?? undefined}>
                        <Pill tone={s.tone}>{s.label}</Pill>
                        {r.birthday!.sentAt ? (
                          <span className="text-ink-500 text-[11px]">{fmtRelative(r.birthday!.sentAt)}</span>
                        ) : null}
                      </span>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableScroll>
      )}

      <ConfirmSend
        rows={confirm}
        testMode={data.mail.mode === "test"}
        busy={send.isPending}
        onClose={() => !send.isPending && setConfirm(null)}
        onConfirm={() => confirm && send.mutate(confirm.map((r) => r.id))}
      />
      <SendResult result={result} onClose={() => setResult(null)} />
    </Card>
  );
}

function ConfirmSend({
  rows,
  testMode,
  busy,
  onClose,
  onConfirm,
}: {
  rows: TravellerListItem[] | null;
  testMode: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const n = rows?.length ?? 0;
  const names = (rows ?? []).map((r) => r.fullName);
  return (
    <Sheet open={!!rows} onClose={onClose} labelledBy={id} width={500}>
      <SheetHead
        icon={<CakeIcon size={20} />}
        title={`Send ${n} birthday ${n === 1 ? "wish" : "wishes"}?`}
        subtitle={
          testMode
            ? "Test mode: these go to the Ethereal test inbox, not to the travellers."
            : "Each person gets their own email, using the message saved on the Birthdays screen."
        }
        titleId={id}
        onClose={onClose}
      />
      <div className="text-ink-700 min-h-0 flex-1 overflow-y-auto px-6 py-5 text-[13px] leading-[1.6]">
        {names.slice(0, 12).join(", ")}
        {n > 12 ? ` and ${n - 12} more` : ""}
      </div>
      <SheetFoot note="Nobody is wished twice for the same birthday.">
        <Btn onClick={onClose} disabled={busy}>
          Cancel
        </Btn>
        <Btn variant="ember" onClick={onConfirm} pending={busy} pendingLabel="Sending…">
          <SendIcon size={15} />
          Send {n} {n === 1 ? "email" : "emails"}
        </Btn>
      </SheetFoot>
    </Sheet>
  );
}

function SendResult({ result, onClose }: { result: TravellerSendOutcome | null; onClose: () => void }) {
  const id = useId();
  if (!result) return null;
  const { sent, skipped, failed } = result;
  const lines = [
    ...sent.map((s) => ({ name: s.name, tone: "ok" as const, label: "Sent", detail: null, url: s.previewUrl })),
    ...failed.map((f) => ({ name: f.name, tone: "danger" as const, label: "Failed", detail: f.error, url: null })),
    ...skipped.map((s) => ({ name: s.name, tone: "ink" as const, label: "Skipped", detail: s.reason, url: null })),
  ];
  return (
    <Sheet open onClose={onClose} labelledBy={id} width={560}>
      <SheetHead
        icon={<SendIcon size={20} />}
        title={`${sent.length} sent${failed.length ? ` · ${failed.length} failed` : ""}${skipped.length ? ` · ${skipped.length} skipped` : ""}`}
        titleId={id}
        onClose={onClose}
        tone={failed.length ? "danger" : "marine"}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto text-[13px]">
        {lines.map((r, i) => (
          <div key={i} className="border-line-soft flex items-center gap-3 border-t px-6 py-3 first:border-t-0">
            <Avatar name={r.name} size={28} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-ink-800 truncate font-medium">{r.name}</span>
              {r.detail ? <span className="text-ink-500 text-[12px] break-words">{r.detail}</span> : null}
            </span>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-marine-600 text-[12px] font-medium whitespace-nowrap">
                Open preview ↗
              </a>
            ) : null}
            <Pill tone={r.tone}>{r.label}</Pill>
          </div>
        ))}
      </div>
      <SheetFoot>
        <Btn variant="marine" onClick={onClose}>
          Done
        </Btn>
      </SheetFoot>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- notice */

function Notice({
  tone,
  title,
  children,
}: {
  tone: "warn" | "danger";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-[12px] border px-5 py-4 text-[13px] leading-[1.55]",
        tone === "warn"
          ? "bg-warn-bg text-warn-ink border-[color-mix(in_oklch,currentColor_22%,transparent)]"
          : "bg-danger-bg text-danger-ink border-danger-line"
      )}
    >
      <span className="mt-0.5 flex-none">
        <AlertIcon size={16} />
      </span>
      <div className="[&_code]:rounded [&_code]:bg-white/70 [&_code]:px-1 [&_code]:text-[12px]">
        <strong className="font-semibold">{title}.</strong> {children}
      </div>
    </div>
  );
}

