"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOrder } from "@/lib/actions/admin";
import { recordOrderAttachments } from "@/lib/actions/orders";
import {
  AIRLINES,
  ANY_AIRLINE,
  CABIN_CLASSES,
  type OrderFormInput,
} from "@/lib/orders/form";
import { BOOK_PATH, type BookPrefill } from "@/lib/orders/book-link";
import {
  ATTACHMENT_ACCEPT,
  uploadOrderAttachment,
  validateAttachment,
} from "@/lib/storage";
import type { CabinClass } from "@/lib/db/types";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  BackLink,
  Btn,
  Card,
  CardHead,
  Eyebrow,
  Pill,
  focusRing,
  inputClass,
  shadowE1,
} from "@/components/admin/ui";
import {
  CheckCircleIcon,
  CheckIcon,
  ChildIcon,
  CloseIcon,
  DocumentIcon,
  EditIcon,
  Ico,
  ImageIcon,
  LifebuoyIcon,
  RouteIcon,
  type IconName,
} from "@/components/admin/icons";

/**
 * The design's three-step "Create an order" wizard. Every portal books through
 * it, so a trip is captured the same way whoever is typing.
 *
 * `audience` is the one switch that matters. Staff choose a customer and are
 * told the files go on the order thread; a traveller is the customer, gets a
 * contact block and a real uploader for the flights they already found, and —
 * signed out — fills the whole thing before being asked to make an account.
 */

type Step = 1 | 2 | 3;

type Draft = {
  customerId: string;
  from: string;
  to: string;
  depart: string;
  ret: string;
  trip: "Round trip" | "One way";
  cabin: string;
  airline: string;
  adults: string;
  adultAges: string;
  children: string;
  childAges: string[];
  checked: "" | "yes" | "no";
  flightInfo: string;
  flightNotes: string;
  pax: { given: string; surname: string }[];
  wheelchair: string;
  luggage: string;
  meal: string;
  assist: string;
  extra: string;
  /** Customer audience only — a number the team can reach them on. */
  phone: string;
  /**
   * Staff audience only — the travel details of everyone on the booking.
   * Row 0 is the account holder: its name is NOT typed, it comes from the
   * customer picker, so only its email / DOB / IBE cells are ever edited.
   * Rows after it are companions and carry all four.
   */
  people: PersonRow[];
};

/** One row of the "Passenger travel details" grid. */
type PersonRow = { name: string; email: string; dob: string; ibe: string };

const emptyPerson = (): PersonRow => ({
  name: "",
  email: "",
  dob: "",
  ibe: "",
});

/** Matches LIMITS.MAX_PASSENGERS and the 0024 check constraint. */
const MAX_PEOPLE = 20;

/**
 * Deliberately loose. This is a staff-entry field, not a signup: the job is
 * to catch a typo like a missing "@", not to adjudicate RFC 5322. Anything
 * stricter rejects addresses that genuinely exist.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHILD_AGES = [
  "Select age",
  "Under 2",
  ...Array.from({ length: 16 }, (_, i) => String(i + 2)),
];

const WHEELCHAIR = [
  "Not required",
  "Required at airport",
  "Required to the aircraft door",
  "Required onboard",
];
const LUGGAGE = [
  "No extra bags",
  "1 extra bag",
  "2 extra bags",
  "3+ extra bags",
  "Sports equipment",
];
const MEALS = [
  "Standard",
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten free",
  "Child meal",
];
const ASSIST = [
  "None required",
  "Visual impairment",
  "Hearing impairment",
  "Medical equipment onboard",
  "Unaccompanied minor",
  "Other — see notes",
];

/** Extra bags → the kg figure the record stores. */
const LUGGAGE_KG: Record<string, number | null> = {
  "No extra bags": null,
  "1 extra bag": 23,
  "2 extra bags": 46,
  "3+ extra bags": 69,
  "Sports equipment": 23,
};

function blank(): Draft {
  return {
    customerId: "",
    from: "",
    to: "",
    depart: "",
    ret: "",
    trip: "Round trip",
    cabin: "Economy",
    airline: ANY_AIRLINE,
    adults: "2",
    adultAges: "",
    children: "0",
    childAges: [],
    checked: "",
    flightInfo: "",
    flightNotes: "",
    pax: [],
    wheelchair: WHEELCHAIR[0],
    luggage: LUGGAGE[0],
    meal: MEALS[0],
    assist: ASSIST[0],
    extra: "",
    phone: "",
    people: [emptyPerson()],
  };
}

/** The draft a signed-out visitor leaves behind while they make an account. */
const DRAFT_KEY = "wicket-booking-draft-v2";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; draft?: Draft };
    if (!parsed?.draft || !parsed.at) return null;
    if (Date.now() - parsed.at > DRAFT_TTL_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return { ...blank(), ...parsed.draft };
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft) {
  try {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ at: Date.now(), draft })
    );
  } catch {
    /* private mode / quota — the wizard still works, it just won't resume. */
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Seed Step 1 from the homepage search widget's (already validated) params. */
function seed(prefill: BookPrefill | undefined, phone: string | null): Draft {
  const d = blank();
  d.phone = phone ?? "";
  if (!prefill) return d;
  if (prefill.from) d.from = prefill.from;
  if (prefill.to) d.to = prefill.to;
  if (prefill.depart) d.depart = prefill.depart;
  if (prefill.return) d.ret = prefill.return;
  if (prefill.tripType) d.trip = prefill.return ? "Round trip" : "One way";
  if (prefill.cabin) {
    d.cabin =
      CABIN_CLASSES.find((c) => c.value === prefill.cabin)?.label ?? d.cabin;
  }
  if (prefill.airline) d.airline = prefill.airline;
  if (prefill.adults) d.adults = String(prefill.adults);
  if (prefill.children != null) d.children = String(prefill.children);
  // Deliberately a note, not the "Extra luggage" select: the homepage asks
  // whether the FARE includes a checked bag, while that field counts bags on
  // top of an allowance. Putting it here states what was actually requested
  // and leaves the select for the customer to answer themselves.
  if (prefill.baggage) d.extra = "Checked baggage must be included in the fare.";
  return d;
}

export type AdminOrderCustomer = {
  id: string;
  label: string;
  /** Pre-fills the account holder's row when they are picked. */
  email?: string | null;
  /** ISO "YYYY-MM-DD" from customers.date_of_birth (0022), when recorded. */
  dob?: string | null;
};

/* ------------------------------------------------------------------ fields */

type FieldKind = "text" | "date" | "select" | "area" | "pills";

type FieldDef = {
  key: string;
  label: string;
  icon: IconName;
  kind?: FieldKind;
  options?: string[];
  pills?: string[];
  ph?: string;
  hint?: string;
  rows?: number;
  optional?: boolean;
  disabled?: boolean;
  span?: string;
  value: string;
  onValue: (v: string) => void;
};

type SectionDef = {
  title: string;
  hint?: string;
  cols: 1 | 2 | 3;
  fields: FieldDef[];
  showChildAges?: boolean;
  showUpload?: boolean;
};

const COLS: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 min-[600px]:grid-cols-2",
  3: "grid-cols-1 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3",
};

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="alert"
      className="text-danger-ink flex items-start gap-1.5 text-[11.5px] leading-[1.4] font-medium"
    >
      <span
        aria-hidden
        className="bg-danger-ink mt-px block size-[13px] flex-none rounded-full text-center text-[9.5px] leading-[13px] font-bold text-white"
      >
        !
      </span>
      {children}
    </span>
  );
}

