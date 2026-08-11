"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { fmtDate, fmtRelative } from "@/lib/format";
import {
  ASSISTANCE_LABELS,
  MATCH_STATUS_LABELS,
  PARTY_RESPONSE_LABELS,
  matchTier,
  type AssistanceKind,
  type MatchStatus,
  type PartyResponse,
} from "@/lib/parents-marketplace";
import { setMatchStatus, type AdminMatchRow } from "@/lib/actions/parents-matches";
import type { MatchPayment as MatchPaymentRow } from "@/lib/actions/parents-payments";
import { MatchPayment } from "@/components/admin/match-payment";
import { MatchThread } from "@/components/parents/match-thread";
import type { ReleasedContact } from "@/lib/parents-marketplace";
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
  type PillTone,
} from "@/components/admin/ui";
import {
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  FamilyIcon,
  FlightIcon,
  GlobeIcon,
  RouteIcon,
} from "@/components/admin/icons";

export const MATCH_TONE: Record<MatchStatus, PillTone> = {
  suggested: "ink",
  proposed: "marine",
  accepted: "ok",
  declined: "danger",
  contact_released: "teal",
  completed: "ok",
  cancelled: "ink",
};

export const RESPONSE_TONE: Record<PartyResponse, PillTone> = {
  pending: "ink",
  accepted: "ok",
  declined: "danger",
};

/** Tint for a 0–100 match score, by the tier it falls in. */
export function scoreTone(score: number | null): PillTone {
  if (score == null) return "ink";
  const tier = matchTier(score);
  return tier === "strong" ? "ok" : tier === "possible" ? "warn" : "ink";
}

/**
 * One match, for the admin brokering it.
 *
 * Both sides sit level on the page rather than one above the other — the whole
 * job here is comparing them, and a stacked layout makes an admin scroll to do
 * it. The score and its reason lead, because that is what an admin is checking
 * before they put their name to an introduction.
 *
 * The payment and the introduction sit on one card below, in that order,
 * because they are one decision — the release button is unreachable until a
 * payment is marked paid.
 */
export function MatchReview({
  record,
  payment,
  contacts,
  viewerId,
}: {
  record: AdminMatchRow;
  payment: MatchPaymentRow | null;
  contacts: ReleasedContact[];
  /** The admin reading this — so their own posts render as theirs. */
  viewerId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const status = record.match_status;
  const bothAccepted =
    record.traveller_response === "accepted" && record.requester_response === "accepted";

  async function move(status: Exclude<MatchStatus, "contact_released">, done: string) {
    setBusy(status);
    const res = await setMatchStatus({ id: record.id, status });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't update the match", { description: res.error });
      return;
    }
    toast.success(done);
    router.refresh();
  }

  return (
    <Screen width={1180}>
      <BackLink href="/admin/parents-matches">Matches</BackLink>

      {/* -------------------------------------------------------- header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <PageTitle>{record.reference_number}</PageTitle>
            <Pill tone={MATCH_TONE[status]}>{MATCH_STATUS_LABELS[status]}</Pill>
            {record.match_score != null ? (
              <Pill tone={scoreTone(record.match_score)}>
                {record.match_score} / 100
              </Pill>
            ) : null}
          </div>
          <p className="text-ink-600 m-0 mt-1.5 max-w-[70ch] text-[13.5px] font-normal text-pretty">
            {record.match_reason ?? "No scoring detail recorded."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {status !== "completed" && status !== "cancelled" ? (
            <>
              {/* Only while the match is still awaiting a decision — once
                  contact is released, "accepted" is a step backwards. */}
              {bothAccepted && (status === "suggested" || status === "proposed") ? (
                <Btn
                  variant="ember"
                  disabled={!!busy}
                  onClick={() => move("accepted", "Marked as accepted")}
                >
                  {busy === "accepted" ? <Spinner /> : <CheckIcon size={15} />}
                  Mark accepted
                </Btn>
              ) : null}
              <Btn
                variant="danger"
                disabled={!!busy}
                onClick={() => move("cancelled", "Match cancelled")}
              >
                {busy === "cancelled" ? <Spinner /> : <CloseIcon size={15} />}
                Cancel match
              </Btn>
            </>
          ) : null}
        </div>
      </div>

      <MatchPayment match={record} payment={payment} contacts={contacts} />

      {/* ------------------------------------------------------ both sides */}
      <div className="grid grid-cols-1 items-start gap-4 min-[900px]:grid-cols-2">
        <SideCard
          kind="traveller"
          listing={record.traveller}
          response={record.traveller_response}
        />
        <SideCard
          kind="requester"
          listing={record.requester}
          response={record.requester_response}
        />
      </div>

      {/* The thread the two parties are using. An admin can read it and step
          in — this is a brokered service, and when a trip goes wrong the
          business has to be able to see what was arranged. */}
      <MatchThread
        matchId={record.id}
        viewerId={viewerId}
        released={record.contact_released}
        audience="admin"
      />

      <p className="text-ink-500 m-0 text-[12px] font-normal">
        Created {fmtDate(record.created_at)}
        {record.contact_released_at
          ? ` · released ${fmtRelative(record.contact_released_at)}`
          : ""}{" "}
        · last updated {fmtRelative(record.updated_at)}
      </p>
    </Screen>
  );
}

