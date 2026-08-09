"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import {
  ASSISTANCE_LABELS,
  MATCH_STATUS_LABELS,
  type AssistanceKind,
  type PartyResponse,
} from "@/lib/parents-marketplace";
import { respondToMatch, type MyMatch } from "@/lib/actions/parents-matches";
import type { ReleasedContact } from "@/lib/parents-marketplace";
import {
  Btn,
  Card,
  CardHead,
  EmptyState,
  Pill,
  Spinner,
  type PillTone,
} from "@/components/admin/ui";
import {
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  GlobeIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  RouteIcon,
  UnlockIcon,
  UserIcon,
} from "@/components/admin/icons";

const RESPONSE_TONE: Record<PartyResponse, PillTone> = {
  pending: "ink",
  accepted: "ok",
  declined: "danger",
};

/**
 * The customer's own matches, with accept and decline.
 *
 * The other side is shown WITHOUT a name — the flight, the help and the fee,
 * which is everything you need to decide, and nothing you could use to reach
 * them. That isn't only presentation: there is no query on this page that
 * could return a counterparty's contact details, and the only route to them is
 * an admin releasing the match after a payment.
 */
export function MatchList({
  matches,
  contacts,
}: {
  matches: MyMatch[];
  /** matchId → the two parties' details. Only ever populated once released. */
  contacts: Record<string, ReleasedContact[]>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function respond(matchId: string, response: "accepted" | "declined") {
    setBusy(`${matchId}:${response}`);
    const res = await respondToMatch({ matchId, response });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't send that", { description: res.error });
      return;
    }
    toast.success(response === "accepted" ? "Accepted" : "Declined");
    router.refresh();
  }

  return (
    <Card>
      <CardHead
        icon={<RouteIcon size={15} />}
        title="Your matches"
        hint={
          matches.length
            ? "We pair you by route, date, the help involved, language and fee."
            : undefined
        }
      />

      {matches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          body="Once a listing of yours is approved, our team looks for someone on the other side of the same journey and introduces you here."
        />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {matches.map(({ match, mine, theirs, side, myResponse, theirResponse }) => {
            const theirKind = side === "traveller" ? "requester" : "traveller";
            const assistance = (
              theirKind === "traveller"
                ? theirs.assistance_offered
                : theirs.assistance_needed
            ) as AssistanceKind[];
            const decided = myResponse !== "pending";
            const bothIn = myResponse === "accepted" && theirResponse === "accepted";

            return (
              <li
                key={match.id}
                className="border-line-soft flex flex-col gap-3.5 border-b px-5 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-ink-500 text-[11.5px] font-medium tabular-nums">
                    {match.reference_number}
                  </span>
                  <Pill tone={bothIn ? "ok" : "marine"}>
                    {MATCH_STATUS_LABELS[match.match_status]}
                  </Pill>
                  <span className="text-ink-500 ml-auto text-[11.5px] font-normal">
                    for your {mine.reference_number}
                  </span>
                </div>

                <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
                  <span className="flex min-w-[240px] flex-1 flex-col gap-2">
                    <span className="text-ink-850 text-[14px] font-medium">
                      {theirKind === "traveller"
                        ? "A traveller on your route"
                        : "A family who needs help"}
                    </span>
                    <span className="text-ink-700 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-normal">
                      <span className="inline-flex items-center gap-1.5">
                        <RouteIcon size={13} />
                        {theirs.from_airport} → {theirs.to_airport}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarIcon size={13} />
                        {theirs.travel_date ? fmtDate(theirs.travel_date) : "No date"}
                      </span>
                      {theirs.airline ? <span>{theirs.airline}</span> : null}
                      {theirs.flight_number ? (
                        <span className="tabular-nums">{theirs.flight_number}</span>
                      ) : null}
                      {theirs.fee_amount != null ? (
                        <span className="tabular-nums">
                          £{theirs.fee_amount}{" "}
                          {theirKind === "traveller" ? "asked" : "offered"}
                        </span>
                      ) : null}
                    </span>

                    {assistance.length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {assistance.map((a) => (
                          <span
                            key={a}
                            className="bg-marine-tint text-marine-600 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                          >
                            {ASSISTANCE_LABELS[a] ?? a}
                          </span>
                        ))}
                      </span>
                    ) : null}

                    {theirs.languages.length ? (
                      <span className="text-ink-500 inline-flex items-center gap-1.5 text-[11.5px] font-normal">
                        <GlobeIcon size={13} />
                        Speaks {theirs.languages.join(", ")}
                      </span>
                    ) : null}
                  </span>

                  <span className="flex flex-none flex-col items-end gap-2">
                    <span className="text-ink-500 text-[11px] font-medium">
                      They&apos;ve{" "}
                      {theirResponse === "pending" ? "not replied" : theirResponse}
                    </span>
                    <Pill tone={RESPONSE_TONE[theirResponse]}>
                      {theirResponse === "pending" ? "Awaiting them" : "Answered"}
                    </Pill>
                  </span>
                </div>

                {/* ------------------------------------------ the decision */}
                {match.contact_released ? (
                  <Introduced
                    contact={(contacts[match.id] ?? []).find(
                      (c) => c.side !== side
                    )}
                  />
                ) : decided ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Pill tone={RESPONSE_TONE[myResponse]}>
                      You {myResponse}
                    </Pill>
                    <span className="text-ink-500 inline-flex items-center gap-1.5 text-[12px] font-normal">
                      <LockIcon size={13} />
                      {bothIn
                        ? "Both of you are in. We'll be in touch to arrange the introduction."
                        : "We'll let you know when the other side replies."}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Btn
                      variant="ember"
                      disabled={!!busy}
                      onClick={() => respond(match.id, "accepted")}
                    >
                      {busy === `${match.id}:accepted` ? (
                        <Spinner />
                      ) : (
                        <CheckIcon size={15} />
                      )}
                      Accept
                    </Btn>
                    <Btn
                      disabled={!!busy}
                      onClick={() => respond(match.id, "declined")}
                      className={cn(busy === `${match.id}:declined` && "opacity-70")}
                    >
                      {busy === `${match.id}:declined` ? (
                        <Spinner />
                      ) : (
                        <CloseIcon size={15} />
                      )}
                      Decline
                    </Btn>
                    <span className="text-ink-500 inline-flex items-center gap-1.5 text-[12px] font-normal">
                      <LockIcon size={13} />
                      Accepting doesn&apos;t share your details — we introduce you
                      once you&apos;ve both agreed.
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/**
 * The counterparty's details, shown only after an admin has introduced the
 * two of you.
 *
 * These come from the parent_ticket_match_contact RPC, which is the one route
 * to them anywhere in the product — there is no query on this page that could
 * have produced them a moment earlier.
 */
function Introduced({ contact }: { contact?: ReleasedContact }) {
  if (!contact) {
    return (
      <p className="border-ok-edge bg-ok-bg text-ok-ink m-0 rounded-[10px] border px-3.5 py-2.5 text-[12.5px] font-medium">
        You&apos;ve been introduced — we&apos;ll be in touch with their details.
      </p>
    );
  }

  return (
    <div className="border-ok-edge bg-ok-bg flex flex-col gap-2.5 rounded-[10px] border px-4 py-3.5">
      <span className="text-ok-ink inline-flex items-center gap-2 text-[12.5px] font-medium">
        <UnlockIcon size={15} />
        You&apos;ve been introduced — here&apos;s how to reach them.
      </span>
      <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-ink-850 inline-flex items-center gap-2 text-[13px] font-medium">
          <UserIcon size={14} />
          {contact.full_name ?? "Your match"}
        </span>
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="text-marine-600 inline-flex items-center gap-2 text-[12.5px] font-normal"
          >
            <MailIcon size={14} />
            {contact.email}
          </a>
        ) : null}
        {contact.phone ? (
          <a
            href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
            className="text-marine-600 inline-flex items-center gap-2 text-[12.5px] font-normal"
          >
            <PhoneIcon size={14} />
            {contact.phone}
          </a>
        ) : null}
      </span>
    </div>
  );
}
