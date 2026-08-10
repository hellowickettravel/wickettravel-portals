"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import {
  LISTING_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  type ListingStatus,
  type VerificationStatus,
} from "@/lib/parents-marketplace";
import {
  createListingFromLead,
  markLeadInvited,
  type LeadBridgeState,
} from "@/lib/actions/parents-lead-bridge";
import {
  Btn,
  Card,
  CardHead,
  Pill,
  Spinner,
  focusRing,
  inputInsetClass,
} from "@/components/admin/ui";
import {
  CheckCircleIcon,
  MailIcon,
  RouteIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/admin/icons";

/**
 * "Bring into the marketplace" — the bridge from a lead to a listing.
 *
 * A lead is somebody who filled in a form on the website and has no account.
 * The marketplace needs a verified person behind every listing, so this card
 * has exactly two states worth designing for: they already have an account
 * (attach the lead to it), or they don't (send them a sign-up link and wait).
 *
 * The invite is a copyable link and a pre-written email rather than something
 * the portal sends. Wicket's leads get a reply from a person today, and a
 * silent automated mail from an unfamiliar address is a worse first contact
 * than the one they already send.
 */
export function LeadBridge({
  leadId,
  leadRef,
  leadName,
  leadEmail,
  state,
}: {
  leadId: string;
  leadRef: string;
  leadName: string;
  leadEmail: string;
  state: LeadBridgeState;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const inviteUrl = `${origin}/signup?email=${encodeURIComponent(
    leadEmail
  )}&name=${encodeURIComponent(leadName)}`;

  const mailHref = `mailto:${leadEmail}?subject=${encodeURIComponent(
    `Your Parents Tickets enquiry ${leadRef} — Wicket Travel`
  )}&body=${encodeURIComponent(
    `Hi ${leadName.split(" ")[0] ?? ""},\n\n` +
      `Thanks for your Parents Tickets enquiry (${leadRef}).\n\n` +
      `We've opened it up so you can manage it yourself: create an account here and you'll be able to post your listing, see who we match you with, and reply to them.\n\n` +
      `${inviteUrl}\n\n` +
      `We check everyone by hand before they appear on the board, so you'll be asked for a photo ID — that's what makes it safe for families trusting a stranger with someone they love.\n\n` +
      `Any questions, just reply to this email.\n\nWicket Travel`
  )}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the link and copy it by hand.");
    }
  }

  async function convert() {
    setBusy("convert");
    const res = await createListingFromLead(leadId);
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't bring it across", { description: res.error });
      return;
    }
    toast.success(`Draft listing created — ${res.data.reference}`);
    router.refresh();
  }

  async function invited() {
    setBusy("invite");
    const res = await markLeadInvited(leadId);
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't record that", { description: res.error });
      return;
    }
    toast.success("Marked as invited");
    router.refresh();
  }

  // ---- Already brought across -----------------------------------------
  if (state.listing) {
    return (
      <Card>
        <CardHead
          icon={<RouteIcon size={15} />}
          title="In the marketplace"
          action={
            <Pill tone="ok">
              {LISTING_STATUS_LABELS[state.listing.listing_status as ListingStatus] ??
                state.listing.listing_status}
            </Pill>
          }
        />
        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="text-ink-600 min-w-[240px] flex-1 text-[13px] leading-[1.55] font-normal text-pretty">
            This enquiry became listing{" "}
            <span className="text-ink-850 font-medium tabular-nums">
              {state.listing.reference_number}
            </span>
            . It sits in their own portal as a draft until they complete it and
            send it for review — nothing here was published on their behalf.
          </span>
          <Btn as="link" href={`/admin/parents-listings/${state.listing.id}`}>
            Open the listing
          </Btn>
        </div>
      </Card>
    );
  }

  // ---- They have an account --------------------------------------------
  if (state.account) {
    const verification = (state.verification ?? "unverified") as VerificationStatus;
    const verified = verification === "verified";

    return (
      <Card>
        <CardHead
          icon={<RouteIcon size={15} />}
          title="Bring into the marketplace"
          hint="They already have an account, so this enquiry can become a listing they manage themselves."
        />
        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="border-line-hair bg-surface-4 flex flex-wrap items-center gap-3 rounded-[11px] border px-4 py-3">
            <span className="bg-ok-bg text-ok-ink flex size-8 flex-none items-center justify-center rounded-full">
              <UserIcon size={16} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-ink-850 text-[13px] font-medium">
                {state.account.full_name ?? "Account found"}
              </span>
              <span className="text-ink-500 text-[11.5px] font-normal">
                {state.account.email}
              </span>
            </span>
            <Pill tone={verified ? "ok" : "warn"}>
              {VERIFICATION_STATUS_LABELS[verification]}
            </Pill>
          </div>

          <p className="text-ink-600 m-0 text-[13px] leading-[1.55] font-normal text-pretty">
            We&apos;ll copy the route, date, airline, fee and everything they
            wrote into a <span className="text-ink-850 font-medium">draft</span>{" "}
            listing they own. What we won&apos;t guess is which assistance boxes
            to tick — their free text can&apos;t be mapped onto the fixed list
            without inventing intent, and matching compares those directly. It
            comes across in the notes and they tick it themselves.
          </p>

          {!verified ? (
            <p className="border-warn-bg bg-warn-bg text-warn-ink m-0 rounded-[10px] border px-3.5 py-2.5 text-[12.5px] leading-[1.5] font-normal text-pretty">
              They aren&apos;t verified yet, so the draft can&apos;t be sent for
              review until they are. Creating it now is still useful — it&apos;s
              waiting for them when they finish.{" "}
              <Link
                href={`/admin/parents-verification/${state.account.id}`}
                className="text-warn-ink font-medium underline underline-offset-2"
              >
                Their verification
              </Link>
            </p>
          ) : null}

          <Btn variant="ember" onClick={convert} disabled={!!busy} className="self-start">
            {busy === "convert" ? <Spinner /> : <RouteIcon size={15} />}
            Create their draft listing
          </Btn>
        </div>
      </Card>
    );
  }

  // ---- No account yet ---------------------------------------------------
  return (
    <Card>
      <CardHead
        icon={<MailIcon size={15} />}
        title="Bring into the marketplace"
        hint="No account with this email yet — invite them to make one."
        action={
          state.invitedAt ? (
            <Pill tone="ok">Invited {fmtDate(state.invitedAt)}</Pill>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-4 px-5 py-5">
        <p className="text-ink-600 m-0 text-[13px] leading-[1.55] font-normal text-pretty">
          A listing needs a verified person behind it, so this enquiry can only
          become one once they hold an account. Send them the link below —
          it opens sign-up with their name and email already filled in, and
          their enquiry stays here until they&apos;re in.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            readOnly
            value={inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Sign-up invite link"
            className={cn(inputInsetClass, focusRing, "min-w-[260px] flex-1")}
          />
          <Btn onClick={copyInvite}>
            {copied ? <CheckCircleIcon size={15} /> : null}
            {copied ? "Copied" : "Copy link"}
          </Btn>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Btn as="link" href={mailHref} variant="ember">
            <MailIcon size={15} />
            Write the invite email
          </Btn>
          <Btn onClick={invited} disabled={!!busy}>
            {busy === "invite" ? <Spinner /> : <ShieldIcon size={15} />}
            {state.invitedAt ? "Mark invited again" : "Mark as invited"}
          </Btn>
          <span className="text-ink-500 text-[12px] font-normal">
            The email opens in your own client — we don&apos;t send it for you.
          </span>
        </div>
      </div>
    </Card>
  );
}
