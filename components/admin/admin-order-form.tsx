"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOrder } from "@/lib/actions/admin";
import {
  AIRLINES,
  ANY_AIRLINE,
  CABIN_CLASSES,
  type OrderFormInput,
} from "@/lib/orders/form";
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
  CheckIcon,
  ChildIcon,
  DocumentIcon,
  EditIcon,
  Ico,
  ImageIcon,
  LifebuoyIcon,
  RouteIcon,
  type IconName,
} from "@/components/admin/icons";

/**
 * The design's three-step "Create an order" wizard, admin skin.
 *
 * It is deliberately a separate component from `components/orders/order-form.tsx`
 * — that one is shared by the employee and customer portals and stays on the
 * navy/orange system. Both write the same `OrderFormInput`, so the persisted
 * record is identical whoever places the order.
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
};

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
  };
}

export type AdminOrderCustomer = { id: string; label: string };

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

export function AdminOrderForm({ customers }: { customers: AdminOrderCustomer[] }) {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; ref: string } | null>(null);

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

  const customerLabel =
    customers.find((c) => c.id === draft.customerId)?.label ?? "";

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
        {
          title: "Customer",
          hint: "The order is filed against this customer's portal account.",
          cols: 2,
          fields: [
            {
              key: "customerId",
              label: "Customer",
              icon: "user",
              kind: "select",
              options: ["", ...customers.map((c) => c.id)],
              value: draft.customerId,
              onValue: setStr("customerId"),
            },
          ],
        },
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
              label: "Preferred airline",
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
  }, [step, draft, children, oneWay, customers]);

  /* ---------------------------------------------------------- validation */

  function validate(target: Step): boolean {
    const e: Record<string, string> = {};
    if (target >= 1) {
      if (!draft.customerId) e.customerId = "Choose the customer this order is for.";
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
    };

    const res = await createOrder(input);
    setBusy(false);
    if (!res.ok) {
      toast.error("Couldn't create the order", { description: res.error });
      return;
    }
    setCreated({ id: res.data.orderId, ref: res.data.orderNumber });
    toast.success("Order created");
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
        <BackLink href="/admin/orders">All orders</BackLink>
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
                Order {created.ref} created
              </h2>
              <Pill tone="ok">New</Pill>
            </span>
            <p className="text-ink-600 m-0 text-[12.5px] leading-[1.55] font-normal text-pretty">
              {routeLine} · {travellerLine} · {draft.trip}. Saved to the pipeline
              for {customerLabel} and ready for a ticketing agent to price.
            </p>
          </div>
          <div className="flex flex-none flex-wrap gap-3">
            <Btn
              onClick={() => {
                setDraft(blank());
                setErrors({});
                setStep(1);
                setMaxStep(1);
                setCreated(null);
                toTop();
              }}
            >
              Create another
            </Btn>
            <Btn
              variant="ember"
              onClick={() => router.push(`/admin/orders/${created.id}`)}
            >
              View order
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[1080px] flex-col gap-5">
      <div ref={topRef} />
      <BackLink href="/admin/orders">All orders</BackLink>

      <div className="flex flex-col gap-1.5">
        <Eyebrow>New order</Eyebrow>
        <h1 className="font-poppins text-ink-900 m-0 text-[clamp(20px,1.5vw,24px)] leading-[1.25] font-medium tracking-[-0.02em]">
          Create an order
        </h1>
        <p className="text-ink-600 m-0 mt-0.5 max-w-[640px] text-[13.5px] font-normal text-pretty">
          Capture the trip, flight check and passenger details in three steps.
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
                    "flex w-full items-center gap-3 rounded-[10px] border-0 px-2 py-1.5 text-left outline-none transition-[background-color] duration-[130ms]",
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
                    {done ? <CheckIcon size={15} width={2.1} /> : s.n}
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
                This helps us find the exact deal faster. If the customer has
                spotted flights, dates or fares anywhere, share them and we&apos;ll
                match or beat them — if not, we&apos;ll search from scratch.
              </p>
              <div
                role="radiogroup"
                aria-label="Flight check"
                className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2"
              >
                {(
                  [
                    ["yes", "Yes, flights are already checked", "Details or screenshots can be shared"],
                    ["no", "Not yet — find the best fare", "Search from scratch for this trip"],
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
                        "cursor-pointer",
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
                  {
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
                              draft.flightInfo.trim()
                                ? "Details shared with the team"
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
                  ? "Creating the order adds it to the pipeline and opens a customer thread."
                  : "Nothing is saved until you create the order — you can go back at any point."}
              </span>
            )}
          </span>
          <div className="flex flex-none flex-wrap gap-3">
            <Btn
              onClick={() =>
                step === 1
                  ? router.push("/admin/orders")
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
                  ? "Creating order…"
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
