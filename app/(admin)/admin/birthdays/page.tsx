"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getBirthdayOverview,
  sendBirthdayWishes,
  type BirthdayOverview,
  type BirthdayRow,
  type BirthdayTemplate,
  type SendOutcome,
} from "@/lib/actions/birthdays";
import { fmtBirthday, fmtDaysUntil } from "@/lib/birthdays";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Btn,
  Card,
  CardHead,
  EmptyState,
  Kpi,
  KpiGrid,
  KpiSkeleton,
  PageHead,
  Pill,
  RowsSkeleton,
  Screen,
  Table,
  TableScroll,
  Td,
  Th,
  Thead,
  Tr,
  type PillTone,
} from "@/components/admin/ui";
import { Sheet, SheetFoot, SheetHead } from "@/components/admin/sheet";
import { BirthdayEditor } from "@/components/admin/birthday-editor";
import {
  AlertIcon,
  CakeIcon,
  CalendarIcon,
  ClockIcon,
  SendIcon,
  UserIcon,
} from "@/components/admin/icons";

const KEY = ["admin", "birthdays"] as const;
const MISSING_PAGE = 8;

export default function AdminBirthdaysPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: KEY, queryFn: getBirthdayOverview });

  const [savedTemplate, setSavedTemplate] = useState<BirthdayTemplate | null>(null);
  const [draft, setDraft] = useState<BirthdayTemplate | null>(null);
  const [todaySel, setTodaySel] = useState<Set<string>>(new Set());
  const [upcomingSel, setUpcomingSel] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<BirthdayRow[] | null>(null);
  const [result, setResult] = useState<SendOutcome | null>(null);
  const [missingShown, setMissingShown] = useState(MISSING_PAGE);

  // First load: seed the editor and pre-select everyone due today. Refetches
  // only drop rows that can no longer be sent, so an admin's un-ticks survive.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!data) return;
    const stillSendable = (rows: BirthdayRow[]) => (s: Set<string>) =>
      new Set([...s].filter((id) => rows.some((r) => r.customerId === id && canSend(r))));
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!seeded) {
      setSeeded(true);
      setSavedTemplate(data.template);
      setDraft(data.template);
      setTodaySel(new Set(data.today.filter(canSend).map((r) => r.customerId)));
    } else {
      setTodaySel(stillSendable(data.today));
    }
    setUpcomingSel(stillSendable(data.upcoming));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data, seeded]);

  const sendMutation = useMutation({
    mutationFn: (ids: string[]) => sendBirthdayWishes({ customerIds: ids }),
    onSuccess: (res) => {
      setConfirm(null);
      if (!res.ok) {
        toast.error("Couldn't send birthday wishes", { description: res.error });
        return;
      }
      const { sent, skipped, failed } = res.data;
      if (failed.length === 0 && skipped.length === 0 && !sent.some((s) => s.previewUrl)) {
        toast.success(`${sent.length} birthday ${sent.length === 1 ? "wish" : "wishes"} sent`);
      } else {
        setResult(res.data);
      }
      queryClient.invalidateQueries({ queryKey: KEY });
      router.refresh();
    },
    onError: () => {
      setConfirm(null);
      toast.error("Couldn't send birthday wishes", { description: "Please try again." });
    },
  });

  if (isLoading || (!data && !isError)) {
    return (
      <Screen>
        <PageHead title="Birthdays" intro="Loading birthdays…" />
        <KpiSkeleton />
        <Card>
          <RowsSkeleton rows={4} />
        </Card>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <PageHead title="Birthdays" />
        <Card>
          <EmptyState
            title="Couldn't load birthdays"
            body="Something went wrong reading the customer list. Refresh the page to try again."
          />
        </Card>
      </Screen>
    );
  }

  const next7 = data.upcoming.filter((r) => r.daysUntil <= 7).length;
  const templateDirty =
    !!draft &&
    !!savedTemplate &&
    (draft.subject !== savedTemplate.subject || draft.message !== savedTemplate.message);
  const sampleName = data.today[0]?.name ?? data.upcoming[0]?.name ?? "James Wilson";
  const [dd, mm] = [data.todayISO.slice(8), data.todayISO.slice(5, 7)];

  const pick = (rows: BirthdayRow[], sel: Set<string>) => rows.filter((r) => sel.has(r.customerId));

  return (
    <Screen>
      <PageHead
        title="Birthdays"
        intro="Send birthday wishes to your customers by email. Everyone whose birthday is today is ready to go — review the message below, then send."
      />

      <SetupNotice data={data} />

      <KpiGrid>
        <Kpi
          label="Today"
          value={data.today.length}
          tone="warn"
          icon={<CakeIcon size={18} />}
          meta={
            data.today.length
              ? `${data.today.filter((r) => r.status === "sent").length} already wished`
              : "No birthdays today"
          }
        />
        <Kpi
          label="Next 7 days"
          value={next7}
          icon={<CalendarIcon size={18} />}
          meta="Not counting today"
        />
        <Kpi
          label="Next 30 days"
          value={data.upcoming.length}
          tone="teal"
          icon={<CalendarIcon size={18} />}
          meta={`${data.withBirthdayCount} ${
            data.withBirthdayCount === 1 ? "customer has" : "customers have"
          } a birthday on file`}
        />
        <Kpi
          label="Missing a birthday"
          value={data.missingCount}
          tone={data.missingCount ? "danger" : "ok"}
          icon={<UserIcon size={18} />}
          meta={data.missingCount ? "They won't get wishes yet" : "Everyone is covered"}
        />
      </KpiGrid>

      {/* ----------------------------------------------------------- today */}
      <Card>
        <CardHead
          title={`Today · ${fmtBirthday(`2000-${mm}-${dd}`)}`}
          icon={<CakeIcon size={16} />}
          hint={
            data.today.length
              ? "Selected customers get the birthday message below."
              : undefined
          }
          action={
            data.today.length ? (
              <Btn
                variant="ember"
                disabled={todaySel.size === 0 || !!data.setup || data.mail.mode === "off"}
                onClick={() => setConfirm(pick(data.today, todaySel))}
              >
                <SendIcon size={15} />
                Send wishes{todaySel.size ? ` (${todaySel.size})` : ""}
              </Btn>
            ) : null
          }
        />
        {data.today.length === 0 ? (
          <EmptyState
            title="No birthdays today"
            body={
              data.upcoming.length
                ? `The next one is ${data.upcoming[0].name} on ${fmtBirthday(data.upcoming[0].date)}.`
                : "Nobody has a birthday in the next 30 days."
            }
          />
        ) : (
          <BirthdayTable rows={data.today} selected={todaySel} onSelect={setTodaySel} />
        )}
      </Card>

      {/* -------------------------------------------------------- upcoming */}
      <Card>
        <CardHead
          title="Coming up"
          icon={<CalendarIcon size={16} />}
          hint="The next 30 days. Select someone to send early — handy for weekends and holidays."
          action={
            upcomingSel.size ? (
              <Btn
                variant="marine"
                disabled={!!data.setup || data.mail.mode === "off"}
                onClick={() => setConfirm(pick(data.upcoming, upcomingSel))}
              >
                <SendIcon size={15} />
                Send early ({upcomingSel.size})
              </Btn>
            ) : null
          }
        />
        {data.upcoming.length === 0 ? (
          <EmptyState
            title="Nothing in the next 30 days"
            body="Birthdays appear here a month ahead. Add missing birthdays below to fill this in."
          />
        ) : (
          <BirthdayTable rows={data.upcoming} selected={upcomingSel} onSelect={setUpcomingSel} upcoming />
        )}
      </Card>

      {/* -------------------------------------------------------- template */}
      {draft && savedTemplate ? (
        <BirthdayEditor
          saved={savedTemplate}
          draft={draft}
          onDraft={setDraft}
          onSaved={(t) => {
            setSavedTemplate(t);
            setDraft(t);
            queryClient.invalidateQueries({ queryKey: KEY });
          }}
          brand={data.brand}
          sampleName={sampleName}
        />
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 min-[1240px]:grid-cols-2">
        {/* ------------------------------------------------------ missing */}
        <Card>
          <CardHead
            title="Missing a birthday"
            icon={<UserIcon size={16} />}
            hint="Open a customer to add their date of birth. Customers can also add it themselves from their Profile."
          />
          {data.missing.length === 0 ? (
            <p className="text-ink-600 m-0 px-5 py-10 text-center text-[13px]">
              Every customer has a birthday on file.
            </p>
          ) : (
            <>
              {data.missing.slice(0, missingShown).map((m) => (
                <Link
                  key={m.customerId}
                  href={`/admin/customers/${m.customerId}`}
                  className="border-line-soft hover:bg-marine-row flex items-center gap-3 border-t px-5 py-3 no-underline first:border-t-0 hover:no-underline"
                >
                  <Avatar name={m.name} size={30} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-ink-800 truncate text-[13px] font-medium">{m.name}</span>
                    <span className="text-ink-500 truncate text-[12px]">{m.email ?? "No email — lead only"}</span>
                  </span>
                  <span className="text-marine-600 text-[12px] font-medium whitespace-nowrap">
                    Add birthday →
                  </span>
                </Link>
              ))}
              {data.missingCount > missingShown ? (
                <div className="border-line-soft flex items-center justify-between gap-3 border-t px-5 py-3">
                  <span className="text-ink-600 text-[12.5px]">
                    Showing {Math.min(missingShown, data.missing.length)} of {data.missingCount}
                  </span>
                  {missingShown < data.missing.length ? (
                    <Btn size="sm" onClick={() => setMissingShown((n) => n + MISSING_PAGE * 2)}>
                      Show more
                    </Btn>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </Card>

        {/* ------------------------------------------------------ history */}
        <Card>
          <CardHead title="Recently sent" icon={<ClockIcon size={16} />} />
          {data.history.length === 0 ? (
            <p className="text-ink-600 m-0 px-5 py-10 text-center text-[13px]">
              No birthday wishes sent yet.
            </p>
          ) : (
            data.history.map((h) => (
              <div
                key={h.id}
                className="border-line-soft flex items-center gap-3 border-t px-5 py-3 first:border-t-0"
              >
                <Avatar name={h.name} size={30} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-ink-800 truncate text-[13px] font-medium">{h.name}</span>
                  <span className="text-ink-500 truncate text-[12px]" title={h.error ?? undefined}>
                    {h.status === "failed" ? `Failed: ${h.error ?? "unknown error"}` : h.email}
                  </span>
                </span>
                <span className="flex flex-none flex-col items-end gap-1">
                  <Pill tone={h.status === "sent" ? "ok" : "danger"}>
                    {h.status === "sent" ? "Sent" : "Failed"}
                  </Pill>
                  <span className="text-ink-500 text-[11px]">{fmtRelative(h.sentAt)}</span>
                </span>
              </div>
            ))
          )}
        </Card>
      </div>

      <ConfirmSend
        rows={confirm}
        subject={savedTemplate?.subject ?? data.template.subject}
        templateDirty={templateDirty}
        testMode={data.mail.mode === "test"}
        busy={sendMutation.isPending}
        onClose={() => !sendMutation.isPending && setConfirm(null)}
        onConfirm={() => confirm && sendMutation.mutate(confirm.map((r) => r.customerId))}
      />

      <SendResult result={result} onClose={() => setResult(null)} />
    </Screen>
  );
}

function canSend(r: BirthdayRow) {
  return r.status === "ready" || r.status === "failed";
}

const STATUS: Record<BirthdayRow["status"], { label: string; tone: PillTone }> = {
  ready: { label: "Ready", tone: "marine" },
  sent: { label: "Sent", tone: "ok" },
  failed: { label: "Failed — retry", tone: "danger" },
  no_email: { label: "No email", tone: "ink" },
  suspended: { label: "Suspended", tone: "ink" },
};

function BirthdayTable({
  rows,
  selected,
  onSelect,
  upcoming,
}: {
  rows: BirthdayRow[];
  selected: Set<string>;
  onSelect: (s: Set<string>) => void;
  upcoming?: boolean;
}) {
  const sendable = rows.filter(canSend);
  const allOn = sendable.length > 0 && sendable.every((r) => selected.has(r.customerId));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelect(next);
  }

  const box = "accent-marine-500 size-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <TableScroll>
      <Table min={760}>
        <Thead>
          <Th className="w-[52px]">
            <input
              type="checkbox"
              aria-label="Select all"
              className={box}
              checked={allOn}
              disabled={sendable.length === 0}
              onChange={() =>
                onSelect(allOn ? new Set() : new Set(sendable.map((r) => r.customerId)))
              }
            />
          </Th>
          <Th>Customer</Th>
          <Th>Email</Th>
          <Th>{upcoming ? "Birthday" : "Turning"}</Th>
          <Th align="right">Status</Th>
        </Thead>
        <tbody>
          {rows.map((r) => {
            const s = STATUS[r.status];
            const enabled = canSend(r);
            return (
              <Tr
                key={r.customerId}
                onClick={enabled ? () => toggle(r.customerId) : undefined}
                className={cn(!enabled && "opacity-75")}
              >
                <Td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.name}`}
                    className={box}
                    checked={selected.has(r.customerId)}
                    disabled={!enabled}
                    onChange={() => toggle(r.customerId)}
                  />
                </Td>
                <Td>
                  <Link
                    href={`/admin/customers/${r.customerId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-ink-800 flex items-center gap-3 no-underline hover:no-underline"
                  >
                    <Avatar name={r.name} size={30} />
                    <span className="text-[13px] font-medium">{r.name}</span>
                  </Link>
                </Td>
                <Td className="text-ink-600">{r.email ?? "—"}</Td>
                <Td className="text-ink-600 tabular-nums">
                  {upcoming ? (
                    <span className="flex flex-col leading-tight">
                      <span className="text-ink-800">{fmtBirthday(r.date)}</span>
                      <span className="text-[11.5px]">
                        {fmtDaysUntil(r.daysUntil)}
                        {r.turning ? ` · turns ${r.turning}` : ""}
                      </span>
                    </span>
                  ) : r.turning ? (
                    r.turning
                  ) : (
                    "—"
                  )}
                </Td>
                <Td align="right">
                  <span className="inline-flex flex-col items-end gap-1" title={r.error ?? undefined}>
                    <Pill tone={s.tone}>{s.label}</Pill>
                    {r.sentAt ? (
                      <span className="text-ink-500 text-[11px]">{fmtRelative(r.sentAt)}</span>
                    ) : null}
                  </span>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </TableScroll>
  );
}

function SetupNotice({ data }: { data: BirthdayOverview }) {
  if (data.setup) {
    return (
      <Notice tone="danger" title="One database step before sending">
        Run <code>supabase/migrations/{data.setup === "0022" ? "0022_person_fields" : "0023_birthday_wishes"}.sql</code>{" "}
        in the Supabase SQL editor. Until then birthdays can be viewed but not sent, so nobody
        can be wished twice.
      </Notice>
    );
  }
  if (data.mail.mode === "test") {
    return (
      <Notice tone="warn" title="Test mode — emails are not delivered">
        No SMTP settings are configured, so wishes go to a private Ethereal test inbox and you get
        a preview link instead. Add <code>SMTP_HOST</code>, <code>SMTP_USER</code>,{" "}
        <code>SMTP_PASS</code> and <code>EMAIL_FROM</code> to send for real.
      </Notice>
    );
  }
  if (data.mail.mode === "off") {
    return (
      <Notice tone="danger" title="Email isn't set up">
        Add the SMTP settings (<code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>,{" "}
        <code>EMAIL_FROM</code>) to the server environment to start sending birthday wishes.
      </Notice>
    );
  }
  return null;
}

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

function ConfirmSend({
  rows,
  subject,
  templateDirty,
  testMode,
  busy,
  onClose,
  onConfirm,
}: {
  rows: BirthdayRow[] | null;
  subject: string;
  templateDirty: boolean;
  testMode: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const names = useMemo(() => (rows ?? []).map((r) => r.name), [rows]);
  const n = names.length;
  return (
    <Sheet open={!!rows} onClose={onClose} labelledBy={id} width={500}>
      <SheetHead
        icon={<CakeIcon size={20} />}
        title={`Send ${n} birthday ${n === 1 ? "wish" : "wishes"}?`}
        subtitle={
          testMode
            ? "Test mode: these go to the Ethereal test inbox, not to the customers."
            : "Each customer gets their own personal email."
        }
        titleId={id}
        onClose={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 text-[13px]">
        <div>
          <div className="text-ink-500 text-[11px] font-medium tracking-[0.09em] uppercase">Subject</div>
          <div className="text-ink-800 mt-1 font-medium">{subject}</div>
        </div>
        <div>
          <div className="text-ink-500 text-[11px] font-medium tracking-[0.09em] uppercase">To</div>
          <div className="text-ink-700 mt-1 leading-[1.6]">
            {names.slice(0, 12).join(", ")}
            {n > 12 ? ` and ${n - 12} more` : ""}
          </div>
        </div>
        {templateDirty ? (
          <p className="bg-warn-bg text-warn-ink m-0 rounded-[10px] px-4 py-3">
            You have unsaved changes to the message. The last saved version will be sent — save
            first if you want your edits used.
          </p>
        ) : null}
      </div>
      <SheetFoot note="A customer is never wished twice for the same birthday.">
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

function SendResult({ result, onClose }: { result: SendOutcome | null; onClose: () => void }) {
  const id = useId();
  if (!result) return null;
  const { sent, skipped, failed } = result;
  return (
    <Sheet open onClose={onClose} labelledBy={id} width={560}>
      <SheetHead
        icon={<SendIcon size={20} />}
        title={`${sent.length} sent${failed.length ? ` · ${failed.length} failed` : ""}${
          skipped.length ? ` · ${skipped.length} skipped` : ""
        }`}
        titleId={id}
        onClose={onClose}
        tone={failed.length ? "danger" : "marine"}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto text-[13px]">
        {[
          ...sent.map((s) => ({ name: s.name, tone: "ok" as const, label: "Sent", detail: null, url: s.previewUrl })),
          ...failed.map((f) => ({ name: f.name, tone: "danger" as const, label: "Failed", detail: f.error, url: null })),
          ...skipped.map((s) => ({ name: s.name, tone: "ink" as const, label: "Skipped", detail: s.reason, url: null })),
        ].map((r, i) => (
          <div key={i} className="border-line-soft flex items-center gap-3 border-t px-6 py-3 first:border-t-0">
            <Avatar name={r.name} size={28} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-ink-800 truncate font-medium">{r.name}</span>
              {r.detail ? <span className="text-ink-500 text-[12px] break-words">{r.detail}</span> : null}
            </span>
            {r.url ? (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-marine-600 text-[12px] font-medium whitespace-nowrap"
              >
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
