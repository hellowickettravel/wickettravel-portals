"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ASSISTANCE_KINDS,
  ASSISTANCE_LABELS,
  LANGUAGES,
  type AssistanceKind,
  type ListingKind,
  type ParentTicketListing,
} from "@/lib/parents-marketplace";
import {
  createListing,
  updateListing,
  type ListingInput,
} from "@/lib/actions/parents-listings";
import {
  BackLink,
  Btn,
  Card,
  CardHead,
  Field,
  FieldLabel,
  PageHead,
  Screen,
  Spinner,
  focusRing,
  inputClass,
  textareaClass,
} from "@/components/admin/ui";
import {
  CalendarIcon,
  ClockIcon,
  FamilyIcon,
  FlightIcon,
  GlobeIcon,
  HeartIcon,
  PinIcon,
  PoundIcon,
  UserIcon,
} from "@/components/admin/icons";

/**
 * The full traveller listing / parent request form (full scope item 2).
 *
 * One form, two kinds, because the two sides share most of their fields —
 * the same route, date, languages and fee — and only the middle section
 * differs. That is also what makes matching a self-join rather than a
 * reconciliation between two shapes.
 *
 * It is a single sectioned page rather than the product's three-step wizard:
 * a listing is a dozen fields someone will come back and revise, and a wizard
 * would put a rail between them and the field they want to change.
 */

const CHIP =
  "inline-flex h-[34px] items-center rounded-full border px-3.5 text-[12.5px] font-medium whitespace-nowrap outline-none transition-colors";
const CHIP_ON = "border-marine-edge bg-marine-tint text-marine-600";
const CHIP_OFF = "border-line-field text-ink-700 hover:bg-surface-1 bg-white";

function toInput(listing: ParentTicketListing | null, kind: ListingKind): ListingInput {
  return {
    listingKind: listing?.listing_kind ?? kind,
    fromAirport: listing?.from_airport ?? "",
    toAirport: listing?.to_airport ?? "",
    travelDate: listing?.travel_date ?? "",
    departureTime: listing?.departure_time?.slice(0, 5) ?? "",
    airline: listing?.airline ?? "",
    flightNumber: listing?.flight_number ?? "",
    flightConfirmed: listing?.flight_confirmed ?? false,
    languages: listing?.languages ?? [],
    feeAmount: listing?.fee_amount ?? null,
    notes: listing?.notes ?? "",
    capacity: listing?.capacity ?? null,
    assistanceOffered: (listing?.assistance_offered ?? []) as AssistanceKind[],
    travelExperience: listing?.travel_experience ?? "",
    parentName: listing?.parent_name ?? "",
    parentAge: listing?.parent_age ?? null,
    relationship: listing?.relationship ?? "",
    assistanceNeeded: (listing?.assistance_needed ?? []) as AssistanceKind[],
    mobilityNotes: listing?.mobility_notes ?? "",
    supervisionNotes: listing?.supervision_notes ?? "",
    consentPublic: listing?.consent_public ?? false,
  };
}

