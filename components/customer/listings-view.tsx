"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { MatchList } from "@/components/customer/match-list";
import type { MyMatch } from "@/lib/actions/parents-matches";
import type { ReleasedContact } from "@/lib/parents-marketplace";
import {
  LISTING_KIND_LABELS,
  LISTING_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  type ListingStatus,
  type ParentTicketListing,
  type VerificationStatus,
} from "@/lib/parents-marketplace";
import {
  Btn,
  Card,
  CardHead,
  EmptyState,
  PageHead,
  Pill,
  Screen,
  shadowE1,
  type PillTone,
} from "@/components/admin/ui";
import {
  ArrowRightIcon,
  CalendarIcon,
  PoundIcon,
  CheckCircleIcon,
  FamilyIcon,
  FlightIcon,
  GlobeIcon,
  PinIcon,
  PlusIcon,
  ShieldIcon,
} from "@/components/admin/icons";

export const LISTING_TONE: Record<ListingStatus, PillTone> = {
  draft: "ink",
  pending_review: "warn",
  approved: "ok",
  rejected: "danger",
  matched: "marine",
  withdrawn: "ink",
  expired: "ink",
};

/**
 * The customer's Parents Tickets dashboard (full scope item 3).
 *
 * Verification comes first on the page because it gates everything else: a
 * listing can be written unverified but cannot join the board, so leading with
 * "here's what you can't do yet" saves someone filling a form to be stopped at
 * the end of it. Once verified the card shrinks to a single confirming line
 * and the listings take the page over.
 */