function FieldRow({ f, err }: { f: FieldDef; err?: string }) {
  const id = `co-${f.key}`;
  const control = cn(
    "w-full rounded-[10px] border text-[13.5px] font-normal outline-none transition-[border-color,box-shadow] duration-[130ms]",
    err ? "border-danger-edge" : "border-line-field",
    f.disabled ? "bg-surface-2 text-ink-450" : "bg-white text-ink-800"
  );

  return (
    <div style={f.span ? { gridColumn: f.span } : undefined} className="flex min-w-0 flex-col gap-[7px]">
      <label
        htmlFor={id}
        className="text-ink-700 flex flex-wrap items-center gap-x-[7px] gap-y-1 text-[11.5px] leading-[1.35] font-medium"
      >
        <span className="text-marine-icon flex flex-none">
          <Ico name={f.icon} size={15} />
        </span>
        <span>{f.label}</span>
        {f.optional ? (
          <span className="text-ink-450 font-normal">Optional</span>
        ) : null}
      </label>

      {f.kind === "pills" ? (
        <div role="radiogroup" aria-label={f.label} className="flex flex-wrap gap-2">
          {(f.pills ?? []).map((p) => {
            const on = f.value === p;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => f.onValue(p)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full border px-[18px] text-[13px] font-medium whitespace-nowrap outline-none",
                  on
                    ? "border-marine-edge bg-marine-tint text-marine-600"
                    : "border-line-field text-ink-700 bg-white"
                )}
              >
                <span
                  className={cn(
                    "block size-[7px] flex-none rounded-full",
                    on ? "bg-marine-500" : "bg-ink-300"
                  )}
                />
                {p}
              </button>
            );
          })}
        </div>
      ) : f.kind === "select" ? (
        <select
          id={id}
          value={f.value}
          disabled={f.disabled}
          aria-invalid={!!err}
          onChange={(e) => f.onValue(e.target.value)}
          className={cn(control, focusRing, "h-10 cursor-pointer px-3.5")}
        >
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : f.kind === "area" ? (
        <textarea
          id={id}
          rows={f.rows ?? 3}
          value={f.value}
          aria-invalid={!!err}
          placeholder={f.ph}
          onChange={(e) => f.onValue(e.target.value)}
          className={cn(control, focusRing, "resize-y px-3.5 py-[11px] leading-[1.55]")}
        />
      ) : (
        <input
          id={id}
          type={f.kind === "date" ? "date" : "text"}
          value={f.value}
          disabled={f.disabled}
          aria-invalid={!!err}
          placeholder={f.ph}
          onChange={(e) => f.onValue(e.target.value)}
          className={cn(control, focusRing, "h-10 px-3.5")}
        />
      )}

      {f.hint ? (
        <span className="text-ink-500 text-[11.5px] font-normal text-pretty">
          {f.hint}
        </span>
      ) : null}
      {err ? <ErrorNote>{err}</ErrorNote> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- wizard */

export function AdminOrderForm({
  customers = [],
  /* The employee portal renders this same wizard. Its create path is a
     different server action (createOrderFromChat, which needs the customer's
     conversation), and its links live under /employee — so both are props,
     defaulting to the admin behaviour. */
  basePath = "/admin",
  onCreate,
  audience = "staff",
  prefill,
  contactEmail,
  contactPhone,
  isGuest = false,
}: {
  customers?: AdminOrderCustomer[];
  basePath?: string;
  onCreate?: (
    input: Parameters<typeof createOrder>[0]
  ) => Promise<
    | { ok: true; data: { orderId: string; orderNumber?: string } }
    | { ok: false; error: string }
  >;
  /** Who is filling this in. Staff book for someone; a customer books for
      themselves, which changes the fields, the copy and the submit path. */
  audience?: "staff" | "customer";
  /** Homepage search widget query params, already validated server-side. */
  prefill?: BookPrefill;
  /** The signed-in customer's account email — shown read-only. */
  contactEmail?: string | null;
  /** Their phone on file, pre-filling the contact field. */
  contactPhone?: string | null;
  /** Signed-out visitor: fully fillable, but placing the order needs an account. */
  isGuest?: boolean;
}) {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const forCustomer = audience === "customer";

  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(() =>
    forCustomer ? seed(prefill, contactPhone ?? null) : blank()
  );
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; ref: string } | null>(null);

  // A guest fills the whole wizard, then makes an account. Keep the draft alive
  // across that round trip so they land back on the review step, not an empty
  // form — the single most common way a booking is lost.
  useEffect(() => {
    if (!forCustomer) return;
    const resume = new URLSearchParams(window.location.search).get("resume");
    if (!resume) return;
    const saved = readDraft();
    if (!saved) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft({ ...saved, phone: saved.phone || (contactPhone ?? "") });
    setStep(3);
    setMaxStep(3);
  }, [forCustomer, contactPhone]);

  const set = <K extends keyof Draft>(key: K) => (v: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));
  const setStr = (key: keyof Draft) => (v: string) => {
    setDraft((d) => ({ ...d, [key]: v }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: "" } : e));
  };

  const adults = Math.max(1, Number(draft.adults) || 1);
  const children = Math.max(0, Number(draft.children) || 0);
  const totalPax = adults + children;
  const oneWay = draft.trip === "One way";

  const chosenCustomer = customers.find((c) => c.id === draft.customerId);
  const customerLabel = chosenCustomer?.label ?? "";

  /* --------------------------------- passenger travel details (staff only) */

  /** Never render an empty grid — a resumed draft could carry no rows. */
  const people: PersonRow[] = draft.people?.length
    ? draft.people
    : [emptyPerson()];

  function setPerson(i: number, field: keyof PersonRow, v: string) {
    setDraft((d) => {
      const next = d.people?.length ? [...d.people] : [emptyPerson()];
      next[i] = { ...(next[i] ?? emptyPerson()), [field]: v };
      return { ...d, people: next };
    });
    setErrors((e) =>
      e[`person${i}${field}`] ? { ...e, [`person${i}${field}`]: "" } : e
    );
  }

  function addPerson() {
    setDraft((d) => ({
      ...d,
      people: [...(d.people?.length ? d.people : [emptyPerson()]), emptyPerson()],
    }));
  }

  function removePerson(i: number) {
    // Row 0 is the account holder and has no remove control, so this only
    // ever drops a companion. Errors are re-keyed by index, so clear them
    // all rather than leave a message pointing at the wrong row.
    setDraft((d) => ({
      ...d,
      people: (d.people ?? []).filter((_, n) => n !== i),
    }));
    setErrors((e) =>
      Object.fromEntries(
        Object.entries(e).filter(([k]) => !k.startsWith("person"))
      )
    );
  }

  /**
   * Picking a customer fills their row from the record we hold.
   *
   * Done here, in the change handler, rather than in an effect on
   * `draft.customerId`: an effect would also fire on a resumed draft and on
   * unrelated re-renders, quietly overwriting something staff had typed. A
   * pre-fill should only ever be the consequence of choosing someone.
   */
  function chooseCustomer(id: string) {
    const picked = customers.find((c) => c.id === id);
    setStr("customerId")(id);
    setDraft((d) => {
      const next = d.people?.length ? [...d.people] : [emptyPerson()];
      next[0] = {
        ...(next[0] ?? emptyPerson()),
        email: picked?.email ?? "",
        dob: picked?.dob ?? "",
      };
      return { ...d, people: next };
    });
    setErrors((e) => ({ ...e, person0email: "", person0dob: "" }));
  }

  /** One slot per traveller, re-shaped whenever the counts change. */
  const passengers = useMemo(() => {
    const list: { type: "Adult" | "Child"; given: string; surname: string }[] = [];
    for (let i = 0; i < totalPax; i++) {
      const saved = draft.pax[i];
      list.push({
        type: i < adults ? "Adult" : "Child",
        given: saved?.given ?? "",
        surname: saved?.surname ?? "",
      });
    }
    return list;
  }, [totalPax, adults, draft.pax]);

  const namedCount = passengers.filter(
    (p) => p.given.trim() && p.surname.trim()
  ).length;

  function setPax(i: number, field: "given" | "surname", v: string) {
    setDraft((d) => {
      const next = [...d.pax];
      while (next.length < totalPax) next.push({ given: "", surname: "" });
      next[i] = { ...next[i], [field]: v };
      return { ...d, pax: next };
    });
    setErrors((e) => ({ ...e, [`pax${i}${field}`]: "" }));
  }

  const routeLine =
    draft.from.trim() && draft.to.trim()
      ? `${draft.from.trim()} → ${draft.to.trim()}`
      : "Route to confirm";
  const travellerLine = [
    `${adults} adult${adults === 1 ? "" : "s"}`,
    children > 0 ? `${children} child${children === 1 ? "" : "ren"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  /* ------------------------------------------------------------ sections */

  const sections: SectionDef[] = useMemo(() => {
    if (step === 1) {
      return [
        // The staff "Passenger travel details" grid is not a generic section —
        // it is a repeating four-column row with its own add/remove — so it is
        // rendered as its own card above these. See the JSX below.
        {
          title: "Where & when",
          hint: "Just like a flight search — we'll take the details from here.",
          cols: 2,
          fields: [
            {
              key: "from",
              label: "From",
              icon: "pin",
              ph: "City or airport — e.g. London Heathrow",
              value: draft.from,
              onValue: setStr("from"),
            },
            {
              key: "to",
              label: "To",
              icon: "pin",
              ph: "City or airport — e.g. Dubai",
              value: draft.to,
              onValue: setStr("to"),
            },
            {
              key: "depart",
              label: "Departure date",
              icon: "calendar",
              kind: "date",
              value: draft.depart,
              onValue: setStr("depart"),
            },
            {
              key: "ret",
              label: "Return date",
              icon: "calendar",
              kind: "date",
              disabled: oneWay,
              hint: oneWay ? "Not needed for a one-way trip." : undefined,
              value: draft.ret,
              onValue: setStr("ret"),
            },
          ],
        },
        {
          title: "Flight preferences",
          cols: 3,
          fields: [
            {
              key: "trip",
              label: "Trip type",
              icon: "triptype",
              kind: "pills",
              pills: ["Round trip", "One way"],
              value: draft.trip,
              onValue: (v) =>
                setDraft((d) => ({
                  ...d,
                  trip: v as Draft["trip"],
                  ret: v === "One way" ? "" : d.ret,
                })),
            },
            {
              key: "cabin",
              label: "Cabin class",
              icon: "seat",
              kind: "select",
              options: CABIN_CLASSES.map((c) => c.label),
              value: draft.cabin,
              onValue: setStr("cabin"),
            },
            {
              key: "airline",
              label: "Airline name",
              icon: "plane",
              kind: "select",
              options: [...AIRLINES],
              value: draft.airline,
              onValue: setStr("airline"),
            },
          ],
        },
        {
          title: "Travellers",
          hint: "Ages help the ticketing team price the fare correctly.",
          cols: 2,
          showChildAges: children > 0,
          fields: [
            {
              key: "adults",
              label: "Adults",
              icon: "parents",
              kind: "select",
              options: Array.from({ length: 9 }, (_, i) => String(i + 1)),
              value: draft.adults,
              onValue: setStr("adults"),
            },
            {
              key: "adultAges",
              label: "Adult ages",
              icon: "user",
              optional: true,
              ph: "e.g. 34, 31",
              value: draft.adultAges,
              onValue: setStr("adultAges"),
            },
            {
              key: "children",
              label: "Children",
              icon: "child",
              kind: "select",
              options: Array.from({ length: 7 }, (_, i) => String(i)),
              value: draft.children,
              onValue: setStr("children"),
            },
          ],
        },
      ];
    }

    if (step === 2) {
      if (draft.checked !== "yes") return [];
      return [
        {
          title: "What you found",
          hint: "Anything you have — we'll match or beat it.",
          cols: 1,
          showUpload: true,
          fields: [
            {
              key: "flightInfo",
              label: "Flight details",
              icon: "flight",
              kind: "area",
              rows: 4,
              ph: "Airline, flight numbers, dates, times and the fare you saw — e.g. Emirates EK004, 12 Sep, £612 return per person on Skyscanner.",
              value: draft.flightInfo,
              onValue: setStr("flightInfo"),
            },
            {
              key: "flightNotes",
              label: "Notes for the ticketing team",
              icon: "chat",
              kind: "area",
              rows: 3,
              optional: true,
              ph: "Anything else worth knowing — flexible dates, alternate airports, a fare that expires soon…",
              value: draft.flightNotes,
              onValue: setStr("flightNotes"),
            },
          ],
        },
      ];
    }

    return [
      ...(forCustomer
        ? [
            {
              title: "How we reach you",
              hint: "Where the team sends your quote and your tickets.",
              cols: 2 as const,
              fields: [
                {
                  key: "email",
                  label: "Email",
                  icon: "mail" as IconName,
                  disabled: true,
                  hint: contactEmail
                    ? "Your account email. Change it in Profile."
                    : "You'll confirm this when you make your account.",
                  value: contactEmail ?? "",
                  onValue: () => {},
                },
                {
                  key: "phone",
                  label: "Contact number",
                  icon: "phone" as IconName,
                  optional: true,
                  ph: "e.g. 07700 900123",
                  hint: "Handy if a fare needs a quick yes or no.",
                  value: draft.phone,
                  onValue: setStr("phone"),
                },
              ],
            },
          ]
        : []),
      {
        title: "Extras",
        hint: "Everything the ticketing agent needs to know.",
        cols: 2,
        fields: [
          {
            key: "wheelchair",
            label: "Wheelchair assistance",
            icon: "wheelchair",
            kind: "select",
            options: WHEELCHAIR,
            value: draft.wheelchair,
            onValue: setStr("wheelchair"),
          },
          {
            key: "luggage",
            label: "Extra luggage",
            icon: "luggage",
            kind: "select",
            options: LUGGAGE,
            value: draft.luggage,
            onValue: setStr("luggage"),
          },
          {
            key: "meal",
            label: "Meal preferences",
            icon: "meal",
            kind: "select",
            options: MEALS,
            value: draft.meal,
            onValue: setStr("meal"),
          },
          {
            key: "assist",
            label: "Special assistance",
            icon: "heart",
            kind: "select",
            options: ASSIST,
            value: draft.assist,
            onValue: setStr("assist"),
          },
          {
            key: "extra",
            label: "Anything else?",
            icon: "chat",
            kind: "area",
            rows: 3,
            optional: true,
            span: "1 / -1",
            ph: "Seat preferences, connections to avoid, visa notes, loyalty numbers…",
            value: draft.extra,
            onValue: setStr("extra"),
          },
        ],
      },
    ];
  }, [step, draft, children, oneWay, forCustomer, contactEmail]);

  /* ---------------------------------------------------------- validation */

  function validate(target: Step): boolean {
    const e: Record<string, string> = {};
    if (target >= 1) {
      if (!forCustomer && !draft.customerId) {
        e.customerId = "Choose the customer this order is for.";
      }
      if (!draft.from.trim()) e.from = "Tell us where the trip starts.";
      if (!draft.to.trim()) e.to = "Tell us where the trip ends.";
      if (!draft.depart) e.depart = "A departure date is needed to price the fare.";
      if (!oneWay && !draft.ret) e.ret = "Add a return date, or switch to one way.";
      if (draft.depart && draft.ret && !oneWay && draft.ret < draft.depart) {
        e.ret = "The return can't be before the departure.";
      }
      for (let i = 0; i < children; i++) {
        if (!draft.childAges[i] || draft.childAges[i] === CHILD_AGES[0]) {
          e[`child${i}`] = "Pick an age.";
        }
      }
      if (!forCustomer) {
        const today = new Date().toISOString().slice(0, 10);
        people.forEach((r, i) => {
          // Row 0's identity is the picker, which is checked above. Every
          // other row is only worth keeping if somebody is named on it —
          // an email with no name attached is not a passenger.
          const filled = r.name.trim() || r.email.trim() || r.dob || r.ibe.trim();
          if (i > 0 && filled && !r.name.trim()) {
            e[`person${i}name`] = "Add a name, or remove this row.";
          }
          if (r.email.trim() && !EMAIL_SHAPE.test(r.email.trim())) {
            e[`person${i}email`] = "That email address doesn't look right.";
          }
          if (r.dob && r.dob > today) {
            e[`person${i}dob`] = "A date of birth can't be in the future.";
          }
        });
      }
    }
    if (target >= 2 && !draft.checked) {
      e.checked = "Pick one so the team knows where to start.";
    }
    if (target >= 3) {
      passengers.forEach((p, i) => {
        if (!p.given.trim()) e[`pax${i}given`] = "Given name is required.";
        if (!p.surname.trim()) e[`pax${i}surname`] = "Surname is required.";
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function toTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goNext() {
    if (!validate(step)) return;
    const next = (step + 1) as Step;
    setStep(next);
    setMaxStep((m) => (next > m ? next : m));
    toTop();
  }

  function jump(n: Step) {
    if (n > maxStep) return;
    setStep(n);
    toTop();
  }

  /* -------------------------------------------------------------- submit */

  async function submit() {
    if (!validate(3) || !validate(1) || !validate(2)) return;

    // A signed-out visitor may fill the whole wizard; placing the order is what
    // needs an account. Flush the draft first (the auto-save is debounced), then
    // route through sign-up — most guests here are new customers, and existing
    // ones are one click from sign-in.
    if (isGuest) {
      writeDraft(draft);
      router.push(
        `/signup?redirect=${encodeURIComponent(`${BOOK_PATH}?resume=1`)}`
      );
      return;
    }

    setBusy(true);

    const noteLines: string[] = [];
    if (draft.airline && draft.airline !== ANY_AIRLINE)
      noteLines.push(`Preferred airline: ${draft.airline}`);
    if (draft.adultAges.trim())
      noteLines.push(`Adult ages: ${draft.adultAges.trim()}`);
    if (draft.checked === "yes") {
      noteLines.push("Customer has already checked flights.");
      if (draft.flightInfo.trim())
        noteLines.push(`Flights found: ${draft.flightInfo.trim()}`);
      if (draft.flightNotes.trim())
        noteLines.push(`Notes for ticketing: ${draft.flightNotes.trim()}`);
    } else {
      noteLines.push("No flights checked — search from scratch.");
    }
    if (draft.wheelchair !== WHEELCHAIR[0])
      noteLines.push(`Wheelchair: ${draft.wheelchair}`);
    if (draft.luggage !== LUGGAGE[0])
      noteLines.push(`Extra luggage: ${draft.luggage}`);
    if (draft.meal !== MEALS[0]) noteLines.push(`Meal preference: ${draft.meal}`);
    if (draft.assist !== ASSIST[0])
      noteLines.push(`Special assistance: ${draft.assist}`);
    if (forCustomer && draft.phone.trim()) {
      noteLines.push(`Contact phone: ${draft.phone.trim()}`);
    }
    if (draft.extra.trim()) noteLines.push(`Additional notes: ${draft.extra.trim()}`);

    const cabinValue =
      (CABIN_CLASSES.find((c) => c.label === draft.cabin)?.value ??
        "economy") as CabinClass;

    const input: OrderFormInput & { customerId: string } = {
      customerId: draft.customerId,
      passengerNames: passengers.map((p) => `${p.given.trim()} ${p.surname.trim()}`.trim()),
      routeFrom: draft.from.trim(),
      routeTo: draft.to.trim(),
      travelDate: draft.depart || null,
      returnDate: oneWay ? null : draft.ret || null,
      // The design's visible control is Round trip / One way; a round trip is
      // by definition more than one leg, so it persists as "connection".
      tripType: oneWay ? "direct" : "connection",
      cabinClass: cabinValue,
      adults,
      children,
      childAges: draft.childAges
        .slice(0, children)
        .map((a) => (a === "Under 2" ? 1 : Number(a) || 0)),
      wheelchair: draft.wheelchair !== WHEELCHAIR[0],
      extraLuggage: draft.luggage !== LUGGAGE[0],
      extraLuggageKg: LUGGAGE_KG[draft.luggage] ?? null,
      customerNote: noteLines.join("\n") || null,
      // Stored on its own column too, so the boarding pass and the Airline
      // tile can name the carrier instead of digging it out of the note.
      airline: draft.airline !== ANY_AIRLINE ? draft.airline : null,
      // Row 0 is the chosen customer, so its name comes from the picker
      // rather than a text box. The server sanitises and drops nameless
      // rows; this only decides who is on the list.
      passengerDetails: forCustomer
        ? null
        : people.map((r, i) => ({
            name: (i === 0 ? customerLabel : r.name).trim(),
            email: r.email.trim() || null,
            dob: r.dob || null,
            ibe: r.ibe.trim() || null,
          })),
    };

    let res;
    try {
      res = onCreate ? await onCreate(input) : await createOrder(input);
    } catch (err) {
      setBusy(false);
      toast.error("Couldn't create the order", {
        description:
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
      return;
    }
    if (!res.ok) {
      setBusy(false);
      toast.error("Couldn't create the order", { description: res.error });
      return;
    }

    // Files can only be uploaded once the order — and its access-scoped storage
    // path — exists. A failure here must not strand the wizard: the order is
    // already saved, so warn and carry on rather than rolling anything back.
    if (files.length > 0) {
      try {
        const recorded = [];
        for (const file of files) {
          const up = await uploadOrderAttachment(file, res.data.orderId);
          if (up.ok) {
            recorded.push({
              path: up.path,
              name: file.name,
              mime: file.type || null,
              size: file.size,
            });
          }
        }
        if (recorded.length > 0) {
          await recordOrderAttachments({
            orderId: res.data.orderId,
            attachments: recorded,
          });
        }
        if (recorded.length < files.length) {
          toast.warning("Some files didn't upload", {
            description: "Your order was still created — share them in its thread.",
          });
        }
      } catch {
        toast.warning("Some files didn't upload", {
          description: "Your order was still created — share them in its thread.",
        });
      }
    }

    setBusy(false);
    if (forCustomer) clearDraft();
    setCreated({ id: res.data.orderId, ref: res.data.orderNumber ?? "" });
    toast.success(forCustomer ? "Booking request sent" : "Order created");
    toTop();
  }

  /* --------------------------------------------------------------- views */

  const stepDefs: { n: Step; title: string; sub: string }[] = [
    { n: 1, title: "Trip details", sub: "Where & when" },
    { n: 2, title: "Flight check", sub: "Speed things up" },
    { n: 3, title: "Passengers & review", sub: "Names & confirm" },
  ];
  const stepTitles = ["Trip details", "Flight check", "Passengers & review"];
  const errCount = Object.values(errors).filter(Boolean).length;
  const last = step === 3;

  if (created) {
    return (
      <div className="flex max-w-[1080px] flex-col gap-5">
        <div ref={topRef} />
        <BackLink href={`${basePath}/orders`}>
          {forCustomer ? "All my orders" : "All orders"}
        </BackLink>
        <div
          role="status"
          className={cn(
            "border-line-base flex flex-wrap items-center gap-5 rounded-[12px] border bg-white px-6 py-7",
            shadowE1
          )}
        >
          <span className="bg-ok-bg text-ok-ink flex size-12 flex-none items-center justify-center rounded-[13px]">
            <CheckIcon size={24} width={1.9} />
          </span>
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-poppins text-ink-900 m-0 text-[17px] font-medium tracking-[-0.016em]">
                {forCustomer
                  ? created.ref
                    ? `Booking request ${created.ref} sent`
                    : "Booking request sent"
                  : created.ref
                    ? `Order ${created.ref} created`
                    : "Order created"}
              </h2>
              <Pill tone="ok">{forCustomer ? "Received" : "New"}</Pill>
            </span>
            <p className="text-ink-600 m-0 text-[12.5px] leading-[1.55] font-normal text-pretty">
              {routeLine} · {travellerLine} · {draft.trip}.{" "}
              {forCustomer
                ? "Our team is on it — we'll message you in the portal as soon as we have a fare."
                : `Saved to the pipeline for ${customerLabel} and ready for a ticketing agent to price.`}
            </p>
          </div>
          <div className="flex flex-none flex-wrap gap-3">
            <Btn
              onClick={() => {
                setDraft(forCustomer ? seed(undefined, contactPhone ?? null) : blank());
                setFiles([]);
                setErrors({});
                setStep(1);
                setMaxStep(1);
                setCreated(null);
                toTop();
              }}
            >
              {forCustomer ? "Book another trip" : "Create another"}
            </Btn>
            <Btn
              variant="ember"
              onClick={() => router.push(`${basePath}/orders/${created.id}`)}
            >
              {forCustomer ? "Track this booking" : "View order"}
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[1080px] flex-col gap-5">
      <div ref={topRef} />
      {isGuest ? null : (
        <BackLink href={`${basePath}/orders`}>
          {forCustomer ? "All my orders" : "All orders"}
        </BackLink>
      )}

      <div className="flex flex-col gap-1.5">
        <Eyebrow>{forCustomer ? "New booking" : "New order"}</Eyebrow>
        <h1 className="font-poppins text-ink-700 m-0 text-[clamp(20px,1.5vw,24px)] leading-[1.5] font-medium tracking-[-0.02em]">
          {forCustomer ? "Book a flight" : "Passenger Travel details"}
        </h1>
        <p className="text-ink-600 m-0 mt-0.5 max-w-[640px] text-[13.5px] font-normal text-pretty">
          {forCustomer
            ? "Three quick steps — tell us the trip and our team will come back with the best fare we can find."
            : "Enter details below — the trip, the flight check and who is travelling, in three steps."}
        </p>
      </div>

      {/* --------------------------------------------------- the step rail */}
      <div
        className={cn(
          "border-line-base rounded-[12px] border bg-white px-5 pt-4 pb-1",
          shadowE1
        )}
      >
        <ol className="m-0 grid list-none grid-cols-1 gap-x-5 gap-y-2 p-0 min-[760px]:grid-cols-3">
          {stepDefs.map((s) => {
            const done = s.n < step;
            const active = s.n === step;
            const open = s.n <= maxStep;
            return (
              <li
                key={s.n}
                className={cn(
                  "relative min-w-0 border-b-2 pb-3",
                  done
                    ? "border-b-ok-ink"
                    : active
                      ? "border-b-marine-500"
                      : "border-b-line-hair",
                  // The design bridges the 20px grid gutter with a 1px rule that
                  // turns green once the step behind it is done.
                  s.n < 3 &&
                    "after:absolute after:top-[21px] after:-right-5 after:hidden after:h-px after:w-5 after:content-[''] min-[760px]:after:block",
                  s.n < step ? "after:bg-ok-ink" : "after:bg-line-strong"
                )}
              >
                <button
                  type="button"
                  disabled={!open}
                  aria-current={active ? "step" : undefined}
                  onClick={() => jump(s.n)}
                  className={cn(
                    // leading-normal: the design's step row sits on the UA's
                    // line-height, which is what keeps the rail at 80px.
                    "flex w-full items-center gap-3 rounded-[10px] border-0 px-2 py-1.5 text-left leading-[normal] outline-none transition-[background-color] duration-[130ms]",
                    active
                      ? "bg-surface-3"
                      : open
                        ? "hover:bg-surface-1 cursor-pointer bg-transparent"
                        : "cursor-default bg-transparent"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[30px] flex-none items-center justify-center rounded-full border-[1.5px] text-[12.5px] font-semibold tabular-nums",
                      done
                        ? "border-ok-edge bg-ok-bg text-ok-ink"
                        : active
                          ? "border-marine-500 bg-marine-500 text-white"
                          : "border-line-strong text-ink-500 bg-white"
                    )}
                  >
                    {/* The design marks a finished step with its circled
                        check — ico("check", 15, 2.1) — not a bare tick. */}
                    {done ? <CheckCircleIcon size={15} width={2.1} /> : s.n}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={cn(
                        "truncate text-[13px] font-medium",
                        active ? "text-ink-900" : "text-ink-700"
                      )}
                    >
                      {s.title}
                    </span>
                    <span className="text-ink-500 truncate text-[11.5px] font-normal">
                      {s.sub}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex-none text-[10px] font-semibold tracking-[0.08em] uppercase",
                      done
                        ? "text-ok-ink"
                        : active
                          ? "text-marine-600"
                          : "text-ink-450"
                    )}
                  >
                    {done ? "Done" : active ? "Current" : "Next"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
          <h2 className="font-poppins text-ink-900 m-0 text-[16px] font-medium tracking-[-0.016em]">
            {stepTitles[step - 1]}
          </h2>
          <span className="text-ink-500 text-[11px] font-medium tracking-[0.11em] uppercase">
            Step {step} of 3
          </span>
        </div>

        {/* ------------------------------------------------ step 2 choice */}
        {step === 2 ? (
          <Card>
            <CardHead title="Have you already checked specific flights?" />
            <div className="flex flex-col gap-4 p-5">
              <p className="text-ink-600 m-0 max-w-[640px] text-[13px] leading-[1.6] font-normal text-pretty">
                This helps us find the exact deal faster.{" "}
                {forCustomer
                  ? "If you've spotted flights, dates or fares anywhere, share them and we'll match or beat them — if not, we'll search from scratch."
                  : "If the customer has spotted flights, dates or fares anywhere, share them and we'll match or beat them — if not, we'll search from scratch."}
              </p>
              <div
                role="radiogroup"
                aria-label="Flight check"
                className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2"
              >
                {(
                  [
                    [
                      "yes" as const,
                      forCustomer
                        ? "Yes, I've found some flights"
                        : "Yes, flights are already checked",
                      forCustomer
                        ? "Share the details or a screenshot"
                        : "Details or screenshots can be shared",
                    ],
                    [
                      "no" as const,
                      "Not yet — find the best fare",
                      forCustomer
                        ? "We'll search from scratch for you"
                        : "Search from scratch for this trip",
                    ],
                  ] as const
                ).map(([key, title, sub]) => {
                  const on = draft.checked === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        set("checked")(key);
                        setErrors((e) => ({ ...e, checked: "" }));
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-[12px] border p-4 text-left outline-none transition-[border-color,background-color] duration-[130ms]",
                        on
                          ? "border-marine-500 bg-surface-3 shadow-[0_0_0_1px_var(--color-marine-500)]"
                          : errors.checked
                            ? "border-danger-edge bg-white"
                            : "border-line-base hover:border-marine-edge bg-white"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-px flex size-5 flex-none items-center justify-center rounded-full border-[1.5px] text-white",
                          on
                            ? "border-marine-500 bg-marine-500"
                            : "border-line-strong bg-white"
                        )}
                      >
                        {on ? <CheckIcon size={12} width={2.6} /> : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5 leading-[1.35]">
                          <span className="text-ink-850 text-[13.5px] font-medium">
                            {title}
                          </span>
                          {on ? (
                            <span className="bg-marine-tint text-marine-600 rounded-full px-[9px] py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase">
                              Selected
                            </span>
                          ) : null}
                        </span>
                        <span className="text-ink-600 text-[12.5px] leading-[1.5] font-normal text-pretty">
                          {sub}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.checked ? <ErrorNote>{errors.checked}</ErrorNote> : null}
              {draft.checked === "no" ? (
                <div className="border-marine-line bg-surface-3 flex items-start gap-3 rounded-[11px] border px-4 py-3.5">
                  <span className="text-marine-600 flex flex-none">
                    <LifebuoyIcon size={17} />
                  </span>
                  <span className="text-marine-600 min-w-0 flex-1 text-[12.5px] leading-[1.55] font-normal text-pretty">
                    Nothing else needed here — the ticketing team will search from
                    scratch and come back with the best fares for this trip.
                  </span>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        {/* ------------------------------------- passenger travel details */}
        {/* Staff only: a customer IS the customer, so there is nobody to pick
            and no companion roster to key in on their own booking form. */}
        {step === 1 && !forCustomer ? (
          <Card>
            <CardHead
              title="Passenger travel details"
              hint="The first row is the customer the order is filed against. Add a row for anyone else travelling with them."
            />
            <div className="flex flex-col gap-4 px-5 pt-2 pb-5">
              {people.map((row, i) => {
                const isHolder = i === 0;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col gap-3",
                      !isHolder && "border-line-soft border-t pt-4"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="bg-marine-tint text-marine-600 flex size-[26px] flex-none items-center justify-center rounded-[8px] text-[11.5px] font-semibold tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-ink-800 text-[12.5px] font-medium">
                        {isHolder ? "Customer" : "Passenger " + (i + 1)}
                      </span>
                      {isHolder ? (
                        <Pill tone="ink" className="px-2.5 py-[3px] text-[10.5px]">
                          Order is filed here
                        </Pill>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removePerson(i)}
                          aria-label={"Remove passenger " + (i + 1)}
                          className={cn(
                            "text-ink-500 hover:text-danger-ink ml-auto inline-flex size-7 flex-none items-center justify-center rounded-[8px]",
                            focusRing
                          )}
                        >
                          <CloseIcon size={15} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 min-[620px]:grid-cols-2 min-[1040px]:grid-cols-4">
                      {/* Column 1 — the account holder is CHOSEN, everyone
                          else is typed. Keeping the picker here is what keeps
                          createOrder able to file the order and open its
                          message thread. */}
                      {isHolder ? (
                        <div className="flex min-w-0 flex-col gap-[7px]">
                          <label
                            htmlFor="co-customerId"
                            className="text-ink-700 flex items-center gap-[7px] text-[11.5px] font-medium"
                          >
                            <span className="text-marine-icon flex flex-none">
                              <Ico name="user" size={15} />
                            </span>
                            Customer first name
                          </label>
                          <select
                            id="co-customerId"
                            value={draft.customerId}
                            aria-invalid={!!errors.customerId}
                            onChange={(e) => chooseCustomer(e.target.value)}
                            className={cn(
                              inputClass,
                              focusRing,
                              // 14px gutter, as on every other select here.
                              "cursor-pointer px-3.5",
                              errors.customerId && "border-danger-edge"
                            )}
                          >
                            <option value="">Choose a customer…</option>
                            {customers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          {errors.customerId ? (
                            <ErrorNote>{errors.customerId}</ErrorNote>
                          ) : null}
                        </div>
                      ) : (
                        <FieldRow
                          err={errors["person" + i + "name"]}
                          f={{
                            key: "person" + i + "name",
                            label: "Customer first name",
                            icon: "user",
                            ph: "As shown on passport",
                            value: row.name,
                            onValue: (v) => setPerson(i, "name", v),
                          }}
                        />
                      )}

                      <FieldRow
                        err={errors["person" + i + "email"]}
                        f={{
                          key: "person" + i + "email",
                          label: "Email id",
                          icon: "mail",
                          optional: true,
                          ph: "name@example.com",
                          value: row.email,
                          onValue: (v) => setPerson(i, "email", v),
                        }}
                      />
                      <FieldRow
                        err={errors["person" + i + "dob"]}
                        f={{
                          key: "person" + i + "dob",
                          label: "DOB",
                          icon: "calendar",
                          kind: "date",
                          optional: true,
                          value: row.dob,
                          onValue: (v) => setPerson(i, "dob", v),
                        }}
                      />
                      <FieldRow
                        err={errors["person" + i + "ibe"]}
                        f={{
                          key: "person" + i + "ibe",
                          label: "IBE number",
                          icon: "idcard",
                          optional: true,
                          ph: "Booking engine reference",
                          value: row.ibe,
                          onValue: (v) => setPerson(i, "ibe", v),
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={addPerson}
                  disabled={people.length >= MAX_PEOPLE}
                  className={cn(
                    "border-line-field text-ink-800 hover:bg-surface-1 inline-flex h-9 items-center gap-2 rounded-full border border-dashed bg-white px-4 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-60",
                    focusRing
                  )}
                >
                  Add
                  <span aria-hidden className="text-marine-600 text-[15px] leading-none">
                    +
                  </span>
                </button>
                {people.length >= MAX_PEOPLE ? (
                  <span className="text-ink-500 text-[11.5px]">
                    {MAX_PEOPLE} passengers is the most one order can carry.
                  </span>
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}

        {/* ----------------------------------------------- passenger names */}
        {step === 3 ? (
          <Card>
            <CardHead
              title="Passenger names"
              hint={`One entry per traveller from step 1 — ${travellerLine}.`}
            />
            <div className="px-5 pt-2 pb-5">
              {passengers.map((p, i) => (
                <div key={i} className="border-line-soft border-b py-4">
                  <span className="mb-3 flex items-center gap-2.5">
                    <span className="bg-marine-tint text-marine-600 flex size-[26px] flex-none items-center justify-center rounded-[8px] text-[11.5px] font-semibold tabular-nums">
                      {i + 1}
                    </span>
                    <span className="text-ink-800 text-[12.5px] font-medium">
                      Passenger {i + 1}
                    </span>
                    <Pill
                      tone={p.type === "Adult" ? "ink" : "warn"}
                      className="px-2.5 py-[3px] text-[10.5px]"
                    >
                      {p.type}
                    </Pill>
                  </span>
                  <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2">
                    <FieldRow
                      err={errors[`pax${i}given`]}
                      f={{
                        key: `pax${i}given`,
                        label: "Given name",
                        icon: "user",
                        ph: "As shown on passport",
                        value: p.given,
                        onValue: (v) => setPax(i, "given", v),
                      }}
                    />
                    <FieldRow
                      err={errors[`pax${i}surname`]}
                      f={{
                        key: `pax${i}surname`,
                        label: "Surname",
                        icon: "idcard",
                        ph: "As shown on passport",
                        value: p.surname,
                        onValue: (v) => setPax(i, "surname", v),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {/* ------------------------------------------------------ sections */}
        {sections.map((sec) => (
          <Card key={sec.title}>
            <CardHead title={sec.title} hint={sec.hint} />
            <div className={cn("grid gap-4 p-5", COLS[sec.cols])}>
              {sec.fields.map((f) =>
                f.key === "customerId" ? (
                  <div key={f.key} className="flex min-w-0 flex-col gap-[7px]">
                    <label
                      htmlFor="co-customerId"
                      className="text-ink-700 flex items-center gap-[7px] text-[11.5px] font-medium"
                    >
                      <span className="text-marine-icon flex flex-none">
                        <Ico name="user" size={15} />
                      </span>
                      Customer
                    </label>
                    <select
                      id="co-customerId"
                      value={draft.customerId}
                      aria-invalid={!!errors.customerId}
                      onChange={(e) => setStr("customerId")(e.target.value)}
                      className={cn(
                        inputClass,
                        focusRing,
                        // 14px gutter, as on every other select in the wizard.
                        "cursor-pointer px-3.5",
                        errors.customerId && "border-danger-edge"
                      )}
                    >
                      <option value="">Choose a customer…</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {errors.customerId ? (
                      <ErrorNote>{errors.customerId}</ErrorNote>
                    ) : null}
                  </div>
                ) : (
                  <FieldRow key={f.key} f={f} err={errors[f.key]} />
                )
              )}
            </div>

            {sec.showChildAges ? (
              <div className="border-line-strong bg-surface-1 mx-5 mb-5 rounded-[11px] border border-dashed p-4">
                <span className="text-ink-500 flex items-center gap-2 text-[11px] font-semibold tracking-[0.09em] uppercase">
                  <span className="text-marine-icon flex flex-none">
                    <ChildIcon size={14} />
                  </span>
                  Children&apos;s ages at travel
                </span>
                <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                  {Array.from({ length: children }, (_, i) => (
                    <div key={i} className="flex min-w-0 flex-col gap-[7px]">
                      <label
                        htmlFor={`co-child-${i}`}
                        className="text-ink-700 text-[11.5px] font-medium"
                      >
                        Child {i + 1} age
                      </label>
                      <select
                        id={`co-child-${i}`}
                        value={draft.childAges[i] ?? CHILD_AGES[0]}
                        onChange={(e) => {
                          const next = [...draft.childAges];
                          next[i] = e.target.value;
                          set("childAges")(next);
                          setErrors((x) => ({ ...x, [`child${i}`]: "" }));
                        }}
                        className={cn(
                          inputClass,
                          focusRing,
                          "cursor-pointer",
                          errors[`child${i}`] && "border-danger-edge"
                        )}
                      >
                        {CHILD_AGES.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                      {errors[`child${i}`] ? (
                        <ErrorNote>{errors[`child${i}`]}</ErrorNote>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {sec.showUpload ? (
              <div className="mx-5 mb-5 flex flex-col gap-3">
                <span className="text-ink-700 flex items-center gap-[7px] text-[11.5px] font-medium">
                  <span className="text-marine-icon flex flex-none">
                    <ImageIcon size={14} />
                  </span>
                  Screenshots or booking files
                  <span className="text-ink-450 font-normal">Optional</span>
                </span>
                {forCustomer ? (
                  /* The traveller has the screenshot in their hand right now —
                     staff don't, which is why they get the note instead. */
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      accept={ATTACHMENT_ACCEPT}
                      className="hidden"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        const good: File[] = [];
                        for (const f of picked) {
                          const check = validateAttachment(f);
                          if (check.ok) good.push(f);
                          else toast.error(`Can't attach ${f.name}`, { description: check.error });
                        }
                        if (good.length) setFiles((prev) => [...prev, ...good]);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="border-line-strong bg-surface-1 hover:border-marine-500 hover:bg-marine-wash flex flex-col items-center justify-center gap-2 rounded-[11px] border border-dashed px-4 py-5 text-center outline-none transition-colors"
                    >
                      <span className="text-marine-600 flex items-center gap-2 text-[12.5px] font-medium">
                        <DocumentIcon size={15} />
                        Choose files
                      </span>
                      <span className="text-ink-500 text-[12px] font-normal text-pretty">
                        PNG, JPG or PDF. Every file stays attached to the order.
                      </span>
                    </button>
                    {files.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {files.map((f, i) => (
                          <div
                            key={`${f.name}-${i}`}
                            className="border-line-hair flex min-w-0 items-center gap-3 rounded-[10px] border bg-white px-3.5 py-2.5"
                          >
                            <span className="bg-marine-tint text-marine-600 flex size-[30px] flex-none items-center justify-center rounded-[9px]">
                              <DocumentIcon size={15} />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="text-ink-800 truncate text-[12.5px] font-medium">
                                {f.name}
                              </span>
                              <span className="text-ink-500 text-[11px] font-normal">
                                {Math.max(1, Math.round(f.size / 1024))} KB
                              </span>
                            </span>
                            <button
                              type="button"
                              aria-label={`Remove ${f.name}`}
                              onClick={() =>
                                setFiles((prev) => prev.filter((_, n) => n !== i))
                              }
                              className="text-ink-500 hover:bg-surface-1 hover:text-ink-800 flex size-7 flex-none items-center justify-center rounded-full outline-none"
                            >
                              <CloseIcon size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="border-line-strong bg-surface-1 flex flex-col items-center justify-center gap-2 rounded-[11px] border border-dashed px-4 py-5 text-center">
                    <span className="text-marine-600 flex items-center gap-2 text-[12.5px] font-medium">
                      <DocumentIcon size={15} />
                      Attach them on the order once it exists
                    </span>
                    <span className="text-ink-500 text-[12px] font-normal text-pretty">
                      The order&apos;s own thread takes PNG, JPG and PDF, and every
                      file stays with the record.
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </Card>
        ))}

        {/* ------------------------------------------------------- review */}
        {step === 3 ? (
          <Card>
            <CardHead
              title="Review your booking"
              hint="A quick check before we get to work."
            />
            <div>
              {(
                [
                  forCustomer
                    ? {
                        label: "Contact",
                        icon: "mail" as IconName,
                        tint: "bg-neutral-bg text-ink-700",
                        step: 3 as Step,
                        lines: [
                          [contactEmail || "Confirmed at sign-up", false],
                          [draft.phone.trim() || "No phone given", true],
                        ],
                      }
                    : {
                        label: "Customer",
                        icon: "user" as IconName,
                        tint: "bg-neutral-bg text-ink-700",
                        step: 1 as Step,
                        lines: [[customerLabel || "Not chosen", false]],
                      },
                  {
                    label: "Trip",
                    icon: "route" as IconName,
                    tint: "bg-marine-tint text-marine-600",
                    step: 1 as Step,
                    lines: [
                      [routeLine, false],
                      [
                        oneWay
                          ? draft.depart
                            ? fmtDate(draft.depart)
                            : "Departure date to confirm"
                          : `${draft.depart ? fmtDate(draft.depart) : "—"} → ${
                              draft.ret ? fmtDate(draft.ret) : "—"
                            }`,
                        true,
                      ],
                      [draft.trip, true],
                    ],
                  },
                  {
                    label: "Travellers",
                    icon: "parents" as IconName,
                    tint: "bg-violet-bg text-violet-ink",
                    step: 1 as Step,
                    lines: [
                      [travellerLine, false],
                      [
                        draft.adultAges
                          ? `Adult ages ${draft.adultAges}`
                          : "Ages not given",
                        true,
                      ],
                    ],
                  },
                  {
                    label: "Airline",
                    icon: "plane" as IconName,
                    tint: "bg-teal-bg text-teal-ink",
                    step: 1 as Step,
                    lines: [
                      [draft.airline, false],
                      [draft.cabin, true],
                    ],
                  },
                  {
                    label: "Flight check",
                    icon: "flight" as IconName,
                    tint: "bg-warn-bg text-warn-ink",
                    step: 2 as Step,
                    lines:
                      draft.checked === "yes"
                        ? [
                            ["Already checked flights", false],
                            [
                              // The design's own wording. Staff have no
                              // uploader on this step (files go on the order's
                              // thread), so their branch never counts files.
                              files.length > 0
                                ? `${files.length} file${files.length === 1 ? "" : "s"} attached`
                                : draft.flightInfo.trim()
                                  ? "Details shared, no files"
                                  : "No details added yet",
                              true,
                            ],
                          ]
                        : draft.checked === "no"
                          ? [
                              ["Search from scratch", false],
                              ["Team will find the best fare", true],
                            ]
                          : [["Not answered yet", true]],
                  },
                  {
                    label: "Passengers",
                    icon: "idcard" as IconName,
                    tint: "bg-ok-bg text-ok-ink",
                    step: 3 as Step,
                    lines: [
                      [
                        namedCount === totalPax
                          ? `${totalPax} passenger${totalPax === 1 ? "" : "s"} added`
                          : `${namedCount} of ${totalPax} names added`,
                        false,
                      ],
                      [
                        draft.wheelchair === WHEELCHAIR[0] &&
                        draft.luggage === LUGGAGE[0]
                          ? "No extras requested"
                          : [
                              draft.wheelchair !== WHEELCHAIR[0] ? "Wheelchair" : null,
                              draft.luggage !== LUGGAGE[0] ? draft.luggage : null,
                            ]
                              .filter(Boolean)
                              .join(" · "),
                        true,
                      ],
                    ],
                  },
                ] as const
              ).map((r) => (
                <div
                  key={r.label}
                  className="border-line-soft flex flex-wrap items-start gap-x-4 gap-y-2.5 border-b px-5 py-3.5"
                >
                  <span className="flex min-w-[160px] flex-none items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-[30px] flex-none items-center justify-center rounded-[9px]",
                        r.tint
                      )}
                    >
                      <Ico name={r.icon} size={16} />
                    </span>
                    <span className="text-ink-tertiary text-[10.5px] font-semibold tracking-[0.08em] uppercase">
                      {r.label}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-[1_1_220px] flex-col items-start gap-[3px] text-left min-[600px]:items-end min-[600px]:text-right">
                    {r.lines.map(([text, muted], i) => (
                      <span
                        key={i}
                        className={cn(
                          "text-[13.5px] leading-[1.45] font-medium break-words text-pretty",
                          muted ? "text-ink-600" : "text-ink-850"
                        )}
                      >
                        {text}
                      </span>
                    ))}
                  </span>
                  <button
                    type="button"
                    onClick={() => jump(r.step)}
                    aria-label={`Edit ${r.label.toLowerCase()}`}
                    title={`Edit ${r.label.toLowerCase()}`}
                    className="border-line-base text-marine-600 hover:bg-surface-3 hover:border-line-strong flex size-8 flex-none items-center justify-center rounded-full bg-white outline-none"
                  >
                    <EditIcon size={15} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {/* ------------------------------------------------------- footer */}
        <div
          className={cn(
            "border-line-base flex flex-wrap items-center justify-between gap-4 rounded-[12px] border bg-white px-5 py-4",
            shadowE1
          )}
        >
          <span className="flex min-w-0 flex-[1_1_240px] flex-col gap-[3px]">
            <span className="text-ink-700 text-[12px] font-medium">
              Step {step} of 3 · {stepTitles[step - 1]}
            </span>
            {errCount > 0 ? (
              <span role="alert" className="text-danger-ink text-[11.5px] font-medium">
                {errCount === 1
                  ? "1 field needs attention — see the message above."
                  : `${errCount} fields need attention — see the messages above.`}
              </span>
            ) : (
              <span className="text-ink-500 text-[11.5px] font-normal text-pretty">
                {last
                  ? forCustomer
                    ? isGuest
                      ? "You'll make an account on the next screen — your answers are kept."
                      : "Sending this opens a thread with the team so you can follow it."
                    : "Creating the order adds it to the pipeline and opens a customer thread."
                  : "Nothing is saved until you send it — you can go back at any point."}
              </span>
            )}
          </span>
          <div className="flex flex-none flex-wrap gap-3">
            {/* The design's wizard footer runs its secondary button a touch
                wider than the standard 20px control padding. */}
            <Btn
              className="px-[22px]"
              disabled={step === 1 && isGuest}
              onClick={() =>
                step === 1
                  ? router.push(`${basePath}/orders`)
                  : (setStep((s) => (s - 1) as Step), toTop())
              }
            >
              {step === 1 ? "Cancel" : "Back"}
            </Btn>
            <Btn
              variant="ember"
              disabled={busy}
              onClick={() => (last ? submit() : goNext())}
            >
              {last
                ? busy
                  ? forCustomer
                    ? "Sending…"
                    : "Creating order…"
                  : forCustomer
                    ? isGuest
                      ? "Create account & send"
                      : "Send booking request"
                    : "Create order"
                : step === 1
                  ? "Continue to flight check"
                  : "Continue to passengers & review"}
              {busy ? null : last ? (
                <CheckIcon size={15} width={2} />
              ) : (
                <RouteIcon size={15} width={2} />
              )}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