/** One half of the pairing. */
function SideCard({
  kind,
  listing,
  response,
}: {
  kind: "traveller" | "requester";
  listing: AdminMatchRow["traveller"];
  response: PartyResponse;
}) {
  if (!listing) {
    return (
      <Card>
        <CardHead title={kind === "traveller" ? "Traveller" : "Requester"} />
        <p className="text-ink-500 m-0 px-5 py-4 text-[13px] font-normal">
          That listing has been removed.
        </p>
      </Card>
    );
  }

  const isTraveller = kind === "traveller";
  const assistance = (
    isTraveller ? listing.assistance_offered : listing.assistance_needed
  ) as AssistanceKind[];

  return (
    <Card className="flex flex-col">
      <CardHead
        icon={isTraveller ? <FlightIcon size={15} /> : <FamilyIcon size={15} />}
        title={isTraveller ? "Offering help" : "Needs help"}
        action={
          <Pill tone={RESPONSE_TONE[response]}>{PARTY_RESPONSE_LABELS[response]}</Pill>
        }
      />

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={listing.profile?.full_name ?? "?"} size={36} />
          <span className="flex min-w-0 flex-col">
            <span className="text-ink-850 text-[13.5px] font-medium">
              {listing.profile?.full_name ?? "Unnamed"}
            </span>
            <Link
              href={`/admin/parents-listings/${listing.id}`}
              className="text-marine-600 text-[12px] font-medium tabular-nums"
            >
              {listing.reference_number} →
            </Link>
          </span>
        </div>

        <div className="text-ink-700 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-medium">
          <span className="inline-flex items-center gap-1.5">
            <RouteIcon size={14} />
            {listing.from_airport} → {listing.to_airport}
          </span>
          <span className="text-ink-600 inline-flex items-center gap-1.5 font-normal">
            <CalendarIcon size={14} />
            {listing.travel_date ? fmtDate(listing.travel_date) : "No date"}
          </span>
        </div>

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
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
          <MiniField label="Airline" value={listing.airline} />
          <MiniField label="Flight" value={listing.flight_number} />
          <MiniField
            label={isTraveller ? "Fee" : "Budget"}
            value={listing.fee_amount != null ? `£${listing.fee_amount}` : null}
          />
          <MiniField
            label="Languages"
            value={listing.languages.length ? listing.languages.join(", ") : null}
          />
          {isTraveller ? (
            <MiniField label="Can help" value={listing.capacity} />
          ) : (
            <>
              <MiniField label="Parent" value={listing.parent_name} />
              <MiniField label="Age" value={listing.parent_age} />
            </>
          )}
          <MiniField
            label="Booked?"
            value={listing.flight_confirmed ? "Confirmed" : "Dates intended"}
          />
        </div>

        {!isTraveller && listing.mobility_notes ? (
          <MiniField label="Getting around" value={listing.mobility_notes} />
        ) : null}
        {!isTraveller && listing.supervision_notes ? (
          <MiniField label="Keep an eye on" value={listing.supervision_notes} />
        ) : null}
        {isTraveller && listing.travel_experience ? (
          <MiniField label="Route experience" value={listing.travel_experience} />
        ) : null}

        {listing.is_public ? (
          <span className="text-ink-500 inline-flex items-center gap-1.5 text-[11.5px] font-normal">
            <GlobeIcon size={13} />
            Showing on the public board
          </span>
        ) : null}
      </div>
    </Card>
  );
}
