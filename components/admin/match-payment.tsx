"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  canReleaseContact,
  type PaymentMethod,
  type PaymentStatus,
  type ParentTicketMatch,
  type ReleasedContact,
} from "@/lib/parents-marketplace";
import {
  releaseMatchContact,
  saveMatchPayment,
  type MatchPayment,
} from "@/lib/actions/parents-payments";
import {
  Btn,
  Card,
  CardHead,
  Field,
  FieldLabel,
  MiniField,
  Pill,
  Spinner,
  focusRing,
  inputClass,
  textareaClass,
  type PillTone,
} from "@/components/admin/ui";
import {
  CalendarIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  PoundIcon,
  UnlockIcon,
  UserIcon,
} from "@/components/admin/icons";

const STATUS_TONE: Record<PaymentStatus, PillTone> = {
  unpaid: "ink",
  pending: "warn",
  paid: "ok",
  refunded: "violet",
  cancelled: "ink",
};

/** "£48.00" — money is ink and tabular everywhere; only commission gets a tint. */
function gbp(value: number): string {
  return `£${value.toFixed(2)}`;
}

/**
 * The money and the introduction, on one card, in that order.
 *
 * They belong together because they are one decision: the release button is
 * unreachable until a payment is marked paid, so putting them on separate
 * screens would mean an admin toggling between two places to complete a single
 * act. The gate itself is stated once, in canReleaseContact — this card and
 * the server action both read it, so the disabled state can never disagree
 * with what actually happens.
 *
 * Releasing is irreversible and the card says so before the click, not after.
 */
