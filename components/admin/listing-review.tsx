"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import {
  ASSISTANCE_LABELS,
  LISTING_KIND_LABELS,
  LISTING_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  type AssistanceKind,
  type VerificationStatus,
} from "@/lib/parents-marketplace";
import {
  reviewListing,
  setListingPublic,
  type AdminListingRow,
} from "@/lib/actions/parents-listings";
import { LISTING_TONE } from "@/components/customer/listings-view";
import {
  Avatar,
  BackLink,
  Btn,
  Card,
  CardHead,
  MiniField,
  PageTitle,
  Pill,
  Screen,
  Spinner,
  focusRing,
  textareaClass,
} from "@/components/admin/ui";
import {
  CheckIcon,
  CloseIcon,
  FamilyIcon,
  FlightIcon,
  GlobeIcon,
  HeartIcon,
  ShieldIcon,
} from "@/components/admin/icons";

/**
 * One listing, for the admin approving it.
 *
 * Approve offers publishing in the same click when the owner has opted in,
 * because those are one decision in practice — and refuses it out loud when
 * they haven't, rather than silently dropping the flag the way the database
 * would.
 */
export function ListingReview({ record }: { record: AdminListingRow }) {
  const router = useRouter();

  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(record.rejection_reason ?? "");
  const [publish, setPublish] = useState(record.consent_public);

  const status = record.listing_status;
  const isTraveller = record.listing_kind === "traveller";
  const verification = (record.identity?.verification_status ??
    "unverified") as VerificationStatus;
  const verified = verification === "verified";
  const pending = status === "pending_review";

  const assistance = (
    isTraveller ? record.assistance_offered : record.assistance_needed
  ) as AssistanceKind[];

  async function decide(decision: "approved" | "rejected") {
    if (decision === "rejected" && !reason.trim()) {
      setRejecting(true);
      toast.error("Add a reason first", {
        description: "They need to know what to fix.",
      });
      return;
    }
    setBusy(decision);
    const res = await reviewListing({
      id: record.id,
      decision,
      reason: decision === "rejected" ? reason : undefined,
      publish: decision === "approved" ? publish : false,
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't save the decision", { description: res.error });
      return;
    }
    toast.success(decision === "approved" ? "Approved" : "Sent back");
    setRejecting(false);
    router.refresh();
  }

  async function togglePublic(next: boolean) {
    setBusy("public");
    const res = await setListingPublic({ id: record.id, isPublic: next });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't update the board", { description: res.error });
      return;
    }
    toast.success(next ? "Now on the public board" : "Taken off the board");
    router.refresh();
  }

  return (
    <Screen>
      <BackLink href="/admin/parents-listings">Parent listings</BackLink>

      {/* -------------------------------------------------------- header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <PageTitle>{record.reference_number}</PageTitle>
            <Pill tone={LISTING_TONE[status]}>{LISTING_STATUS_LABELS[status]}</Pill>
            {isTraveller ? (
              <span className="bg-cyan-bg text-cyan-ink inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap">
                Offering help
              </span>
            ) : (
              <span className="bg-warn-bg text-warn-ink inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap">
                Needs help
              </span>
            )}
            {record.is_public ? <Pill tone="teal">On the board</Pill> : null}
          </div>
          <p className="text-ink-600 m-0 mt-1.5 text-[13.5px] font-normal">
            {record.from_airport} → {record.to_airport} ·{" "}
            {record.travel_date ? fmtDate(record.travel_date) : "no date"} ·
            updated {fmtRelative(record.updated_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {status !== "approved" && status !== "matched" ? (
            <Btn
              variant="ember"
              onClick={() => decide("approved")}
              disabled={!!busy || !verified}
            >
              {busy === "approved" ? <Spinner /> : <CheckIcon size={15} />}
              Approve{publish && record.consent_public ? " and publish" : ""}
            </Btn>
          ) : (
            <Btn
              onClick={() => togglePublic(!record.is_public)}
              disabled={!!busy || !record.consent_public}
            >
              {busy === "public" ? <Spinner /> : <GlobeIcon size={15} />}
              {record.is_public ? "Take off the board" : "Show on the board"}
            </Btn>
          )}
          {status !== "rejected" ? (
            <Btn
              variant="danger"
              onClick={() => (rejecting ? decide("rejected") : setRejecting(true))}
              disabled={!!busy}
            >
              {busy === "rejected" ? <Spinner /> : <CloseIcon size={15} />}
              Send back
            </Btn>
          ) : null}
        </div>
      </div>

      {!verified ? (
        <p className="border-warn-bg bg-warn-bg text-warn-ink m-0 rounded-[12px] border px-4 py-3 text-[13px] leading-[1.55] font-normal text-pretty">
          <span className="font-medium">This person isn&apos;t verified yet</span> —
          their identity check is {VERIFICATION_STATUS_LABELS[verification].toLowerCase()}.
          Approving is blocked until it&apos;s done.{" "}
          <Link
            href={`/admin/parents-verification/${record.profile_id}`}
            className="text-warn-ink font-medium underline underline-offset-2"
          >
            Open their verification
          </Link>
          .
        </p>
      ) : null}

      {pending && record.consent_public ? (
        <label className="border-line-base flex cursor-pointer items-start gap-3 rounded-[12px] border bg-white px-4 py-3.5">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            className="accent-marine-500 mt-0.5 size-[17px] flex-none cursor-pointer"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-ink-850 text-[13px] font-medium">
              Also show this on the public board when you approve it
            </span>
            <span className="text-ink-500 text-[12px] leading-[1.5] font-normal text-pretty">
              They opted in. The board shows a masked name, the route, date,
              airline, languages and the help involved — never contact details.
            </span>
          </span>
        </label>
      ) : null}

      {rejecting && status !== "rejected" ? (
        <Card>
          <CardHead
            icon={<CloseIcon size={15} />}
            title="Why are you sending this back?"
            hint="They see this word for word, so make it something they can act on."
          />
          <div className="flex flex-col gap-3 px-5 py-4">
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              autoFocus
              placeholder="e.g. Please add the flight number — we can't match a listing without knowing which plane."
              aria-label="Reason for sending back"
              className={cn(textareaClass, focusRing)}
            />
            <div className="flex flex-wrap gap-2.5">
              <Btn
                variant="danger"
                onClick={() => decide("rejected")}
                disabled={!!busy || !reason.trim()}
              >
                {busy === "rejected" ? <Spinner /> : null}
                Send back with this reason
              </Btn>
              <Btn onClick={() => setRejecting(false)} disabled={!!busy}>
                Cancel
              </Btn>
            </div>
          </div>
        </Card>
      ) : null}

      {status === "rejected" && record.rejection_reason ? (
        <Card>
          <CardHead icon={<CloseIcon size={15} />} title="Sent back" />
          <p className="text-ink-800 m-0 px-5 py-4 text-[13px] leading-[1.6] font-normal whitespace-pre-wrap text-pretty">
            {record.rejection_reason}
          </p>
        </Card>
      ) : null}

      {/* -------------------------------------------------- column cards */}
      <div className="grid grid-cols-1 items-stretch gap-4 min-[760px]:grid-cols-2">
        <Card>
          <CardHead icon={<ShieldIcon size={15} />} title="Posted by" />
          <div className="flex flex-col gap-3 px-[18px] py-4">
            <div className="flex items-center gap-3">
              <Avatar name={record.profile?.full_name ?? "?"} size={38} />
              <span className="flex min-w-0 flex-col">
                <span className="text-ink-850 text-[13.5px] font-medium">
                  {record.profile?.full_name ?? "Unnamed"}
                </span>
                <span className="text-ink-500 text-[12px] font-normal">
                  {record.profile?.email ?? "—"}
                </span>
              </span>
              <Pill tone={verified ? "ok" : "warn"} className="ml-auto">
                {VERIFICATION_STATUS_LABELS[verification]}
              </Pill>
            </div>
            <Link
              href={`/admin/parents-verification/${record.profile_id}`}
              className="text-marine-600 text-[12.5px] font-medium"
            >
              Open their verification record →
            </Link>
          </div>
        </Card>

        <Card>
          <CardHead icon={<FlightIcon size={15} />} title="The flight" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 px-[18px] py-4">
            <MiniField
              label="Route"
              value={`${record.from_airport} → ${record.to_airport}`}
            />
            <MiniField
              label="Travel date"
              value={record.travel_date ? fmtDate(record.travel_date) : null}
            />
            <MiniField label="Departure" value={record.departure_time?.slice(0, 5)} />
            <MiniField label="Airline" value={record.airline} />
            <MiniField label="Flight number" value={record.flight_number} />
            <MiniField
              label="Booked?"
              value={record.flight_confirmed ? "Confirmed" : "Dates intended"}
            />
          </div>
        </Card>

        <Card>
          <CardHead
            icon={isTraveller ? <HeartIcon size={15} /> : <FamilyIcon size={15} />}
            title={isTraveller ? "Help offered" : "Help needed"}
          />
          <div className="flex flex-col gap-3 px-[18px] py-4">
            {assistance.length ? (
              <div className="flex flex-wrap gap-2">
                {assistance.map((a) => (
                  <span
                    key={a}
                    className="bg-marine-tint text-marine-600 inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-medium"
                  >
                    {ASSISTANCE_LABELS[a] ?? a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-ink-500 m-0 text-[12.5px] font-normal">
                Nothing selected — worth sending back.
              </p>
            )}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
              {isTraveller ? (
                <MiniField label="Parents they can help" value={record.capacity} />
              ) : (
                <>
                  <MiniField label="Parent" value={record.parent_name} />
                  <MiniField label="Age" value={record.parent_age} />
                  <MiniField label="Relationship" value={record.relationship} />
                </>
              )}
              <MiniField
                label={isTraveller ? "Fee" : "Budget"}
                value={record.fee_amount != null ? `£${record.fee_amount}` : null}
              />
              <MiniField
                label="Languages"
                value={record.languages.length ? record.languages.join(", ") : null}
              />
            </div>
            {isTraveller && record.travel_experience ? (
              <MiniField label="Route experience" value={record.travel_experience} />
            ) : null}
            {!isTraveller && record.mobility_notes ? (
              <MiniField label="Getting around" value={record.mobility_notes} />
            ) : null}
            {!isTraveller && record.supervision_notes ? (
              <MiniField label="Keep an eye on" value={record.supervision_notes} />
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHead
            icon={<GlobeIcon size={15} />}
            title="Public board"
            action={
              <span className="text-ink-quiet text-[11px] font-normal whitespace-nowrap">
                {record.consent_public ? "Consent given" : "No consent"}
              </span>
            }
          />
          <p className="text-ink-600 m-0 px-5 py-4 text-[13px] leading-[1.55] font-normal text-pretty">
            {record.consent_public
              ? "They agreed to public display. Only an approved listing can go on the board, and it shows a masked name, the route, date, airline, languages and the help involved — never contact details."
              : "They didn't agree to public display, so this can only ever be matched privately. The database refuses to publish it regardless of what's clicked here."}
          </p>
        </Card>

        {record.notes ? (
          <Card className="col-span-full">
            <CardHead title="Their notes" />
            <p className="text-ink-800 m-0 px-5 py-4 text-[13px] leading-[1.6] font-normal whitespace-pre-wrap text-pretty">
              {record.notes}
            </p>
          </Card>
        ) : null}
      </div>

      <p className="text-ink-500 m-0 text-[12px] font-normal">
        {LISTING_KIND_LABELS[record.listing_kind]} · created{" "}
        {fmtDate(record.created_at)}
        {record.submitted_at ? ` · sent ${fmtDate(record.submitted_at)}` : ""}
        {record.reviewed_at ? ` · reviewed ${fmtRelative(record.reviewed_at)}` : ""}
      </p>
    </Screen>
  );
}
