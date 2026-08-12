"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import {
  ID_DOCUMENT_TYPES,
  ID_DOCUMENT_TYPE_LABELS,
  VERIFICATION_STATUS_LABELS,
  type IdDocumentType,
  type ParentTicketIdentity,
} from "@/lib/parents-marketplace";
import {
  ATTACHMENT_ACCEPT,
  uploadIdDocument,
  validateAttachment,
} from "@/lib/storage";
import {
  recordIdDocument,
  saveIdentityDetails,
  submitIdentityForReview,
  withdrawIdentityFromReview,
} from "@/lib/actions/parents-marketplace";
import {
  Btn,
  Card,
  CardHead,
  Field,
  FieldLabel,
  PageHead,
  Pill,
  Screen,
  Spinner,
  focusRing,
  inputClass,
  shadowE1,
  type PillTone,
} from "@/components/admin/ui";
import { LiveRefresh } from "@/components/admin/live-refresh";
import {
  CheckCircleIcon,
  IdCardIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  ShieldIcon,
  UploadIcon,
  UserIcon,
} from "@/components/admin/icons";

const STATUS_TONE: Record<ParentTicketIdentity["verification_status"], PillTone> = {
  unverified: "ink",
  pending_review: "warn",
  verified: "ok",
  rejected: "danger",
};

/**
 * Parents Tickets identity verification, the traveller's side.
 *
 * This is the trust gate for the whole marketplace, so the screen's job is to
 * make the state of it unmissable: a status pill, a three-step checklist that
 * says exactly what is still missing, and only then the forms. Someone landing
 * here mid-way should be able to tell what they owe us without reading a word
 * of body copy.
 *
 * The document itself is never shown back — not even to the person who
 * uploaded it. It goes straight into a private bucket, and only a reviewing
 * admin ever sees it, through a short-lived signed URL. So the "uploaded"
 * state deliberately shows a filename and a date rather than a preview.
 */
