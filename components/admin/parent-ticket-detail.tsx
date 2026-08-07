"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  HeartHandshake,
  Mail,
  Phone,
  MessageCircle,
  Loader2,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  setParentTicketStatus,
  setParentTicketPublic,
  addParentTicketNote,
} from "@/lib/actions/parents-tickets";
import {
  PARENT_TICKET_STATUSES,
  PARENT_TICKET_STATUS_LABELS,
  PARENT_TICKET_STATUS_TONE,
  PARENT_TICKET_TYPE_LABELS,
  PARENT_TICKET_TYPE_TONE,
  maskDisplayName,
  type ParentTicketEnquiry,
  type ParentTicketNote,
  type ParentTicketStatus,
} from "@/lib/parents-tickets";
import { fmtDate, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const selectClass =
  "border-line-field text-ink-800 focus:border-marine-500 focus:shadow-[0_0_0_3px_var(--color-marine-200)] h-10 w-full cursor-pointer rounded-[10px] border bg-white px-3.5 text-[13.5px] font-normal outline-none transition-[border-color,box-shadow] duration-[130ms] disabled:opacity-50";

/** One label/value pair inside a section's definition grid. */
function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-800">
        {value == null || value === "" ? "—" : value}
      </dd>
    </div>
  );
}

function SectionGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>
  );
}

/** "£40" or "—" for a companion fee/offer amount. */
function amount(value: number | null): string {
  return value == null ? "—" : `£${value}`;
}

