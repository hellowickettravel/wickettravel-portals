"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { fmtDate } from "@/lib/format";
import {
  ASSISTANCE_LABELS,
  LISTING_KIND_LABELS,
  LISTING_STATUS_LABELS,
  type AssistanceKind,
  type ParentTicketListing,
  type VerificationStatus,
} from "@/lib/parents-marketplace";
import {
  deleteDraftListing,
  reopenListing,
  setMyListingConsent,
  submitListing,
  withdrawListing,
} from "@/lib/actions/parents-listings";
import { LISTING_TONE } from "@/components/customer/listings-view";
import {
  BackLink,
  Btn,
  Card,
  CardHead,
  MiniField,
  PageTitle,
  Pill,
  Screen,
  Spinner,
} from "@/components/admin/ui";
import { LiveRefresh } from "@/components/admin/live-refresh";
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  FamilyIcon,
  FlightIcon,
  GlobeIcon,
  HeartIcon,
  ShieldIcon,
} from "@/components/admin/icons";

/**
 * One of the customer's own listings.
 *
 * The action row is the point of the screen — what can I do with this right
 * now — so it is driven entirely by the status, and anything unavailable is
 * absent rather than shown disabled. Where the reason is not obvious (not yet
 * verified, no travel date) a line underneath says so, because a missing
 * button with no explanation is the most frustrating kind.
 */