export function ListingsView({
  listings,
  matches,
  contacts,
  verificationStatus,
  basePath = "/customer/parents",
  audience = "customer",
  payouts,
}: {
  listings: ParentTicketListing[];
  matches: MyMatch[];
  contacts: Record<string, ReleasedContact[]>;
  verificationStatus: VerificationStatus;
  /** Where this portal's Parents Tickets area lives. */
  basePath?: string;
  /**
   * Who is looking. A helper is a service provider — they post trips and get
   * paid — so the same records get a different vocabulary and an earnings
   * line the customer has no use for.
   */
  audience?: "customer" | "helper";
  /** Helper only: what they have been paid and are owed. */
  payouts?: { paid: number; pending: number; currency: string };
}) {
  const forHelper = audience === "helper";
  const noun = forHelper ? "trip" : "listing";
  const verified = verificationStatus === "verified";
  const live = listings.filter((l) =>
    ["pending_review", "approved", "matched"].includes(l.listing_status)
  );

  return (
    <Screen>
      <PageHead
        title={forHelper ? "Your trips" : "Parents Tickets"}
        intro={
          forHelper
            ? "Post a flight you're already taking and we'll pair you with a family who needs someone to keep an eye on their parent."
            : "Ask for someone to keep an eye on your parent on their flight — we pair you with a checked traveller going the same way."
        }
        actions={
          <Btn as="link" href={`${basePath}/new`} variant="ember">
            <PlusIcon size={15} />
            New {noun}
          </Btn>
        }
      />

      {/* ------------------------------------------------- verification gate */}
      {verified ? (
        <div
          className={cn(
            "border-ok-edge bg-ok-bg text-ok-ink flex flex-wrap items-center gap-2.5 rounded-[12px] border px-4 py-3 text-[13px] font-medium",
            shadowE1
          )}
        >
          <CheckCircleIcon size={16} />
          You&apos;re verified — your listings can go to the board.
          <Link
            href={`${basePath}/verify`}
            className="text-ok-ink ml-auto text-[12.5px] font-medium underline underline-offset-2"
          >
            View
          </Link>
        </div>
      ) : (
        <Card>
          <CardHead
            icon={<ShieldIcon size={15} />}
            title="Get verified first"
            action={
              <Pill tone={verificationStatus === "pending_review" ? "warn" : "ink"}>
                {VERIFICATION_STATUS_LABELS[verificationStatus]}
              </Pill>
            }
          />
          <div className="flex flex-wrap items-center gap-4 px-5 py-4">
            <p className="text-ink-600 m-0 min-w-[240px] flex-1 text-[13px] leading-[1.55] font-normal text-pretty">
              Families here are trusting a stranger with someone they love, so
              everyone on the board is checked by hand. You can write your
              {noun} now — it just can&apos;t be sent for approval until
              you&apos;re verified.
            </p>
            <Btn as="link" href={`${basePath}/verify`} variant="ember">
              <ShieldIcon size={15} />
              {verificationStatus === "pending_review"
                ? "Check progress"
                : "Get verified"}
            </Btn>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------ what you earn */}
      {forHelper && payouts ? (
        <Card>
          <CardHead
            icon={<PoundIcon size={15} />}
            title="What you've earned"
            hint="From matches where the family's payment has come in."
          />
          <div className="grid grid-cols-1 gap-3 px-5 py-5 min-[520px]:grid-cols-2">
            <div className="border-line-hair bg-surface-4 flex flex-col gap-1 rounded-[11px] border px-4 py-3.5">
              <span className="text-ink-tertiary text-[10.5px] font-semibold tracking-[0.08em] uppercase">
                Owed to you
              </span>
              <span className="text-ok-ink text-[19px] leading-none font-medium tabular-nums">
                £{payouts.paid.toFixed(2)}
              </span>
            </div>
            <div className="border-line-hair bg-surface-4 flex flex-col gap-1 rounded-[11px] border px-4 py-3.5">
              <span className="text-ink-tertiary text-[10.5px] font-semibold tracking-[0.08em] uppercase">
                Not settled yet
              </span>
              <span className="text-ink-600 text-[19px] leading-none font-medium tabular-nums">
                £{payouts.pending.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      ) : null}

      {/* ----------------------------------------------------- the listings */}
      <Card>
        <CardHead
          title={forHelper ? "My trips" : "My requests"}
          hint={
            listings.length === 0
              ? undefined
              : `${listings.length} total · ${live.length} on the board or waiting`
          }
        />
        {listings.length === 0 ? (
          <EmptyState
            title={`You haven't posted a ${noun} yet`}
            body={
              forHelper
                ? "Post a flight you're already taking and tell us what help you could give on it."
                : "Tell us about your parent's flight and the help they need, and we'll look for someone going the same way."
            }
            action={
              <Btn as="link" href={`${basePath}/new`} variant="ember">
                <PlusIcon size={15} />
                Create your first {noun}
              </Btn>
            }
          />
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {listings.map((l) => (
              <li key={l.id} className="border-line-soft border-b last:border-b-0">
                <Link
                  href={`${basePath}/${l.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-5 py-4 leading-[normal] no-underline hover:bg-surface-1 hover:no-underline"
                >
                  <span
                    className={cn(
                      "flex size-10 flex-none items-center justify-center rounded-full",
                      l.listing_kind === "traveller"
                        ? "bg-cyan-bg text-cyan-ink"
                        : "bg-warn-bg text-warn-ink"
                    )}
                  >
                    {l.listing_kind === "traveller" ? (
                      <FlightIcon size={18} />
                    ) : (
                      <FamilyIcon size={18} />
                    )}
                  </span>

                  <span className="flex min-w-[200px] flex-1 flex-col gap-1">
                    <span className="text-ink-850 text-[14px] font-medium">
                      {l.from_airport} → {l.to_airport}
                    </span>
                    <span className="text-ink-500 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-normal">
                      <span className="tabular-nums">{l.reference_number}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarIcon size={13} />
                        {l.travel_date ? fmtDate(l.travel_date) : "No date yet"}
                      </span>
                      <span>{LISTING_KIND_LABELS[l.listing_kind]}</span>
                    </span>
                  </span>

                  <span className="flex flex-none items-center gap-2.5">
                    {l.is_public ? (
                      <span
                        title="Showing on the public board"
                        className="text-ink-500 flex"
                      >
                        <GlobeIcon size={15} />
                      </span>
                    ) : null}
                    <Pill tone={LISTING_TONE[l.listing_status]}>
                      {LISTING_STATUS_LABELS[l.listing_status]}
                    </Pill>
                    <span className="text-ink-400 flex">
                      <ArrowRightIcon size={15} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------------------------------------------------- the matches */}
      {listings.length > 0 || matches.length > 0 ? (
        <MatchList matches={matches} contacts={contacts} />
      ) : null}

      {/* ------------------------------------------------------ what's next */}
      <Card>
        <CardHead icon={<PinIcon size={15} />} title="How this works" />
        <ol className="text-ink-600 m-0 flex list-none flex-col gap-3 px-5 py-5 p-0 text-[13px] leading-[1.55] font-normal">
          {[
            "Get verified — a photo ID and a confirmed email, checked by a person.",
            forHelper
              ? "Post your trip: the flight, the help you can give, and your fee."
              : "Write your request: the flight, the help your parent needs, and your budget.",
            "Send it for review. We check it before it can be matched or shown publicly.",
            "We introduce you to the other side. Contact details are only shared once both of you have accepted.",
          ].map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="bg-marine-tint text-marine-600 flex size-[22px] flex-none items-center justify-center rounded-full text-[11.5px] font-semibold tabular-nums">
                {i + 1}
              </span>
              <span className="text-pretty">{step}</span>
            </li>
          ))}
        </ol>
      </Card>
    </Screen>
  );
}