export function ListingForm({
  listing,
  initialKind = "traveller",
}: {
  /** null when creating. */
  listing: ParentTicketListing | null;
  initialKind?: ListingKind;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ListingInput>(() => toInput(listing, initialKind));
  const [saving, setSaving] = useState(false);

  const isTraveller = form.listingKind === "traveller";
  const editing = !!listing;

  function set<K extends keyof ListingInput>(key: K, value: ListingInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleIn(key: "languages" | "assistanceOffered" | "assistanceNeeded", value: string) {
    setForm((f) => {
      const list = f[key] as string[];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      return { ...f, [key]: next };
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    // Kept as two branches rather than one ternary so each result type narrows
    // on its own — only the create path returns the new record's reference.
    if (listing) {
      const res = await updateListing(listing.id, form);
      setSaving(false);
      if (!res.ok) {
        toast.error("Couldn't save", { description: res.error });
        return;
      }
      toast.success("Listing saved");
      router.push(`/customer/parents/${listing.id}`);
      return;
    }

    const res = await createListing(form);
    setSaving(false);
    if (!res.ok) {
      toast.error("Couldn't save", { description: res.error });
      return;
    }
    toast.success(`Draft saved — ${res.data.reference}`);
    router.push(`/customer/parents/${res.data.id}`);
  }

  const assistanceKey = isTraveller ? "assistanceOffered" : "assistanceNeeded";
  const assistanceValue = isTraveller ? form.assistanceOffered : form.assistanceNeeded;

  return (
    <Screen>
      <BackLink href={editing ? `/customer/parents/${listing.id}` : "/customer/parents"}>
        {editing ? listing.reference_number : "My listings"}
      </BackLink>

      <PageHead
        title={editing ? "Edit your listing" : "Create a listing"}
        intro={
          isTraveller
            ? "Tell us about your flight and the help you can give. Nothing goes on the board until our team has checked it."
            : "Tell us about the flight and the help your parent needs. Nothing goes on the board until our team has checked it."
        }
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* ------------------------------------------------------ which side */}
        <Card>
          <CardHead
            icon={<HeartIcon size={15} />}
            title="Which side are you on?"
            hint={editing ? "You can change this while it's still a draft." : undefined}
          />
          <div className="grid grid-cols-1 gap-3 px-5 py-5 min-[620px]:grid-cols-2">
            <KindCard
              selected={isTraveller}
              onSelect={() => set("listingKind", "traveller")}
              icon={<FlightIcon size={18} />}
              title="I can help a parent"
              body="You're already flying this route and can keep an eye on someone travelling alone."
            />
            <KindCard
              selected={!isTraveller}
              onSelect={() => set("listingKind", "requester")}
              icon={<FamilyIcon size={18} />}
              title="I need help for my parent"
              body="You're arranging travel for a parent and want a companion on the flight."
            />
          </div>
        </Card>

        {/* ---------------------------------------------------------- flight */}
        <Card>
          <CardHead
            icon={<FlightIcon size={15} />}
            title="The flight"
            hint="Route and date are what matching works on, so get these right."
          />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 px-5 py-5">
            <Field>
              <FieldLabel htmlFor="lf-from" icon={<FlightIcon size={13} />}>
                Departing from
              </FieldLabel>
              <input
                id="lf-from"
                value={form.fromAirport}
                onChange={(e) => set("fromAirport", e.target.value)}
                placeholder="London Heathrow (LHR)"
                maxLength={120}
                required
                className={cn(inputClass, focusRing)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lf-to" icon={<PinIcon size={13} />}>
                Arriving at
              </FieldLabel>
              <input
                id="lf-to"
                value={form.toAirport}
                onChange={(e) => set("toAirport", e.target.value)}
                placeholder="Delhi (DEL)"
                maxLength={120}
                required
                className={cn(inputClass, focusRing)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lf-date" icon={<CalendarIcon size={13} />}>
                Travel date
              </FieldLabel>
              <input
                id="lf-date"
                type="date"
                value={form.travelDate ?? ""}
                onChange={(e) => set("travelDate", e.target.value)}
                className={cn(inputClass, focusRing)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lf-time" icon={<ClockIcon size={13} />} optional>
                Departure time
              </FieldLabel>
              <input
                id="lf-time"
                type="time"
                value={form.departureTime ?? ""}
                onChange={(e) => set("departureTime", e.target.value)}
                className={cn(inputClass, focusRing)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lf-airline" optional>
                Airline
              </FieldLabel>
              <input
                id="lf-airline"
                value={form.airline ?? ""}
                onChange={(e) => set("airline", e.target.value)}
                placeholder="Air India"
                maxLength={120}
                className={cn(inputClass, focusRing)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lf-flight" optional>
                Flight number
              </FieldLabel>
              <input
                id="lf-flight"
                value={form.flightNumber ?? ""}
                onChange={(e) => set("flightNumber", e.target.value.toUpperCase())}
                placeholder="AI162"
                maxLength={20}
                className={cn(inputClass, focusRing)}
              />
            </Field>

            <label
              style={{ gridColumn: "1 / -1" }}
              className="border-line-hair bg-surface-4 flex cursor-pointer items-start gap-3 rounded-[11px] border p-3.5"
            >
              <input
                type="checkbox"
                checked={form.flightConfirmed}
                onChange={(e) => set("flightConfirmed", e.target.checked)}
                className="accent-marine-500 mt-0.5 size-[17px] flex-none cursor-pointer"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-ink-850 text-[13px] font-medium">
                  This flight is booked and confirmed
                </span>
                <span className="text-ink-500 text-[12px] leading-[1.5] font-normal text-pretty">
                  Leave this off if the dates are still intended rather than
                  ticketed. Confirmed flights are matched first, because a
                  companion on a different plane is no companion at all.
                </span>
              </span>
            </label>
          </div>
        </Card>

        {/* -------------------------------------------------------- the help */}
        <Card>
          <CardHead
            icon={<HeartIcon size={15} />}
            title={isTraveller ? "The help you can give" : "The help your parent needs"}
            hint="Pick everything that applies — matching scores these against each other."
          />
          <div className="flex flex-col gap-5 px-5 py-5">
            <div className="flex flex-wrap gap-2">
              {ASSISTANCE_KINDS.map((k) => {
                const on = assistanceValue.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleIn(assistanceKey, k)}
                    className={cn(CHIP, on ? CHIP_ON : CHIP_OFF, focusRing)}
                  >
                    {ASSISTANCE_LABELS[k]}
                  </button>
                );
              })}
            </div>

            {isTraveller ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <Field>
                  <FieldLabel htmlFor="lf-capacity" icon={<UserIcon size={13} />}>
                    How many parents could you help?
                  </FieldLabel>
                  <input
                    id="lf-capacity"
                    type="number"
                    min={0}
                    max={20}
                    value={form.capacity ?? ""}
                    onChange={(e) =>
                      set("capacity", e.target.value === "" ? null : Number(e.target.value))
                    }
                    placeholder="1"
                    className={cn(inputClass, focusRing)}
                  />
                </Field>
                <Field span="1 / -1">
                  <FieldLabel htmlFor="lf-experience" optional>
                    How often do you fly this route?
                  </FieldLabel>
                  <textarea
                    id="lf-experience"
                    rows={2}
                    value={form.travelExperience ?? ""}
                    onChange={(e) => set("travelExperience", e.target.value)}
                    placeholder="I fly Heathrow to Delhi three or four times a year to see family."
                    maxLength={2000}
                    className={cn(textareaClass, focusRing)}
                  />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                <Field>
                  <FieldLabel htmlFor="lf-parent-name" icon={<UserIcon size={13} />}>
                    Your parent&apos;s name
                  </FieldLabel>
                  <input
                    id="lf-parent-name"
                    value={form.parentName ?? ""}
                    onChange={(e) => set("parentName", e.target.value)}
                    maxLength={120}
                    className={cn(inputClass, focusRing)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lf-parent-age" optional>
                    Their age
                  </FieldLabel>
                  <input
                    id="lf-parent-age"
                    type="number"
                    min={0}
                    max={120}
                    value={form.parentAge ?? ""}
                    onChange={(e) =>
                      set("parentAge", e.target.value === "" ? null : Number(e.target.value))
                    }
                    className={cn(inputClass, focusRing)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lf-relationship" optional>
                    Your relationship to them
                  </FieldLabel>
                  <input
                    id="lf-relationship"
                    value={form.relationship ?? ""}
                    onChange={(e) => set("relationship", e.target.value)}
                    placeholder="Daughter"
                    maxLength={80}
                    className={cn(inputClass, focusRing)}
                  />
                </Field>
                <Field span="1 / -1">
                  <FieldLabel htmlFor="lf-mobility" optional>
                    Getting around
                  </FieldLabel>
                  <textarea
                    id="lf-mobility"
                    rows={2}
                    value={form.mobilityNotes ?? ""}
                    onChange={(e) => set("mobilityNotes", e.target.value)}
                    placeholder="She walks slowly and would need a wheelchair for the long terminal walks."
                    maxLength={2000}
                    className={cn(textareaClass, focusRing)}
                  />
                </Field>
                <Field span="1 / -1">
                  <FieldLabel htmlFor="lf-supervision" optional>
                    Anything a companion should keep an eye on
                  </FieldLabel>
                  <textarea
                    id="lf-supervision"
                    rows={2}
                    value={form.supervisionNotes ?? ""}
                    onChange={(e) => set("supervisionNotes", e.target.value)}
                    placeholder="She gets anxious in crowds and may need reminding at the gate."
                    maxLength={2000}
                    className={cn(textareaClass, focusRing)}
                  />
                  <span className="text-ink-500 text-[11.5px] leading-[1.5] font-normal text-pretty">
                    Practical notes only, please — don&apos;t share medical or
                    health information here. We don&apos;t collect it and
                    companions aren&apos;t carers.
                  </span>
                </Field>
              </div>
            )}
          </div>
        </Card>

        {/* ----------------------------------------------------- the details */}
        <Card>
          <CardHead icon={<GlobeIcon size={15} />} title="Languages and fee" />
          <div className="flex flex-col gap-5 px-5 py-5">
            <div className="flex flex-col gap-2.5">
              <FieldLabel icon={<GlobeIcon size={13} />}>
                {isTraveller ? "Languages you speak" : "Languages your parent speaks"}
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => {
                  const on = form.languages.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleIn("languages", l)}
                      className={cn(CHIP, on ? CHIP_ON : CHIP_OFF, focusRing)}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <Field>
                <FieldLabel htmlFor="lf-fee" icon={<PoundIcon size={13} />} optional>
                  {isTraveller ? "Fee you'd like (£)" : "What you'd pay (£)"}
                </FieldLabel>
                <input
                  id="lf-fee"
                  type="number"
                  min={0}
                  max={5000}
                  step="0.01"
                  value={form.feeAmount ?? ""}
                  onChange={(e) =>
                    set("feeAmount", e.target.value === "" ? null : Number(e.target.value))
                  }
                  placeholder="40"
                  className={cn(inputClass, focusRing)}
                />
                <span className="text-ink-500 text-[11.5px] font-normal">
                  Leave blank if you&apos;d rather agree it later.
                </span>
              </Field>
              <Field span="1 / -1">
                <FieldLabel htmlFor="lf-notes" optional>
                  Anything else
                </FieldLabel>
                <textarea
                  id="lf-notes"
                  rows={3}
                  value={form.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                  maxLength={2000}
                  className={cn(textareaClass, focusRing)}
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* ----------------------------------------------------- the board */}
        <Card>
          <CardHead
            icon={<GlobeIcon size={15} />}
            title="Showing this publicly"
            hint="Separate from matching — you'll be matched either way."
          />
          <label className="flex cursor-pointer items-start gap-3 px-5 py-5">
            <input
              type="checkbox"
              checked={form.consentPublic}
              onChange={(e) => set("consentPublic", e.target.checked)}
              className="accent-marine-500 mt-0.5 size-[17px] flex-none cursor-pointer"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-ink-850 text-[13px] font-medium">
                You may show this on the public board
              </span>
              <span className="text-ink-500 text-[12px] leading-[1.5] font-normal text-pretty">
                Only your first name and last initial, the route, date, airline,
                languages and the help involved. Never your contact details, and
                never your parent&apos;s name. Our team still has to approve it,
                and you can turn this off at any time.
              </span>
            </span>
          </label>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Btn type="submit" variant="ember" disabled={saving}>
            {saving ? <Spinner /> : null}
            {editing ? "Save changes" : "Save as draft"}
          </Btn>
          <Btn
            as="link"
            href={editing ? `/customer/parents/${listing.id}` : "/customer/parents"}
          >
            Cancel
          </Btn>
          <span className="text-ink-500 text-[12px] font-normal">
            Saving keeps it private — you send it for review from the listing itself.
          </span>
        </div>
      </form>
    </Screen>
  );
}

/** One of the two side choices, as the design's selectable card. */
function KindCard({
  selected,
  onSelect,
  icon,
  title,
  body,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-[12px] border p-4 text-left leading-[normal] outline-none transition-colors",
        selected
          ? "border-marine-edge bg-marine-soft"
          : "border-line-field hover:border-line-strong bg-white",
        focusRing
      )}
    >
      <span
        className={cn(
          "flex size-9 flex-none items-center justify-center rounded-full",
          selected ? "bg-marine-500 text-white" : "bg-surface-2 text-ink-600"
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-ink-850 text-[13.5px] font-medium">{title}</span>
        <span className="text-ink-600 text-[12px] leading-[1.5] font-normal text-pretty">
          {body}
        </span>
      </span>
    </button>
  );
}