export function MatchPayment({
  match,
  payment,
  contacts,
}: {
  match: ParentTicketMatch;
  payment: MatchPayment | null;
  /** Populated only once released — the RPC returns nothing before that. */
  contacts: ReleasedContact[];
}) {
  const router = useRouter();

  const [gross, setGross] = useState(String(payment?.gross_amount ?? ""));
  const [commission, setCommission] = useState(
    String(payment?.commission_amount ?? "")
  );
  const [status, setStatus] = useState<PaymentStatus>(
    payment?.payment_status ?? "unpaid"
  );
  const [method, setMethod] = useState<PaymentMethod | "">(
    payment?.payment_method ?? ""
  );
  const [paidOn, setPaidOn] = useState(payment?.paid_at?.slice(0, 10) ?? "");
  const [note, setNote] = useState(payment?.reference_note ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const grossNum = Number(gross) || 0;
  const commissionNum = Number(commission) || 0;
  const payout = Math.max(0, Math.round((grossNum - commissionNum) * 100) / 100);
  const overCommission = commissionNum > grossNum;

  const gate = canReleaseContact(match, payment);
  const released = match.contact_released;

  async function save() {
    setBusy("save");
    const res = await saveMatchPayment({
      matchId: match.id,
      grossAmount: grossNum,
      commissionAmount: commissionNum,
      paymentStatus: status,
      paymentMethod: method || null,
      referenceNote: note,
      paidOn: paidOn || null,
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't save the payment", { description: res.error });
      return;
    }
    toast.success(`Payment recorded — ${res.data.reference}`);
    router.refresh();
  }

  async function release() {
    setBusy("release");
    const res = await releaseMatchContact(match.id);
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't release", { description: res.error });
      return;
    }
    setConfirming(false);
    toast.success("Introduced — both sides can now see each other's details");
    router.refresh();
  }

  return (
    <Card>
      <CardHead
        icon={<PoundIcon size={15} />}
        title="Payment and introduction"
        hint="Stage A — record money that moved outside the system. No card is taken here."
        action={
          payment ? (
            <Pill tone={STATUS_TONE[payment.payment_status]}>
              {PAYMENT_STATUS_LABELS[payment.payment_status]}
            </Pill>
          ) : (
            <Pill tone="ink">No payment yet</Pill>
          )
        }
      />

      {/* --------------------------------------------------------- the form */}
      <div className="flex flex-col gap-5 px-5 py-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
          <Field>
            <FieldLabel htmlFor="pay-gross" icon={<PoundIcon size={13} />}>
              Amount paid
            </FieldLabel>
            <input
              id="pay-gross"
              type="number"
              min={0}
              step="0.01"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              placeholder="60.00"
              className={cn(inputClass, focusRing, "tabular-nums")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="pay-commission" icon={<PoundIcon size={13} />}>
              Wicket commission
            </FieldLabel>
            <input
              id="pay-commission"
              type="number"
              min={0}
              step="0.01"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="12.00"
              className={cn(
                inputClass,
                focusRing,
                "tabular-nums",
                overCommission && "border-danger-ink"
              )}
            />
            {overCommission ? (
              <span className="text-danger-ink text-[11.5px] font-medium">
                More than the amount paid.
              </span>
            ) : null}
          </Field>

          <Field>
            <FieldLabel>Traveller receives</FieldLabel>
            <div className="border-line-hair bg-surface-4 text-ink-850 flex h-10 items-center rounded-[10px] border px-4 text-[13.5px] font-medium tabular-nums">
              {gbp(payout)}
            </div>
            <span className="text-ink-500 text-[11.5px] font-normal">
              Paid minus commission — worked out, not typed.
            </span>
          </Field>

          <Field>
            <FieldLabel htmlFor="pay-status">Status</FieldLabel>
            <select
              id="pay-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PaymentStatus)}
              className={cn(inputClass, focusRing, "cursor-pointer pr-9")}
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="pay-method" optional>
              How it moved
            </FieldLabel>
            <select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod | "")}
              className={cn(inputClass, focusRing, "cursor-pointer pr-9")}
            >
              <option value="">Not recorded</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="pay-date" icon={<CalendarIcon size={13} />} optional>
              Date received
            </FieldLabel>
            <input
              id="pay-date"
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              className={cn(inputClass, focusRing)}
            />
          </Field>

          <Field span="1 / -1">
            <FieldLabel htmlFor="pay-note" optional>
              Your reference
            </FieldLabel>
            <textarea
              id="pay-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Bank ref, receipt number, who confirmed it."
              className={cn(textareaClass, focusRing)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Btn onClick={save} disabled={!!busy || overCommission}>
            {busy === "save" ? <Spinner /> : null}
            {payment ? "Update payment" : "Record payment"}
          </Btn>
          {payment ? (
            <span className="text-ink-500 text-[12px] font-normal tabular-nums">
              {payment.reference_number}
              {payment.paid_at ? ` · received ${fmtDate(payment.paid_at)}` : ""}
            </span>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------- the release */}
      <div className="border-line-soft bg-surface-1 flex flex-col gap-4 border-t px-5 py-5">
        {released ? (
          <>
            <div className="text-ok-ink flex flex-wrap items-center gap-2.5 text-[13px] font-medium">
              <UnlockIcon size={16} />
              Introduced
              {match.contact_released_at
                ? ` on ${fmtDate(match.contact_released_at)}`
                : ""}{" "}
              — both sides can now see each other&apos;s details.
            </div>

            <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2">
              {contacts.map((c) => (
                <div
                  key={c.profile_id}
                  className="border-line-base flex flex-col gap-2 rounded-[12px] border bg-white px-4 py-3.5"
                >
                  <span className="text-ink-tertiary text-[10.5px] font-semibold tracking-[0.08em] uppercase">
                    {c.side === "traveller" ? "Traveller" : "Requester"}
                  </span>
                  <span className="text-ink-850 inline-flex items-center gap-2 text-[13.5px] font-medium">
                    <UserIcon size={14} />
                    {c.full_name ?? "Unnamed"}
                  </span>
                  {c.email ? (
                    <a
                      href={`mailto:${c.email}`}
                      className="text-marine-600 inline-flex items-center gap-2 text-[12.5px] font-normal"
                    >
                      <MailIcon size={14} />
                      {c.email}
                    </a>
                  ) : null}
                  {c.phone ? (
                    <a
                      href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}
                      className="text-marine-600 inline-flex items-center gap-2 text-[12.5px] font-normal"
                    >
                      <PhoneIcon size={14} />
                      {c.phone}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : confirming ? (
          <>
            <p className="text-ink-800 m-0 max-w-[70ch] text-[13px] leading-[1.6] font-normal text-pretty">
              <span className="font-medium">This can&apos;t be undone.</span> Once
              you release, each side can see the other&apos;s name, email and
              phone number, and there is no way to take that back. Only do this
              when you&apos;re satisfied the payment is real.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Btn variant="ember" onClick={release} disabled={!!busy}>
                {busy === "release" ? <Spinner /> : <UnlockIcon size={15} />}
                Yes, introduce them
              </Btn>
              <Btn onClick={() => setConfirming(false)} disabled={!!busy}>
                Cancel
              </Btn>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-neutral-bg text-ink-600 flex size-9 flex-none items-center justify-center rounded-full">
                <LockIcon size={17} />
              </span>
              <span className="flex min-w-[240px] flex-1 flex-col gap-0.5">
                <span className="text-ink-850 text-[13px] font-medium">
                  Contact details are sealed
                </span>
                <span className="text-ink-500 text-[12px] leading-[1.5] font-normal text-pretty">
                  {gate.ready
                    ? "Both sides have accepted and the payment is recorded as paid. You can introduce them."
                    : gate.blockedBy}
                </span>
              </span>
              <Btn
                variant="ember"
                disabled={!gate.ready || !!busy}
                onClick={() => setConfirming(true)}
              >
                <UnlockIcon size={15} />
                Release contact details
              </Btn>
            </div>

            {/* The three preconditions, so a blocked button explains itself. */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
              <MiniField
                label="Traveller accepted"
                value={match.traveller_response === "accepted" ? "Yes" : "Not yet"}
              />
              <MiniField
                label="Requester accepted"
                value={match.requester_response === "accepted" ? "Yes" : "Not yet"}
              />
              <MiniField
                label="Payment"
                value={
                  payment?.payment_status === "paid"
                    ? `${gbp(payment.gross_amount)} received`
                    : "Not marked paid"
                }
              />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
