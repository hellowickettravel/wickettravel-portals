"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import {
  ASSISTANCE_LABELS,
  matchTier,
  type AssistanceKind,
  type ListingKind,
} from "@/lib/parents-marketplace";
import { createMatch, type Candidate } from "@/lib/actions/parents-matches";
import { scoreTone } from "@/components/admin/match-review";
import {
  Avatar,
  Btn,
  Card,
  CardHead,
  EmptyState,
  Pill,
  Spinner,
} from "@/components/admin/ui";
import {
  CalendarIcon,
  CheckIcon,
  GlobeIcon,
  RouteIcon,
} from "@/components/admin/icons";

const TIER_LABEL = {
  strong: "Strong match",
  possible: "Possible",
  weak: "Weak",
} as const;

/**
 * The ranked counterparts for one listing (full scope item 4), rendered under
 * the listing an admin is looking at.
 *
 * Every row shows WHY it scored what it did, in words. A ranking an admin
 * can't interrogate is one they'll either over-trust or ignore, and the person
 * putting their name to the introduction has to be able to disagree with it.
 */
export function MatchCandidates({
  candidates,
  subjectKind,
  subjectId,
  canMatch,
  blockedReason,
}: {
  candidates: Candidate[];
  subjectKind: ListingKind;
  subjectId: string;
  /** False when the subject listing isn't approved yet. */
  canMatch: boolean;
  blockedReason?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function propose(candidateListingId: string) {
    setBusy(candidateListingId);
    const res = await createMatch(
      subjectKind === "traveller"
        ? { travellerListingId: subjectId, requesterListingId: candidateListingId }
        : { travellerListingId: candidateListingId, requesterListingId: subjectId }
    );
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't create the match", { description: res.error });
      return;
    }
    toast.success(`Match created — ${res.data.reference}`);
    router.push(`/admin/parents-matches/${res.data.id}`);
  }

  return (
    <Card>
      <CardHead
        icon={<RouteIcon size={15} />}
        title="Suggested matches"
        hint={
          canMatch
            ? "Ranked on route, date, assistance, language and fee. A score ranks candidates — it never authorises anything."
            : blockedReason
        }
        action={
          candidates.length ? (
            <span className="text-ink-quiet text-[11px] font-normal whitespace-nowrap">
              {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
      />

      {!canMatch ? (
        <EmptyState
          title="Not matchable yet"
          body={
            blockedReason ??
            "Only an approved listing can be matched. Approve this one first."
          }
        />
      ) : candidates.length === 0 ? (
        <EmptyState
          title="Nothing to suggest yet"
          body={
            subjectKind === "traveller"
              ? "No approved parent requests on a comparable route and date. It'll fill in as more families post."
              : "No approved traveller listings on a comparable route and date. It'll fill in as more travellers post."
          }
        />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {candidates.map((c) => {
            const tier = matchTier(c.score);
            const assistance = (
              subjectKind === "traveller"
                ? c.listing.assistance_needed
                : c.listing.assistance_offered
            ) as AssistanceKind[];

            return (
              <li
                key={c.listing.id}
                className="border-line-soft flex flex-wrap items-start gap-x-4 gap-y-3 border-b px-5 py-4 last:border-b-0"
              >
                <span className="flex flex-none flex-col items-center gap-1.5 pt-0.5">
                  <Pill tone={scoreTone(c.score)}>{c.score}</Pill>
                  <span className="text-ink-500 text-[10.5px] font-medium whitespace-nowrap">
                    {TIER_LABEL[tier]}
                  </span>
                </span>

                <span className="flex min-w-[240px] flex-1 flex-col gap-2">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={c.owner?.full_name ?? "?"} size={28} />
                    <span className="text-ink-850 text-[13.5px] font-medium">
                      {c.owner?.full_name ?? "Unnamed"}
                    </span>
                    <Link
                      href={`/admin/parents-listings/${c.listing.id}`}
                      className="text-marine-600 text-[12px] font-medium tabular-nums"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.listing.reference_number} →
                    </Link>
                    {c.listing.is_public ? (
                      <span title="On the public board" className="text-ink-500 flex">
                        <GlobeIcon size={13} />
                      </span>
                    ) : null}
                  </span>

                  <span className="text-ink-700 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-normal">
                    <span className="inline-flex items-center gap-1.5">
                      <RouteIcon size={13} />
                      {c.listing.from_airport} → {c.listing.to_airport}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarIcon size={13} />
                      {c.listing.travel_date
                        ? fmtDate(c.listing.travel_date)
                        : "No date"}
                    </span>
                    {c.listing.fee_amount != null ? (
                      <span className="tabular-nums">£{c.listing.fee_amount}</span>
                    ) : null}
                  </span>

                  <span className="text-ink-500 text-[12px] leading-[1.5] font-normal text-pretty">
                    {c.reason}
                  </span>

                  {assistance.length ? (
                    <span className="flex flex-wrap gap-1.5">
                      {assistance.slice(0, 5).map((a) => (
                        <span
                          key={a}
                          className="bg-marine-tint text-marine-600 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                        >
                          {ASSISTANCE_LABELS[a] ?? a}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>

                <span className="flex flex-none items-center">
                  {c.existingMatchId ? (
                    <Btn as="link" href={`/admin/parents-matches/${c.existingMatchId}`}>
                      Open match
                    </Btn>
                  ) : (
                    <Btn
                      variant={tier === "strong" ? "ember" : "ghost"}
                      disabled={!!busy}
                      onClick={() => propose(c.listing.id)}
                      className={cn(busy === c.listing.id && "opacity-70")}
                    >
                      {busy === c.listing.id ? <Spinner /> : <CheckIcon size={15} />}
                      Propose match
                    </Btn>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