export function ParentTicketDetail({
  enquiry,
}: {
  enquiry: ParentTicketEnquiry;
}) {
  const router = useRouter();

  const [status, setStatus] = useState<ParentTicketStatus>(enquiry.status);
  const [statusBusy, setStatusBusy] = useState(false);
  const [notes, setNotes] = useState<ParentTicketNote[]>(
    Array.isArray(enquiry.admin_notes) ? enquiry.admin_notes : []
  );
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [isPublic, setIsPublic] = useState(enquiry.is_public);
  const [publicBusy, setPublicBusy] = useState(false);

  const canPublish = enquiry.consent_public;

  const isTraveller = enquiry.enquiry_type === "traveller";

  const mailHref = `mailto:${enquiry.email}?subject=${encodeURIComponent(
    `Your Parents Tickets enquiry ${enquiry.reference_number} — Wicket Travel`
  )}`;
  const waHref = `https://wa.me/${enquiry.phone.replace(/\D/g, "")}`;
  const telHref = `tel:${enquiry.phone.replace(/[^+\d]/g, "")}`;

  async function changeStatus(next: ParentTicketStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setStatusBusy(true);
    const res = await setParentTicketStatus({ id: enquiry.id, status: next });
    setStatusBusy(false);
    if (!res.ok) {
      setStatus(prev);
      toast.error("Couldn't update status", { description: res.error });
      return;
    }
    toast.success(`Marked as ${PARENT_TICKET_STATUS_LABELS[next]}`);
    router.refresh();
  }

  async function togglePublic(next: boolean) {
    if (!canPublish && next) return;
    const prev = isPublic;
    setIsPublic(next);
    setPublicBusy(true);
    const res = await setParentTicketPublic({ id: enquiry.id, isPublic: next });
    setPublicBusy(false);
    if (!res.ok) {
      setIsPublic(prev);
      toast.error("Couldn't update visibility", { description: res.error });
      return;
    }
    toast.success(next ? "Now showing on the website" : "Hidden from the website");
    router.refresh();
  }

  async function saveNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!noteDraft.trim()) return;
    setNoteBusy(true);
    const res = await addParentTicketNote({ id: enquiry.id, body: noteDraft });
    setNoteBusy(false);
    if (!res.ok) {
      toast.error("Couldn't save note", { description: res.error });
      return;
    }
    setNotes((n) => [...n, res.data]);
    setNoteDraft("");
    toast.success("Note saved");
  }

  const contactActions: {
    label: string;
    href: string;
    Icon: typeof Mail;
    external?: boolean;
  }[] = [
    { label: "Email", href: mailHref, Icon: Mail },
    { label: "WhatsApp", href: waHref, Icon: MessageCircle, external: true },
    { label: "Call", href: telHref, Icon: Phone },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/admin/parents-tickets"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-marine-600 transition-colors hover:text-marine-600"
      >
        <ArrowLeft className="size-4" />
        Back to parents tickets
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-[12px] border border-line-base bg-white p-5 shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-marine-tint text-marine-600">
            <HeartHandshake className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-poppins text-lg font-semibold text-ink-900">
                Lead {enquiry.reference_number}
              </p>
              <StatusBadge tone={PARENT_TICKET_TYPE_TONE[enquiry.enquiry_type]}>
                {PARENT_TICKET_TYPE_LABELS[enquiry.enquiry_type]}
              </StatusBadge>
              <StatusBadge tone={PARENT_TICKET_STATUS_TONE[status]}>
                {PARENT_TICKET_STATUS_LABELS[status]}
              </StatusBadge>
              {isPublic ? (
                <StatusBadge tone="green">On website</StatusBadge>
              ) : null}
            </div>
            <p className="text-sm text-ink-600">
              {enquiry.full_name} · Submitted {fmtDate(enquiry.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="lead-status"
            className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]"
          >
            Status
          </label>
          <select
            id="lead-status"
            value={status}
            disabled={statusBusy}
            onChange={(e) => changeStatus(e.target.value as ParentTicketStatus)}
            className={cn(selectClass, "w-44", statusBusy && "opacity-60")}
          >
            {PARENT_TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PARENT_TICKET_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contact */}
      <SectionCard
        title="Contact"
        description="Reach out manually using the details they provided."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2 text-ink-800">
              <Mail className="size-4 text-marine-600" />
              {enquiry.email}
            </p>
            <p className="flex items-center gap-2 text-ink-800">
              <Phone className="size-4 text-marine-600" />
              {enquiry.phone}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {contactActions.map(({ label, href, Icon, external }) => (
              <Button
                key={label}
                variant="outline"
                size="lg"
                render={
                  <a
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                  />
                }
              >
                <Icon className="size-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Public visibility */}
      <SectionCard
        title="Website visibility"
        description="Nothing is shown publicly until you turn this on."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <label
              htmlFor="show-on-website"
              className={cn(
                "block text-sm font-medium",
                canPublish ? "text-ink-800" : "text-ink-600"
              )}
            >
              Show on website
            </label>
            {canPublish ? (
              <p className="text-sm text-ink-600">
                The public board shows only{" "}
                <span className="font-medium text-ink-800">
                  {maskDisplayName(enquiry.full_name)}
                </span>
                , the route, date, airline, languages and what help is
                offered/needed — never contact details.
              </p>
            ) : (
              <p className="text-sm text-ink-600">
                Unavailable — this person didn’t agree to public display when
                they submitted the form.
              </p>
            )}
          </div>
          <Switch
            id="show-on-website"
            checked={isPublic}
            disabled={!canPublish || publicBusy}
            onCheckedChange={togglePublic}
            aria-label="Show this entry on the website"
            className="shrink-0"
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Trip */}
        <SectionCard title="Trip">
          <SectionGrid>
            <Field
              label="Route"
              value={
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  {enquiry.from_location}
                  <ArrowRight className="size-3.5 text-marine-600" />
                  {enquiry.to_location}
                </span>
              }
              wide
            />
            <Field label="Travel date" value={fmtDate(enquiry.travel_date)} />
            <Field label="Airline" value={enquiry.airline} />
            <Field label="Languages" value={enquiry.languages} wide />
          </SectionGrid>
        </SectionCard>

        {/* Side-specific */}
        {isTraveller ? (
          <SectionCard title="Traveller — help offered">
            <SectionGrid>
              <Field
                label="Parents they can help"
                value={enquiry.parents_can_help}
              />
              <Field label="Fee" value={amount(enquiry.fee_amount)} />
              <Field
                label="Assistance offered"
                value={enquiry.assistance_offered}
                wide
              />
            </SectionGrid>
          </SectionCard>
        ) : (
          <SectionCard title="Requester — help needed">
            <SectionGrid>
              <Field label="Parent's name" value={enquiry.parent_name} />
              <Field label="Parent's age" value={enquiry.parent_age} />
              <Field label="Relationship" value={enquiry.relationship} />
              <Field label="Offer" value={amount(enquiry.offer_amount)} />
              <Field
                label="Assistance needed"
                value={enquiry.assistance_needed}
                wide
              />
              <Field
                label="Mobility needs"
                value={enquiry.mobility_needs}
                wide
              />
            </SectionGrid>
          </SectionCard>
        )}
      </div>

      {/* Applicant note + Internal notes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title="Their message"
          description="Anything extra they added when submitting."
        >
          {enquiry.notes ? (
            <p className="whitespace-pre-wrap break-words rounded-xl bg-surface-1 p-3.5 text-sm text-ink-800">
              {enquiry.notes}
            </p>
          ) : (
            <p className="text-sm text-ink-600">
              No additional message.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Internal notes" description="Only admins can see these.">
          <div className="space-y-4">
            {notes.length === 0 ? (
              <p className="text-sm text-ink-600">No notes yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-xl bg-surface-1 p-3.5">
                    <p className="whitespace-pre-wrap break-words text-sm text-ink-800">
                      {note.body}
                    </p>
                    <p className="mt-1.5 text-xs text-ink-600">
                      {fmtRelative(note.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={saveNote} className="space-y-2.5">
              <Label
                htmlFor="new-note"
                className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]"
              >
                Add a note
              </Label>
              <Textarea
                id="new-note"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="e.g. Called them, matched with #PT-1004…"
                rows={3}
                maxLength={2000}
                disabled={noteBusy}
                className="rounded-[10px] bg-surface-1"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={noteBusy || !noteDraft.trim()}
                >
                  {noteBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <StickyNote className="size-4" />
                  )}
                  Save note
                </Button>
              </div>
            </form>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
