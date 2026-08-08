"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  setVisaEnquiryStatus,
  addVisaEnquiryNote,
  type VisaEnquiryDetail as Detail,
} from "@/lib/actions/visa";
import {
  VISA_STATUSES,
  VISA_STATUS_LABELS,
  type VisaAdminNote,
  type VisaEnquiryStatus,
} from "@/lib/visa";
import { fmtDate, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  BackLink,
  Btn,
  Card,
  CardHead,
  ContactButtons,
  MiniField,
  PageTitle,
  Pill,
  Screen,
  Spinner,
  focusRing,
  textareaClass,
} from "@/components/admin/ui";
import {
  BriefcaseIcon,
  CheckIcon,
  DocumentIcon,
  DownloadDocIcon,
  EditIcon,
  IdCardIcon,
  ImageIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
  VisaIcon,
  WhatsAppIcon,
} from "@/components/admin/icons";

const selectClass =
  "border-line-field text-ink-800 h-[34px] cursor-pointer rounded-full border bg-white pr-8 pl-3.5 text-[12.5px] font-medium outline-none disabled:opacity-50";

function yesNo(v: boolean) {
  return v ? "Yes" : "No";
}

function fmtBytes(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function isImage(name: string) {
  return /\.(png|jpe?g|gif|webp)$/i.test(name);
}

/**
 * A visa enquiry, built to the design's "Enquiry detail" screen: a contact row
 * in each channel's own hue, then the whole application laid out as column
 * cards of compact label/value tiles, with documents and internal notes last.
 */
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

  return (
    <Screen>
      <BackLink href="/admin/visa-queries">Visa queries</BackLink>

      {/* -------------------------------------------------------- header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <PageTitle>{enquiry.reference_number}</PageTitle>
            <Pill>{VISA_STATUS_LABELS[status]}</Pill>
          </div>
          <p className="text-ink-600 m-0 mt-1.5 text-[13.5px] font-normal">
            {fullName} · {enquiry.visa_type} · submitted{" "}
            {fmtDate(enquiry.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-ink-600 text-[11.5px] font-medium whitespace-nowrap">
              Status
            </span>
            <select
              value={status}
              disabled={statusBusy}
              onChange={(e) => changeStatus(e.target.value as VisaEnquiryStatus)}
              className={cn(selectClass, focusRing, statusBusy && "opacity-60")}
            >
              {VISA_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VISA_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <Btn
            disabled={statusBusy || status === "closed"}
            onClick={() => changeStatus("closed")}
          >
            <CheckIcon size={15} />
            Mark closed
          </Btn>
          <Btn as="link" href={mailHref} variant="marine">
            <MailIcon size={15} />
            Reply by email
          </Btn>
        </div>
      </div>

      {/* ------------------------------------------------ contact applicant */}
      <Card>
        <div className="border-line-soft flex flex-wrap items-baseline gap-2.5 border-b px-5 py-4">
          <h2 className="text-ink-800 m-0 text-[13.5px] font-semibold tracking-[-0.008em]">
            Contact applicant
          </h2>
          <span className="text-ink-500 text-[12px] font-normal">
            {fullName} · preferred method highlighted
          </span>
        </div>
        <ContactButtons
          icons={{
            mail: <MailIcon size={24} />,
            whatsapp: <WhatsAppIcon size={24} />,
            phone: <PhoneIcon size={24} />,
          }}
          channels={[
            {
              key: "mail",
              label: "Email",
              sub: enquiry.email,
              href: mailHref,
              preferred: preferred === "email",
            },
            {
              key: "whatsapp",
              label: "WhatsApp",
              sub: enquiry.phone,
              href: waHref,
              external: true,
              preferred: preferred === "whatsapp",
            },
            {
              key: "phone",
              label: "Call",
              sub: enquiry.phone,
              href: telHref,
              preferred: preferred === "phone",
            },
          ]}
        />
      </Card>

      {/* --------------------------------------------------- column cards */}
      <div className="grid grid-cols-1 items-stretch gap-4 min-[760px]:grid-cols-2">
        <Card className="col-span-full">
          <CardHead
            icon={<VisaIcon size={15} />}
            title="Visa & travel"
            action={
              <span className="text-ink-quiet text-[11px] font-normal whitespace-nowrap">
                As submitted
              </span>
            }
          />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 px-[18px] py-4">
            <MiniField label="Visa type" value={enquiry.visa_type} />
            <MiniField label="Purpose of visit" value={enquiry.purpose_of_visit} />
            <MiniField label="Arrival date" value={fmtDate(enquiry.arrival_date)} />
            <MiniField
              label="Departure date"
              value={fmtDate(enquiry.departure_date)}
            />
            <MiniField
              label="More than one person"
              value={yesNo(enquiry.more_than_one_person)}
            />
            <MiniField
              label="Planned activities"
              value={enquiry.planned_activities}
            />
          </div>
        </Card>

        <Card>
          <CardHead icon={<UserIcon size={15} />} title="Personal information" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 px-[18px] py-4">
            <MiniField label="Full name" value={fullName} />
            <MiniField label="Other names" value={enquiry.other_names} />
            <MiniField
              label="Date of birth"
              value={fmtDate(enquiry.date_of_birth)}
            />
            <MiniField label="Place of birth" value={enquiry.place_of_birth} />
            <MiniField label="Nationality" value={enquiry.nationality} />
            <MiniField label="Gender" value={enquiry.gender} />
            <MiniField label="Marital status" value={enquiry.marital_status} />
            <MiniField label="Phone" value={enquiry.phone} />
            <MiniField label="Email" value={enquiry.email} />
            <MiniField label="UK address" value={enquiry.uk_address} />
          </div>
        </Card>

        <Card>
          <CardHead icon={<IdCardIcon size={15} />} title="Passport & UK visa" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 px-[18px] py-4">
            <MiniField label="Passport type" value={enquiry.passport_type} />
            <MiniField label="Passport number" value={enquiry.passport_number} />
            <MiniField
              label="Issue date"
              value={fmtDate(enquiry.passport_issue_date)}
            />
            <MiniField
              label="Expiry date"
              value={fmtDate(enquiry.passport_expiry_date)}
            />
            <MiniField label="Issuing country" value={enquiry.issuing_country} />
            <MiniField label="UK visa / BRP ref" value={enquiry.uk_visa_brp_ref} />
            <MiniField
              label="UK visa start"
              value={fmtDate(enquiry.uk_visa_start_date)}
            />
            <MiniField
              label="UK visa expiry"
              value={fmtDate(enquiry.uk_visa_expiry_date)}
            />
            <MiniField
              label="Previously visited UAE"
              value={yesNo(enquiry.previously_visited_uae)}
            />
            <MiniField
              label="Previous UAE visa number"
              value={enquiry.previous_uae_visa_number}
            />
          </div>
        </Card>

        <Card>
          <CardHead icon={<BriefcaseIcon size={15} />} title="Background" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 px-[18px] py-4">
            <MiniField label="Occupation" value={enquiry.occupation} />
            <MiniField label="Job title" value={enquiry.job_title} />
            <MiniField label="Employer" value={enquiry.employer_name} />
            <MiniField label="Employer address" value={enquiry.employer_address} />
            <MiniField label="Who covers costs" value={enquiry.who_covers_costs} />
            <MiniField
              label="Refused entry to UAE"
              value={
                enquiry.refused_entry_uae ? (
                  <span className="text-danger-ink">Yes</span>
                ) : (
                  "No"
                )
              }
            />
            <MiniField
              label="Criminal conviction"
              value={
                enquiry.criminal_conviction ? (
                  <span className="text-danger-ink">Yes</span>
                ) : (
                  "No"
                )
              }
            />
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHead
            icon={<DocumentIcon size={15} />}
            title="Documents"
            action={
              <span className="text-ink-quiet text-[11px] font-normal whitespace-nowrap">
                Private signed links
              </span>
            }
          />
          <div className="flex flex-1 flex-col px-[18px] pt-2.5 pb-4">
            {enquiry.additional_notes ? (
              <p className="border-line-soft bg-surface-1 text-ink-800 m-0 mb-3 rounded-[12px] border px-4 py-3.5 text-[13px] leading-[1.6] font-normal whitespace-pre-wrap text-pretty">
                {enquiry.additional_notes}
              </p>
            ) : null}
            {documents.length === 0 ? (
              <p className="text-ink-600 m-0 py-6 text-center text-[13px]">
                No documents were uploaded.
              </p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.url}
                  className="border-line-soft flex min-w-0 items-center gap-[11px] border-b py-[11px] last:border-b-0"
                >
                  <span
                    className={cn(
                      "flex size-8 flex-none items-center justify-center rounded-[9px]",
                      isImage(doc.name)
                        ? "bg-ok-wash text-ok-ink"
                        : "bg-marine-wash text-marine-600"
                    )}
                  >
                    {isImage(doc.name) ? (
                      <ImageIcon size={17} />
                    ) : (
                      <DocumentIcon size={17} />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-ink-800 truncate text-[12.5px] font-medium">
                      {doc.name}
                    </span>
                    <span className="text-ink-500 text-[11px] font-normal">
                      {fmtBytes(doc.size)}
                    </span>
                  </span>
                  <a
                    href={doc.url}
                    download={doc.name}
                    aria-label={`Download ${doc.name}`}
                    className="border-line-field text-marine-600 hover:bg-surface-1 flex size-[30px] flex-none items-center justify-center rounded-full border bg-white no-underline hover:no-underline"
                  >
                    <DownloadDocIcon size={14} />
                  </a>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="col-span-full flex flex-col">
          <CardHead
            icon={<EditIcon size={15} />}
            title="Internal notes"
            action={
              <span className="text-ink-quiet text-[11px] font-normal whitespace-nowrap">
                Admins only
              </span>
            }
          />
          <div className="flex flex-1 flex-col gap-3.5 px-[18px] py-4">
            {notes.length === 0 ? (
              <p className="text-ink-600 m-0 text-[13px]">No notes yet.</p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-surface-1 flex flex-col gap-1 rounded-[12px] px-3.5 py-3"
                >
                  <span className="text-ink-700 text-[12.5px] leading-[1.55] font-normal whitespace-pre-wrap text-pretty">
                    {note.body}
                  </span>
                  <span className="text-ink-500 text-[11px] font-normal">
                    {fmtRelative(note.created_at)}
                  </span>
                </div>
              ))
            )}

            <form onSubmit={saveNote} className="flex flex-col gap-3.5">
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add a note for the team…"
                maxLength={2000}
                disabled={noteBusy}
                aria-label="Add an internal note"
                className={cn(textareaClass, focusRing)}
              />
              <Btn
                type="submit"
                className="self-start h-[38px] px-5 text-[12.5px]"
                disabled={noteBusy || !noteDraft.trim()}
              >
                {noteBusy ? <Spinner /> : null}
                Add note
              </Btn>
            </form>
          </div>
        </Card>
      </div>
    </Screen>
  );
}
