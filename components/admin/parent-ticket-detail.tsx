"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  setParentTicketStatus,
  setParentTicketPublic,
  addParentTicketNote,
} from "@/lib/actions/parents-tickets";
import {
  PARENT_TICKET_STATUSES,
  PARENT_TICKET_STATUS_LABELS,
  maskDisplayName,
  type ParentTicketEnquiry,
  type ParentTicketNote,
  type ParentTicketStatus,
} from "@/lib/parents-tickets";
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
  CheckIcon,
  ChatIcon,
  EditIcon,
  FamilyIcon,
  GlobeIcon,
  HeartIcon,
  MailIcon,
  PhoneIcon,
  PlaneIcon,
  WhatsAppIcon,
} from "@/components/admin/icons";

const selectClass =
  "border-line-field text-ink-800 h-[34px] cursor-pointer rounded-full border bg-white pr-8 pl-3.5 text-[12.5px] font-medium outline-none disabled:opacity-50";

/** "£40" or "—" for a companion fee/offer amount. */
function amount(value: number | null): string {
  return value == null ? "—" : `£${value}`;
}

/**
 * A parent ticket, built to the design's "Enquiry detail" screen. Both sides of
 * the board share one record: `requester` needs a companion for a parent,
 * `traveller` is offering to help, and the side-specific card swaps to match.
 */
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
    toast.success(
      next ? "Now showing on the website" : "Hidden from the website"
    );
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

  return (
    <Screen>
      <BackLink href="/admin/parents-tickets">Parent tickets</BackLink>

      {/* -------------------------------------------------------- header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <PageTitle>{enquiry.reference_number}</PageTitle>
            <Pill>{PARENT_TICKET_STATUS_LABELS[status]}</Pill>
            {isTraveller ? (
              <span className="bg-cyan-bg text-cyan-ink inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap">
                Offering help
              </span>
            ) : (
              <span className="bg-warn-bg text-warn-ink inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap">
                Needs help
              </span>
            )}
            {isPublic ? <Pill tone="ok">On website</Pill> : null}
          </div>
          <p className="text-ink-600 m-0 mt-1.5 text-[13.5px] font-normal">
            Submitted {fmtDate(enquiry.created_at)} by {enquiry.full_name} ·{" "}
            {isTraveller ? "traveller side" : "requester side"}
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
              onChange={(e) =>
                changeStatus(e.target.value as ParentTicketStatus)
              }
              className={cn(selectClass, focusRing, statusBusy && "opacity-60")}
            >
              {PARENT_TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PARENT_TICKET_STATUS_LABELS[s]}
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
            {enquiry.full_name} · reach out however suits them
          </span>
        </div>
        <ContactButtons
          icons={{
            mail: <MailIcon size={24} />,
            whatsapp: <WhatsAppIcon size={24} />,
            phone: <PhoneIcon size={24} />,
          }}
          channels={[
            { key: "mail", label: "Email", sub: enquiry.email, href: mailHref },
            {
              key: "whatsapp",
              label: "WhatsApp",
              sub: enquiry.phone,
              href: waHref,
              external: true,
            },
            { key: "phone", label: "Call", sub: enquiry.phone, href: telHref },
          ]}
        />
      </Card>

      {/* --------------------------------------------------- column cards */}
      <div className="grid grid-cols-1 items-stretch gap-4 min-[760px]:grid-cols-2">
        <Card>
          <CardHead icon={<PlaneIcon size={15} />} title="Trip" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 px-[18px] py-4">
            <MiniField
              label="Route"
              value={`${enquiry.from_location} → ${enquiry.to_location}`}
            />
            <MiniField label="Travel date" value={fmtDate(enquiry.travel_date)} />
            <MiniField label="Airline" value={enquiry.airline} />
            <MiniField label="Languages" value={enquiry.languages} />
          </div>
        </Card>

        {isTraveller ? (
          <Card>
            <CardHead
              icon={<HeartIcon size={15} />}
              title="Traveller — help offered"
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 px-[18px] py-4">
              <MiniField
                label="Parents they can help"
                value={enquiry.parents_can_help}
              />
              <MiniField label="Fee" value={amount(enquiry.fee_amount)} />
              <MiniField
                label="Assistance offered"
                value={enquiry.assistance_offered}
              />
            </div>
          </Card>
        ) : (
          <Card>
            <CardHead
              icon={<FamilyIcon size={15} />}
              title="Requester — help needed"
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 px-[18px] py-4">
              <MiniField label="Parent's name" value={enquiry.parent_name} />
              <MiniField label="Parent's age" value={enquiry.parent_age} />
              <MiniField label="Relationship" value={enquiry.relationship} />
              <MiniField label="Offer" value={amount(enquiry.offer_amount)} />
              <MiniField
                label="Assistance needed"
                value={enquiry.assistance_needed}
              />
              <MiniField
                label="Mobility needs"
                value={enquiry.mobility_needs}
              />
            </div>
          </Card>
        )}

        <Card className="flex flex-col">
          <CardHead icon={<ChatIcon size={15} />} title="Their message" />
          <div className="flex flex-1 flex-col gap-2.5 px-[18px] py-4">
            <p className="border-line-soft bg-surface-1 text-ink-800 m-0 flex-1 rounded-[12px] border px-4 py-3.5 text-[13px] leading-[1.6] font-normal whitespace-pre-wrap text-pretty">
              {enquiry.notes || "No additional message."}
            </p>
            <span className="text-ink-500 text-[11px] font-normal">
              {enquiry.full_name} · {fmtDate(enquiry.created_at)}
            </span>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHead
            icon={<GlobeIcon size={15} />}
            title="Website visibility"
            action={
              <span className="text-ink-quiet text-[11px] font-normal whitespace-nowrap">
                {canPublish ? "Consent given" : "No consent"}
              </span>
            }
          />
          <div className="flex flex-1 flex-wrap items-center gap-4 px-[18px] py-4">
            <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
              <span className="text-[13px] font-medium">Show on website</span>
              <span className="text-ink-500 text-[12.5px] leading-[1.5] font-normal text-pretty">
                {canPublish ? (
                  <>
                    The public board shows only{" "}
                    <span className="text-ink-800 font-medium">
                      {maskDisplayName(enquiry.full_name)}
                    </span>
                    , the route, date, airline, languages and what help is
                    offered or needed — never contact details.
                  </>
                ) : (
                  "Unavailable — this person didn't agree to public display when they submitted the form."
                )}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              aria-label="Show this entry on the website"
              disabled={!canPublish || publicBusy}
              onClick={() => togglePublic(!isPublic)}
              className={cn(
                "flex h-[27px] w-[46px] flex-none rounded-full border-0 p-1 outline-none transition-colors duration-150 disabled:opacity-50",
                isPublic
                  ? "bg-marine-500 justify-end"
                  : "bg-line-field justify-start"
              )}
            >
              <span className="block size-[21px] rounded-full bg-white shadow-[0_4px_12px_oklch(0.205_0.038_258_/_0.07)]" />
            </button>
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
                className="h-[38px] self-start px-5 text-[12.5px]"
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