export function ListingDetail({
  listing,
  verificationStatus,
  basePath = "/customer/parents",
  audience = "customer",
}: {
  listing: ParentTicketListing;
  verificationStatus: VerificationStatus;
  /** Where this portal's Parents Tickets area lives. */
  basePath?: string;
  audience?: "customer" | "helper";
}) {
  const forHelper = audience === "helper";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const status = listing.listing_status;
  const isTraveller = listing.listing_kind === "traveller";
  const verified = verificationStatus === "verified";
  const editable = status === "draft" || status === "rejected";
  const sendable = editable && verified && !!listing.travel_date;

  const blocker = !editable
    ? null
    : !verified
      ? "You need to be verified before this can go to our team."
      : !listing.travel_date
        ? "Add a travel date before sending this for review."
        : null;

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setBusy(key);
    const res = await fn();
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't do that", { description: res.error });
      return false;
    }
    toast.success(done);
    router.refresh();
    return true;
  }

  const assistance = (
    isTraveller ? listing.assistance_offered : listing.assistance_needed
  ) as AssistanceKind[];

  return (
    <Screen>
      <BackLink href={basePath}>{forHelper ? "My trips" : "My requests"}</BackLink>

      {/* -------------------------------------------------------- header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <PageTitle>
              {listing.from_airport} → {listing.to_airport}
            </PageTitle>
            <Pill tone={LISTING_TONE[status]}>{LISTING_STATUS_LABELS[status]}</Pill>
            {listing.is_public ? <Pill tone="teal">On the board</Pill> : null}
          </div>
          <p className="text-ink-600 m-0 mt-1.5 text-[13.5px] font-normal">
            {listing.reference_number} · {LISTING_KIND_LABELS[listing.listing_kind]} ·
            created {fmtDate(listing.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* This record's status is decided by an admin on another screen —
              approved, rejected, matched. The owner is the one waiting on it,
              so the page has to move on its own. */}
          <LiveRefresh
            channel={`parents-listing-${listing.id}`}
            tables={["parent_ticket_listings", "parent_ticket_matches"]}
          />
          {editable ? (
            <Btn as="link" href={`${basePath}/${listing.id}/edit`}>
              <EditIcon size={15} />
              Edit
            </Btn>
          ) : null}

          {editable ? (
            <Btn
              variant="ember"
              disabled={!sendable || !!busy}
              onClick={() =>
                run("submit", () => submitListing(listing.id), "Sent for review")
              }
            >
              {busy === "submit" ? <Spinner /> : <ShieldIcon size={15} />}
              Send for review
            </Btn>
          ) : null}

          {status === "pending_review" ? (
            <Btn
              disabled={!!busy}
              onClick={() =>
                run("reopen", () => reopenListing(listing.id), "Reopened for editing")
              }
            >
              {busy === "reopen" ? <Spinner /> : null}
              Reopen for editing
            </Btn>
          ) : null}

          {["approved", "matched", "pending_review"].includes(status) ? (
            <Btn
              variant="danger"
              disabled={!!busy}
              onClick={() =>
                run("withdraw", () => withdrawListing(listing.id), "Withdrawn")
              }
            >
              {busy === "withdraw" ? <Spinner /> : <CloseIcon size={15} />}
              Withdraw
            </Btn>
          ) : null}

          {status === "draft" ? (
            <Btn
              variant="danger"
              disabled={!!busy}
              onClick={async () => {
                const ok = await run(
                  "delete",
                  () => deleteDraftListing(listing.id),
                  "Draft deleted"
                );
                if (ok) router.push(basePath);
              }}
            >
              {busy === "delete" ? <Spinner /> : null}
              Delete draft
            </Btn>
          ) : null}
        </div>
      </div>

      {blocker ? (
        <p className="border-warn-bg bg-warn-bg text-warn-ink m-0 rounded-[12px] border px-4 py-3 text-[13px] leading-[1.55] font-normal text-pretty">
          {blocker}
          {!verified ? (
            <>
              {" "}
              <Link
                href={`${basePath}/verify`}
                className="text-warn-ink font-medium underline underline-offset-2"
              >
                Get verified
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : null}

      {status === "rejected" && listing.rejection_reason ? (
        <Card>
          <CardHead icon={<CloseIcon size={15} />} title="Our team sent this back" />
          <p className="text-ink-800 m-0 px-5 py-4 text-[13px] leading-[1.6] font-normal whitespace-pre-wrap text-pretty">
            {listing.rejection_reason}
          </p>
        </Card>
      ) : null}

      {status === "pending_review" ? (
        <p className="border-line-base bg-surface-1 text-ink-600 m-0 rounded-[12px] border px-4 py-3 text-[13px] font-normal">
          With our team now — we&apos;ll email you when it&apos;s been looked at.
        </p>
      ) : null}

      {/* ---------------------------------------------------- column cards */}
      <div className="grid grid-cols-1 items-stretch gap-4 min-[760px]:grid-cols-2">
        <Card>
          <CardHead icon={<FlightIcon size={15} />} title="The flight" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 px-[18px] py-4">
            <MiniField
              label="Route"
              value={`${listing.from_airport} → ${listing.to_airport}`}
            />
            <MiniField
              label="Travel date"
              value={listing.travel_date ? fmtDate(listing.travel_date) : null}
            />
            <MiniField
              label="Departure"
              value={listing.departure_time?.slice(0, 5)}
            />
            <MiniField label="Airline" value={listing.airline} />
            <MiniField label="Flight number" value={listing.flight_number} />
            <MiniField
              label="Booked?"
              value={listing.flight_confirmed ? "Confirmed" : "Dates intended"}
            />
          </div>
        </Card>

        <Card>
          <CardHead
            icon={isTraveller ? <HeartIcon size={15} /> : <FamilyIcon size={15} />}
            title={isTraveller ? "Help you can give" : "Help your parent needs"}
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
                Nothing selected yet.
              </p>
            )}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
              {isTraveller ? (
                <MiniField label="Parents you can help" value={listing.capacity} />
              ) : (
                <>
                  <MiniField label="Parent" value={listing.parent_name} />
                  <MiniField label="Age" value={listing.parent_age} />
                  <MiniField label="Relationship" value={listing.relationship} />
                </>
              )}
              <MiniField
                label={isTraveller ? "Fee" : "Budget"}
                value={listing.fee_amount != null ? `£${listing.fee_amount}` : null}
              />
            </div>

            {isTraveller && listing.travel_experience ? (
              <MiniField label="Route experience" value={listing.travel_experience} />
            ) : null}
            {!isTraveller && listing.mobility_notes ? (
              <MiniField label="Getting around" value={listing.mobility_notes} />
            ) : null}
            {!isTraveller && listing.supervision_notes ? (
              <MiniField label="Keep an eye on" value={listing.supervision_notes} />
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHead icon={<GlobeIcon size={15} />} title="Languages" />
          <div className="flex flex-wrap gap-2 px-[18px] py-4">
            {listing.languages.length ? (
              listing.languages.map((l) => (
                <span
                  key={l}
                  className="border-line-field text-ink-700 inline-flex items-center rounded-full border bg-white px-3 py-1 text-[11.5px] font-medium"
                >
                  {l}
                </span>
              ))
            ) : (
              <p className="text-ink-500 m-0 text-[12.5px] font-normal">
                None selected.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHead
            icon={<GlobeIcon size={15} />}
            title="Public board"
            action={
              <span className="text-ink-quiet text-[11px] font-normal whitespace-nowrap">
                {listing.consent_public ? "You opted in" : "You opted out"}
              </span>
            }
          />
          <div className="flex flex-col gap-3.5 px-5 py-4">
          <p className="text-ink-600 m-0 text-[13px] leading-[1.55] font-normal text-pretty">
            {listing.is_public ? (
              <>
                <span className="text-ok-ink inline-flex items-center gap-1.5 font-medium">
                  <CheckIcon size={14} /> Showing publicly.
                </span>{" "}
                Only your first name and last initial, the route, date, airline,
                languages and the help involved — never contact details.
              </>
            ) : listing.consent_public ? (
              "You've agreed to public display; our team decides whether to show it once the listing is approved."
            ) : (
              "This won't be shown publicly. Turning it on is a request — our team still decides what goes on the board, and it doesn't affect matching either way."
            )}
          </p>

          {/* Consent is theirs to give and to withdraw, at any point in the
              listing's life. It used to be editable only while the listing
              was a draft, which left somebody who changed their mind about
              being publicly listed with no way to say so. */}
          <div className="flex flex-wrap items-center gap-3">
            <Btn
              disabled={!!busy}
              onClick={() =>
                run(
                  "consent",
                  () =>
                    setMyListingConsent({
                      id: listing.id,
                      consent: !listing.consent_public,
                    }),
                  listing.consent_public
                    ? "Taken off the public board"
                    : "Asked to be listed — our team will review it"
                )
              }
            >
              {busy === "consent" ? <Spinner /> : <GlobeIcon size={15} />}
              {listing.consent_public
                ? "Don't show this publicly"
                : "Ask to be shown publicly"}
            </Btn>
            <span className="text-ink-500 text-[12px] font-normal">
              {listing.consent_public
                ? "Turning this off takes it down straight away."
                : "Matching works either way — this is only about the public board."}
            </span>
          </div>
          </div>
        </Card>

        {listing.notes ? (
          <Card className="col-span-full">
            <CardHead title="Anything else" />
            <p className="text-ink-800 m-0 px-5 py-4 text-[13px] leading-[1.6] font-normal whitespace-pre-wrap text-pretty">
              {listing.notes}
            </p>
          </Card>
        ) : null}
      </div>
    </Screen>
  );
}