export function VerificationView({
  identity,
  accountEmail,
  emailConfirmed,
}: {
  identity: ParentTicketIdentity;
  accountEmail: string;
  /** From Supabase Auth — the one source of truth for email verification. */
  emailConfirmed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [legalName, setLegalName] = useState(identity.legal_name ?? "");
  const [dob, setDob] = useState(identity.date_of_birth ?? "");
  const [phone, setPhone] = useState(identity.phone ?? "");
  const [savingDetails, setSavingDetails] = useState(false);

  const [docType, setDocType] = useState<IdDocumentType>(
    identity.id_document_type ?? "passport"
  );
  const [uploading, setUploading] = useState(false);

  const status = identity.verification_status;
  const locked = status === "pending_review" || status === "verified";
  const hasDocument = !!identity.id_document_path;
  const detailsDone = !!identity.legal_name;

  const steps = [
    { label: "Confirm your email address", done: emailConfirmed },
    { label: "Tell us the name on your document", done: detailsDone },
    { label: "Upload a photo ID", done: hasDocument },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  async function onSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingDetails(true);
    const res = await saveIdentityDetails({
      legalName,
      dateOfBirth: dob || null,
      phone,
    });
    setSavingDetails(false);
    if (!res.ok) {
      toast.error("Couldn't save", { description: res.error });
      return;
    }
    toast.success("Details saved");
    router.refresh();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
    if (!file) return;

    const valid = validateAttachment(file);
    if (!valid.ok) {
      toast.error("Can't use that file", { description: valid.error });
      return;
    }

    setUploading(true);
    const uploaded = await uploadIdDocument(file, identity.profile_id);
    if (!uploaded.ok) {
      setUploading(false);
      toast.error("Upload failed", { description: uploaded.error });
      return;
    }

    const recorded = await recordIdDocument({
      documentType: docType,
      path: uploaded.path,
    });
    setUploading(false);
    if (!recorded.ok) {
      toast.error("Couldn't save the document", { description: recorded.error });
      return;
    }
    toast.success("Document uploaded");
    router.refresh();
  }

  function onSubmitForReview() {
    startTransition(async () => {
      const res = await submitIdentityForReview();
      if (!res.ok) {
        toast.error("Not ready yet", { description: res.error });
        return;
      }
      toast.success("Sent for review");
      router.refresh();
    });
  }

  function onWithdraw() {
    startTransition(async () => {
      const res = await withdrawIdentityFromReview();
      if (!res.ok) {
        toast.error("Couldn't reopen", { description: res.error });
        return;
      }
      toast.success("Reopened — you can make changes now");
      router.refresh();
    });
  }

  return (
    <Screen>
      <PageHead
        title="Get verified"
        intro="Parents Tickets pairs a traveller with a family trusting them with someone they love. Everyone on the board is checked by hand first — this is that check."
        actions={
          <>
            {/* An admin approving or rejecting the ID happens on their screen;
                this is the person waiting to hear. Without this the pill sits
                on "In review" until they think to reload. */}
            <LiveRefresh
              channel="parents-verification-self"
              tables={["parent_ticket_identities"]}
            />
            <Pill tone={STATUS_TONE[status]}>
              {VERIFICATION_STATUS_LABELS[status]}
            </Pill>
          </>
        }
      />

      {/* ------------------------------------------------- where things stand */}
      <Card>
        <CardHead
          icon={<ShieldIcon size={15} />}
          title="Your verification"
          hint={
            status === "verified"
              ? "You're verified — nothing further to do."
              : status === "pending_review"
                ? "With our team now. We'll email you when it's done."
                : remaining === 0
                  ? "Everything's ready — send it to us."
                  : `${remaining} thing${remaining === 1 ? "" : "s"} left`
          }
        />

        <div className="flex flex-col gap-4 px-5 py-5">
          {status === "rejected" && identity.rejection_reason ? (
            <p className="border-danger-bg bg-danger-bg text-danger-ink m-0 rounded-[12px] border px-4 py-3 text-[13px] leading-[1.55] font-normal text-pretty">
              <span className="font-medium">We couldn&apos;t verify this: </span>
              {identity.rejection_reason}
            </p>
          ) : null}

          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-[22px] flex-none items-center justify-center rounded-full border-[1.5px]",
                    step.done
                      ? "border-ok-edge bg-ok-bg text-ok-ink"
                      : "border-line-strong bg-white"
                  )}
                >
                  {step.done ? <CheckCircleIcon size={13} width={2.2} /> : null}
                </span>
                <span
                  className={cn(
                    "text-[13.5px] leading-[normal] font-normal",
                    step.done ? "text-ink-600" : "text-ink-850 font-medium"
                  )}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>

          <div className="border-line-soft flex flex-wrap items-center gap-3 border-t pt-4">
            {status === "pending_review" ? (
              <>
                <span className="text-ink-600 flex-1 text-[12.5px] font-normal">
                  Sent {fmtDate(identity.updated_at)}. Need to change something?
                </span>
                <Btn onClick={onWithdraw} disabled={pending}>
                  {pending ? <Spinner /> : null}
                  Reopen for editing
                </Btn>
              </>
            ) : status === "verified" ? (
              <span className="text-ok-ink inline-flex items-center gap-2 text-[13px] font-medium">
                <CheckCircleIcon size={16} />
                Verified{identity.reviewed_at ? ` on ${fmtDate(identity.reviewed_at)}` : ""}
              </span>
            ) : (
              <Btn
                variant="ember"
                onClick={onSubmitForReview}
                disabled={pending || remaining > 0}
              >
                {pending ? <Spinner /> : <ShieldIcon size={15} />}
                Send for review
              </Btn>
            )}
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------- email */}
      <Card>
        <CardHead
          icon={<MailIcon size={15} />}
          title="Email address"
          action={
            emailConfirmed ? (
              <Pill tone="ok">Confirmed</Pill>
            ) : (
              <Pill tone="warn">Not confirmed</Pill>
            )
          }
        />
        <div className="px-5 py-4">
          <p className="text-ink-600 m-0 text-[13px] leading-[1.55] font-normal text-pretty">
            <span className="text-ink-850 font-medium">{accountEmail}</span>
            {emailConfirmed
              ? " — confirmed when you set up your account."
              : " — we sent a confirmation link when you signed up. Open it, then reload this page."}
          </p>
        </div>
      </Card>

      {/* ----------------------------------------------------------- details */}
      <Card>
        <CardHead
          icon={<UserIcon size={15} />}
          title="Your details"
          hint="Exactly as they appear on your ID"
        />
        <form onSubmit={onSaveDetails} className="flex flex-col gap-4 px-5 py-5">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Field>
              <FieldLabel htmlFor="pt-legal-name" icon={<UserIcon size={13} />}>
                Full name on your document
              </FieldLabel>
              <input
                id="pt-legal-name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={locked}
                maxLength={150}
                autoComplete="name"
                className={cn(inputClass, focusRing, locked && "opacity-60")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="pt-dob" optional>
                Date of birth
              </FieldLabel>
              <input
                id="pt-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                disabled={locked}
                className={cn(inputClass, focusRing, locked && "opacity-60")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="pt-phone" icon={<PhoneIcon size={13} />}>
                Phone number
              </FieldLabel>
              <input
                id="pt-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={locked}
                maxLength={30}
                autoComplete="tel"
                className={cn(inputClass, focusRing, locked && "opacity-60")}
              />
            </Field>
          </div>

          {locked ? (
            <p className="text-ink-500 m-0 inline-flex items-center gap-2 text-[12px] font-normal">
              <LockIcon size={13} />
              Locked while your verification is
              {status === "verified" ? " complete" : " with our team"}.
            </p>
          ) : (
            <Btn type="submit" disabled={savingDetails} className="self-start">
              {savingDetails ? <Spinner /> : null}
              Save details
            </Btn>
          )}
        </form>
      </Card>

      {/* ---------------------------------------------------------- document */}
      <Card>
        <CardHead
          icon={<IdCardIcon size={15} />}
          title="Photo ID"
          action={hasDocument ? <Pill tone="ok">Uploaded</Pill> : undefined}
        />
        <div className="flex flex-col gap-4 px-5 py-5">
          <p className="text-ink-600 m-0 text-[13px] leading-[1.55] font-normal text-pretty">
            One clear photo or scan showing your name, photo and date of birth.
            It is stored privately, seen only by the person reviewing it, and is
            never shown on the board or to anyone you match with.
          </p>

          {hasDocument ? (
            <div
              className={cn(
                "border-line-base flex flex-wrap items-center gap-3 rounded-[12px] border bg-white px-4 py-3.5",
                shadowE1
              )}
            >
              <span className="bg-ok-bg text-ok-ink flex size-9 flex-none items-center justify-center rounded-full">
                <CheckCircleIcon size={17} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-ink-850 text-[13.5px] font-medium">
                  {identity.id_document_type
                    ? ID_DOCUMENT_TYPE_LABELS[identity.id_document_type]
                    : "Document"}{" "}
                  received
                </span>
                <span className="text-ink-500 text-[11.5px] font-normal">
                  {identity.id_document_uploaded_at
                    ? `Uploaded ${fmtDate(identity.id_document_uploaded_at)}`
                    : "Uploaded"}{" "}
                  · not shown back for your security
                </span>
              </span>
            </div>
          ) : null}

          {!locked ? (
            <div className="flex flex-wrap items-end gap-4">
              <Field className="min-w-[220px] flex-1">
                <FieldLabel htmlFor="pt-doc-type">Document type</FieldLabel>
                <select
                  id="pt-doc-type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as IdDocumentType)}
                  disabled={uploading}
                  className={cn(inputClass, focusRing, "cursor-pointer pr-9")}
                >
                  {ID_DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ID_DOCUMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>

              <label
                className={cn(
                  "inline-flex h-10 flex-none cursor-pointer items-center gap-2 rounded-full px-5 text-[13px] font-medium",
                  "bg-ember-600 text-white hover:bg-ember-700",
                  uploading && "pointer-events-none opacity-60"
                )}
              >
                {uploading ? <Spinner /> : <UploadIcon size={15} />}
                {hasDocument ? "Replace document" : "Upload document"}
                <input
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  onChange={onPickFile}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
            </div>
          ) : null}

          <p className="text-ink-500 m-0 text-[11.5px] font-normal">
            PNG, JPG or PDF · up to 10MB
          </p>
        </div>
      </Card>
    </Screen>
  );
}
