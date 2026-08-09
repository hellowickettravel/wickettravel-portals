"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate, fmtRelative } from "@/lib/format";
import {
  ID_DOCUMENT_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
  type VerificationStatus,
} from "@/lib/parents-marketplace";
import {
  reviewIdentity,
  signIdDocument,
  type VerificationQueueRow,
} from "@/lib/actions/parents-marketplace";
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
  type PillTone,
} from "@/components/admin/ui";
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  IdCardIcon,
  LockIcon,
  MailIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/admin/icons";

const TONE: Record<VerificationStatus, PillTone> = {
  unverified: "ink",
  pending_review: "warn",
  verified: "ok",
  rejected: "danger",
};

/**
 * One identity check, for the admin doing the reviewing.
 *
 * The document is the whole point of the screen and it is also the most
 * sensitive object in the system, so it is not embedded: opening it is an
 * explicit click that mints a fresh signed URL server-side, valid for an hour.
 * Nothing on this page holds a document URL at rest, and a reload gets a new
 * one — so a shared screenshot of this screen leaks nothing.
 */
export function VerificationReview({
  record,
}: {
  record: VerificationQueueRow;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState<null | "verified" | "rejected" | "document">(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(record.rejection_reason ?? "");

  const status = record.verification_status;
  const displayName = record.profile?.full_name ?? record.legal_name ?? "Unnamed";
  const hasDocument = !!record.id_document_path;

  // A name mismatch is the single most common reason to reject, so surface it
  // rather than making the reviewer compare two fields by eye.
  const nameMatches =
    !!record.legal_name &&
    !!record.profile?.full_name &&
    record.legal_name.trim().toLowerCase() ===
      record.profile.full_name.trim().toLowerCase();

  async function openDocument() {
    setBusy("document");
    const res = await signIdDocument(record.profile_id);
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't open the document", { description: res.error });
      return;
    }
    window.open(res.data, "_blank", "noopener,noreferrer");
  }

  async function decide(decision: "verified" | "rejected") {
    if (decision === "rejected" && !reason.trim()) {
      setRejecting(true);
      toast.error("Add a reason first", {
        description: "They need to know what to fix.",
      });
      return;
    }
    setBusy(decision);
    const res = await reviewIdentity({
      profileId: record.profile_id,
      decision,
      reason: decision === "rejected" ? reason : undefined,
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't save the decision", { description: res.error });
      return;
    }
    toast.success(decision === "verified" ? "Verified" : "Rejected");
    setRejecting(false);
    router.refresh();
  }

  return (
    <Screen>
      <BackLink href="/admin/parents-verification">Verifications</BackLink>

      {/* -------------------------------------------------------- header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar name={displayName} size={44} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <PageTitle>{displayName}</PageTitle>
              <Pill tone={TONE[status]}>{VERIFICATION_STATUS_LABELS[status]}</Pill>
            </div>
            <p className="text-ink-600 m-0 mt-1.5 text-[13.5px] font-normal">
              {record.profile?.email ?? "No email on file"} · last activity{" "}
              {fmtRelative(record.updated_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Btn onClick={openDocument} disabled={!hasDocument || busy === "document"}>
            {busy === "document" ? <Spinner /> : <DownloadIcon size={15} />}
            Open ID document
          </Btn>
          {status === "verified" ? null : (
            <Btn
              variant="ember"
              onClick={() => decide("verified")}
              disabled={!!busy || !hasDocument}
            >
              {busy === "verified" ? <Spinner /> : <CheckIcon size={15} />}
              Approve
            </Btn>
          )}
          {status === "rejected" ? null : (
            <Btn
              variant="danger"
              onClick={() => (rejecting ? decide("rejected") : setRejecting(true))}
              disabled={!!busy}
            >
              {busy === "rejected" ? <Spinner /> : <CloseIcon size={15} />}
              Reject
            </Btn>
          )}
        </div>
      </div>

      {rejecting && status !== "rejected" ? (
        <Card>
          <CardHead
            icon={<CloseIcon size={15} />}
            title="Why are you rejecting this?"
            hint="They see this word for word, so make it something they can act on."
          />
          <div className="flex flex-col gap-3 px-5 py-4">
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              autoFocus
              placeholder="e.g. The photo is too blurry to read the expiry date — please upload a clearer one."
              aria-label="Reason for rejection"
              className={cn(textareaClass, focusRing)}
            />
            <div className="flex flex-wrap gap-2.5">
              <Btn
                variant="danger"
                onClick={() => decide("rejected")}
                disabled={!!busy || !reason.trim()}
              >
                {busy === "rejected" ? <Spinner /> : null}
                Reject and send this reason
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
          <CardHead icon={<CloseIcon size={15} />} title="Rejected" />
          <p className="text-ink-800 m-0 px-5 py-4 text-[13px] leading-[1.6] font-normal whitespace-pre-wrap text-pretty">
            {record.rejection_reason}
          </p>
        </Card>
      ) : null}

      {/* -------------------------------------------------- column cards */}
      <div className="grid grid-cols-1 items-stretch gap-4 min-[760px]:grid-cols-2">
        <Card>
          <CardHead icon={<UserIcon size={15} />} title="What they told us" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 px-[18px] py-4">
            <MiniField label="Name on document" value={record.legal_name} />
            <MiniField
              label="Date of birth"
              value={record.date_of_birth ? fmtDate(record.date_of_birth) : null}
            />
            <MiniField label="Phone" value={record.phone} />
            <MiniField
              label="Account name"
              value={record.profile?.full_name}
            />
          </div>
        </Card>

        <Card>
          <CardHead icon={<ShieldIcon size={15} />} title="Checks" />
          <div className="flex flex-col gap-2.5 px-[18px] py-4">
            <CheckRow
              label="Email address confirmed"
              ok={record.email_verified}
              detail={record.profile?.email ?? undefined}
              icon={<MailIcon size={14} />}
            />
            <CheckRow
              label="Photo ID uploaded"
              ok={hasDocument}
              detail={
                hasDocument
                  ? `${
                      record.id_document_type
                        ? ID_DOCUMENT_TYPE_LABELS[record.id_document_type]
                        : "Document"
                    }${
                      record.id_document_uploaded_at
                        ? ` · ${fmtDate(record.id_document_uploaded_at)}`
                        : ""
                    }`
                  : "Nothing uploaded yet"
              }
              icon={<IdCardIcon size={14} />}
            />
            <CheckRow
              label="Document name matches the account"
              ok={nameMatches}
              detail={
                nameMatches
                  ? undefined
                  : "Worth a second look — they may have married, or mistyped."
              }
              icon={<UserIcon size={14} />}
              soft
            />
          </div>
        </Card>

        <Card className="col-span-full">
          <CardHead
            icon={<LockIcon size={15} />}
            title="Handling"
            action={
              <span className="text-ink-quiet text-[11px] font-normal whitespace-nowrap">
                Admins only
              </span>
            }
          />
          <p className="text-ink-600 m-0 px-5 py-4 text-[13px] leading-[1.6] font-normal text-pretty">
            The ID document lives in a private bucket. Opening it mints a link
            that works for one hour and is never stored — reload this page to
            get a fresh one. The person who uploaded it cannot view it back, and
            it is never shown on the public board or to anyone they match with.
            {record.reviewed_at
              ? ` Last reviewed ${fmtRelative(record.reviewed_at)}.`
              : ""}
          </p>
        </Card>
      </div>
    </Screen>
  );
}

/** One pass/fail line in the Checks card. */
function CheckRow({
  label,
  ok,
  detail,
  icon,
  soft,
}: {
  label: string;
  ok: boolean;
  detail?: string;
  icon: React.ReactNode;
  /** A failed soft check is a prompt to look, not a blocker. */
  soft?: boolean;
}) {
  return (
    <div className="border-line-hair bg-surface-4 flex items-start gap-3 rounded-[10px] border px-[13px] py-[11px]">
      <span
        className={cn(
          "flex size-7 flex-none items-center justify-center rounded-full",
          ok
            ? "bg-ok-bg text-ok-ink"
            : soft
              ? "bg-warn-bg text-warn-ink"
              : "bg-neutral-bg text-ink-600"
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-ink-850 text-[13px] font-medium">{label}</span>
        {detail ? (
          <span className="text-ink-500 text-[11.5px] leading-[1.45] font-normal text-pretty">
            {detail}
          </span>
        ) : null}
      </span>
      <Pill tone={ok ? "ok" : soft ? "warn" : "ink"}>{ok ? "Yes" : "No"}</Pill>
    </div>
  );
}
