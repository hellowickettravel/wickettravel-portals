"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Stamp,
  Mail,
  Phone,
  MessageCircle,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  setVisaEnquiryStatus,
  addVisaEnquiryNote,
  type VisaEnquiryDetail as Detail,
} from "@/lib/actions/visa";
import {
  VISA_STATUSES,
  VISA_STATUS_LABELS,
  VISA_STATUS_TONE,
  type PreferredContactMethod,
  type VisaAdminNote,
  type VisaEnquiryStatus,
} from "@/lib/visa";
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

/** Yes/No badge; `alert` renders Yes in red (background flags the admin must see). */
function YesNo({ value, alert }: { value: boolean; alert?: boolean }) {
  return (
    <StatusBadge tone={value ? (alert ? "red" : "blue") : "slate"}>
      {value ? "Yes" : "No"}
    </StatusBadge>
  );
}

function SectionGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>
  );
}

function fmtBytes(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

export function VisaEnquiryDetail({ detail }: { detail: Detail }) {
  const router = useRouter();
  const { enquiry, documents } = detail;

  const [status, setStatus] = useState<VisaEnquiryStatus>(enquiry.status);
  const [statusBusy, setStatusBusy] = useState(false);
  const [notes, setNotes] = useState<VisaAdminNote[]>(
    Array.isArray(enquiry.admin_notes) ? enquiry.admin_notes : []
  );
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

  const fullName = `${enquiry.first_name} ${enquiry.last_name}`.trim();
  const preferred = enquiry.preferred_contact_method;

  const mailHref = `mailto:${enquiry.email}?subject=${encodeURIComponent(
    `Your Dubai visa enquiry ${enquiry.reference_number} — Wicket Travel`
  )}`;
  const waHref = `https://wa.me/${enquiry.phone.replace(/\D/g, "")}`;
  const telHref = `tel:${enquiry.phone.replace(/[^+\d]/g, "")}`;

  async function changeStatus(next: VisaEnquiryStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setStatusBusy(true);
    const res = await setVisaEnquiryStatus({ id: enquiry.id, status: next });
    setStatusBusy(false);
    if (!res.ok) {
      setStatus(prev);
      toast.error("Couldn't update status", { description: res.error });
      return;
    }
    toast.success(`Marked as ${VISA_STATUS_LABELS[next]}`);
    router.refresh();
  }

  async function saveNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!noteDraft.trim()) return;
    setNoteBusy(true);
    const res = await addVisaEnquiryNote({ id: enquiry.id, body: noteDraft });
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
    method: PreferredContactMethod;
    label: string;
    href: string;
    Icon: typeof Mail;
    external?: boolean;
  }[] = [
    { method: "email", label: "Email", href: mailHref, Icon: Mail },
    {
      method: "whatsapp",
      label: "WhatsApp",
      href: waHref,
      Icon: MessageCircle,
      external: true,
    },
    { method: "phone", label: "Call", href: telHref, Icon: Phone },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/admin/visa-queries"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-marine-600 transition-colors hover:text-marine-600"
      >
        <ArrowLeft className="size-4" />
        Back to visa queries
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-[12px] border border-line-base bg-white p-5 shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-marine-tint text-marine-600">
            <Stamp className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-poppins text-lg font-semibold text-ink-900">
                Enquiry {enquiry.reference_number}
              </p>
              <StatusBadge tone={VISA_STATUS_TONE[status]}>
                {VISA_STATUS_LABELS[status]}
              </StatusBadge>
            </div>
            <p className="text-sm text-ink-600">
              {fullName} · {enquiry.visa_type} · Submitted{" "}
              {fmtDate(enquiry.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="enquiry-status"
            className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]"
          >
            Status
          </label>
          <select
            id="enquiry-status"
            value={status}
            disabled={statusBusy}
            onChange={(e) => changeStatus(e.target.value as VisaEnquiryStatus)}
            className={cn(selectClass, "w-44", statusBusy && "opacity-60")}
          >
            {VISA_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VISA_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contact the applicant */}
      <SectionCard
        title="Contact applicant"
        description="Reach out using the details they provided — their preferred method is highlighted."
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
            {contactActions.map(({ method, label, href, Icon, external }) => {
              const isPreferred = method === preferred;
              return (
                <span key={method} className="inline-flex items-center gap-1.5">
                  <Button
                    variant={isPreferred ? "default" : "outline"}
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
                  {isPreferred ? (
                    <StatusBadge tone="blue">Preferred</StatusBadge>
                  ) : null}
                </span>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 1 — Visa & Travel */}
        <SectionCard title="Visa & Travel">
          <SectionGrid>
            <Field label="Visa type" value={enquiry.visa_type} />
            <Field label="Purpose of visit" value={enquiry.purpose_of_visit} />
            <Field label="Arrival date" value={fmtDate(enquiry.arrival_date)} />
            <Field
              label="Departure date"
              value={fmtDate(enquiry.departure_date)}
            />
            <Field
              label="More than one person"
              value={<YesNo value={enquiry.more_than_one_person} />}
            />
            <Field
              label="Planned activities"
              value={enquiry.planned_activities}
              wide
            />
          </SectionGrid>
        </SectionCard>

        {/* 2 — Personal */}
        <SectionCard title="Personal">
          <SectionGrid>
            <Field label="Full name" value={fullName} />
            <Field label="Other names" value={enquiry.other_names} />
            <Field
              label="Date of birth"
              value={fmtDate(enquiry.date_of_birth)}
            />
            <Field label="Place of birth" value={enquiry.place_of_birth} />
            <Field label="Nationality" value={enquiry.nationality} />
            <Field label="Gender" value={enquiry.gender} />
            <Field label="Marital status" value={enquiry.marital_status} />
            <Field label="Phone" value={enquiry.phone} />
            <Field label="Email" value={enquiry.email} wide />
            <Field label="UK address" value={enquiry.uk_address} wide />
          </SectionGrid>
        </SectionCard>

        {/* 3 — Passport & UK Visa */}
        <SectionCard title="Passport & UK Visa">
          <SectionGrid>
            <Field label="Passport type" value={enquiry.passport_type} />
            <Field label="Passport number" value={enquiry.passport_number} />
            <Field
              label="Issue date"
              value={fmtDate(enquiry.passport_issue_date)}
            />
            <Field
              label="Expiry date"
              value={fmtDate(enquiry.passport_expiry_date)}
            />
            <Field label="Issuing country" value={enquiry.issuing_country} />
            <Field label="UK visa / BRP ref" value={enquiry.uk_visa_brp_ref} />
            <Field
              label="UK visa start"
              value={fmtDate(enquiry.uk_visa_start_date)}
            />
            <Field
              label="UK visa expiry"
              value={fmtDate(enquiry.uk_visa_expiry_date)}
            />
            <Field
              label="Previously visited UAE"
              value={<YesNo value={enquiry.previously_visited_uae} />}
            />
            <Field
              label="Previous UAE visa number"
              value={enquiry.previous_uae_visa_number}
            />
          </SectionGrid>
        </SectionCard>

        {/* 4 — Employment & Background */}
        <SectionCard title="Employment & Background">
          <SectionGrid>
            <Field label="Occupation" value={enquiry.occupation} />
            <Field label="Job title" value={enquiry.job_title} />
            <Field label="Employer" value={enquiry.employer_name} />
            <Field label="Who covers costs" value={enquiry.who_covers_costs} />
            <Field
              label="Employer address"
              value={enquiry.employer_address}
              wide
            />
            <Field
              label="Refused entry to UAE"
              value={<YesNo value={enquiry.refused_entry_uae} alert />}
            />
            <Field
              label="Criminal conviction"
              value={<YesNo value={enquiry.criminal_conviction} alert />}
            />
          </SectionGrid>
        </SectionCard>
      </div>

      {/* 5 — Documents & Notes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title="Documents"
          description="Uploaded with the application. Links are private, short-lived signed URLs."
        >
          {enquiry.additional_notes ? (
            <div className="mb-4 rounded-xl bg-surface-1 p-3.5 text-sm text-ink-800">
              <p className="text-ink-500 mb-1 text-[11px] font-medium uppercase tracking-[0.09em]">
                Applicant’s note
              </p>
              <p className="whitespace-pre-wrap break-words">
                {enquiry.additional_notes}
              </p>
            </div>
          ) : null}
          {documents.length === 0 ? (
            <p className="text-sm text-ink-600">
              No documents were uploaded.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {documents.map((doc) => (
                <li
                  key={doc.url}
                  className="flex items-center gap-3 rounded-xl border border-line-base bg-white p-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-marine-tint text-marine-600">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">
                      {doc.name}
                    </p>
                    <p className="text-xs text-ink-600">
                      {fmtBytes(doc.size)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`View ${doc.name}`}
                      render={
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Download ${doc.name}`}
                      render={<a href={doc.url} download={doc.name} />}
                    >
                      <Download className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Internal notes"
          description="Only admins can see these."
        >
          <div className="space-y-4">
            {notes.length === 0 ? (
              <p className="text-sm text-ink-600">No notes yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-xl bg-surface-1 p-3.5"
                  >
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
                placeholder="e.g. Called the applicant, waiting on passport scan…"
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
