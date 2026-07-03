"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  Paperclip,
  FileText,
  X,
  Loader2,
  ShieldCheck,
  Accessibility,
  Luggage,
  CheckCircle2,
  Check,
  Users,
  Search,
  Sparkles,
  CalendarDays,
  Armchair,
  UtensilsCrossed,
  Phone,
  Mail,
  Pencil,
  LogIn,
  StickyNote,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import {
  uploadOrderAttachment,
  validateAttachment,
  ATTACHMENT_ACCEPT,
} from "@/lib/storage";
import {
  recordOrderAttachments,
  type RecordedAttachment,
} from "@/lib/actions/orders";
import { createOrder } from "@/lib/actions/admin";
import { createOrderFromChat } from "@/lib/actions/employee";
import { createCustomerOrder } from "@/lib/actions/customer";
import {
  TRIP_TYPES,
  CABIN_CLASSES,
  ADULT_AGE,
  AIRLINES,
  ANY_AIRLINE,
  MEAL_PREFERENCES,
  composeCustomerNote,
  cabinLabel,
  tripTypeLabel,
  type OrderFormInput,
} from "@/lib/orders/form";
import { BOOK_PATH, type BookPrefill } from "@/lib/orders/book-link";
import type { TripType, CabinClass } from "@/lib/db/types";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type OrderFormCustomer = { id: string; label: string };
export type OrderFormConversation = {
  id: string;
  customerId: string | null;
  label: string;
};
export type OrderFormRole = "admin" | "employee" | "customer";

const selectClass =
  "h-11 w-full rounded-[10px] border border-input bg-neutral-soft px-3 text-sm text-foreground outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25 disabled:opacity-50";

function fieldLabel(text: string, required?: boolean) {
  return (
    <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
      {text}
      {required ? <span className="ml-0.5 text-orange">*</span> : null}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs font-medium text-rose-600 animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none">
      {message}
    </p>
  );
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
  disabled,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-white text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-default disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center font-display text-base font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label={`More ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-white text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-default disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

// ----- Wizard steps -----

const STEPS = [
  { n: 1, label: "Trip details", hint: "Where & when" },
  { n: 2, label: "Flight check", hint: "Speed things up" },
  { n: 3, label: "Passengers & review", hint: "Names & confirm" },
] as const;

function StepIndicator({
  step,
  onJump,
}: {
  step: number;
  onJump: (n: number) => void;
}) {
  return (
    <nav aria-label="Booking progress">
      <ol className="flex items-start gap-2 sm:gap-3">
        {STEPS.map((s, i) => {
          const done = s.n < step;
          const current = s.n === step;
          return (
            <li key={s.n} className="flex flex-1 items-start gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => done && onJump(s.n)}
                disabled={!done}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  done && "cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200",
                    current
                      ? "bg-primary text-primary-foreground shadow-sm shadow-orange/30 ring-4 ring-orange/15"
                      : done
                        ? "bg-navy text-white group-hover:bg-brand-dark"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <Check className="size-4.5" /> : s.n}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate text-xs font-semibold sm:text-sm",
                      current ? "text-navy" : done ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="hidden text-[11px] text-muted-foreground sm:block">
                    {s.hint}
                  </span>
                </span>
              </button>
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "mt-[17px] h-0.5 w-4 shrink-0 rounded-full transition-colors duration-300 sm:w-10",
                    s.n < step ? "bg-navy" : "bg-border"
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ----- Draft persistence (customer flow only) -----
// The wizard is fillable while logged out; state survives the sign-in/sign-up
// round-trip via localStorage (query params can't carry a whole wizard, and
// File objects can't be serialised at all — we note their count and ask the
// customer to re-attach).

const DRAFT_KEY = "wicket-booking-draft-v1";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type Draft = {
  savedAt: number;
  step: number;
  routeFrom: string;
  routeTo: string;
  depart: string;
  ret: string;
  tripType: TripType | null;
  cabin: CabinClass | null;
  adults: number;
  children: number;
  childAges: string[];
  airline: string;
  gateChoice: "yes" | "no" | null;
  note: string;
  acknowledged: boolean;
  fileCount: number;
  pax: { given: string; surname: string }[];
  phone: string;
  meal: string;
  assistance: string;
  wheelchair: boolean;
  extraLuggage: boolean;
  extraLuggageKg: string;
  extraNote: string;
};

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (!draft || typeof draft.savedAt !== "number") return null;
    if (Date.now() - draft.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}

type Errors = Partial<
  Record<
    | "target"
    | "route"
    | "depart"
    | "return"
    | "tripType"
    | "cabin"
    | "childAges"
    | "gate"
    | "pax"
    | "phone",
    string
  >
>;

export function OrderForm({
  role,
  customers = [],
  conversations = [],
  presetConversationId,
  prefill,
  contactEmail,
  contactPhone,
  isGuest = false,
}: {
  role: OrderFormRole;
  customers?: OrderFormCustomer[];
  conversations?: OrderFormConversation[];
  presetConversationId?: string;
  /** Homepage search widget query params, already validated server-side. */
  prefill?: BookPrefill;
  /** Signed-in customer's account email (shown read-only in Step 3). */
  contactEmail?: string | null;
  /** Signed-in customer's phone on file — pre-fills the contact phone field. */
  contactPhone?: string | null;
  /** Logged-out visitor: fully fillable, but placing the order routes via sign-in. */
  isGuest?: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const backHref =
    role === "admin"
      ? "/admin/orders"
      : role === "employee"
        ? "/employee/orders"
        : "/customer/orders";
  const detailHref = (id: string) =>
    role === "admin"
      ? `/admin/orders/${id}`
      : role === "employee"
        ? `/employee/orders/${id}`
        : `/customer/orders/${id}`;

  const [step, setStep] = useState(1);

  // ----- Step 1: trip details -----
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [convId, setConvId] = useState(
    presetConversationId ?? conversations[0]?.id ?? ""
  );
  const [routeFrom, setRouteFrom] = useState(prefill?.from ?? "");
  const [routeTo, setRouteTo] = useState(prefill?.to ?? "");
  const [depart, setDepart] = useState(prefill?.depart ?? "");
  const [ret, setRet] = useState(prefill?.return ?? "");
  const [tripType, setTripType] = useState<TripType | null>(
    prefill?.tripType ?? null
  );
  const [cabin, setCabin] = useState<CabinClass | null>(prefill?.cabin ?? null);
  const [adults, setAdults] = useState(prefill?.adults ?? 1);
  const [children, setChildren] = useState(prefill?.children ?? 0);
  const [childAges, setChildAges] = useState<string[]>(
    Array.from({ length: prefill?.children ?? 0 }, () => "")
  );
  const [airline, setAirline] = useState(prefill?.airline ?? ANY_AIRLINE);

  // ----- Step 2: "already checked flights?" gate -----
  const [gateChoice, setGateChoice] = useState<"yes" | "no" | null>(null);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  // ----- Step 3: passengers, contact, extras -----
  const [pax, setPax] = useState<{ given: string; surname: string }[]>([]);
  const [phone, setPhone] = useState(contactPhone ?? "");
  const [meal, setMeal] = useState<string>(MEAL_PREFERENCES[0]);
  const [assistance, setAssistance] = useState("");
  const [wheelchair, setWheelchair] = useState(false);
  const [extraLuggage, setExtraLuggage] = useState(false);
  const [extraLuggageKg, setExtraLuggageKg] = useState("");
  const [extraNote, setExtraNote] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const hydratedRef = useRef(false);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === convId),
    [conversations, convId]
  );

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Restore a saved draft (customer flow only) — runs before the auto-save
  // effect below ever writes, so a fresh mount can't clobber a real draft.
  // localStorage is an external system that only exists client-side, so this
  // one-time hydration has to live in an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (role !== "customer") {
      hydratedRef.current = true;
      return;
    }
    const draft = readDraft();
    hydratedRef.current = true;
    if (!draft) return;

    setRouteFrom(draft.routeFrom);
    setRouteTo(draft.routeTo);
    setDepart(draft.depart);
    setRet(draft.ret);
    setTripType(draft.tripType);
    setCabin(draft.cabin);
    setAdults(draft.adults);
    setChildren(draft.children);
    setChildAges(draft.childAges);
    setAirline(draft.airline);
    setGateChoice(draft.gateChoice);
    setNote(draft.note);
    setAcknowledged(draft.acknowledged);
    setPax(draft.pax);
    setPhone((prev) => draft.phone || prev);
    setMeal(draft.meal);
    setAssistance(draft.assistance);
    setWheelchair(draft.wheelchair);
    setExtraLuggage(draft.extraLuggage);
    setExtraLuggageKg(draft.extraLuggageKg);
    setExtraNote(draft.extraNote);

    // Files can't survive a redirect. If the gate depended on them, land the
    // customer back on Step 2 to re-attach; otherwise resume where they left off.
    const filesWereTheGate =
      draft.gateChoice === "yes" && draft.fileCount > 0 && !draft.note.trim();
    const resumeStep = filesWereTheGate ? 2 : Math.min(Math.max(draft.step, 1), 3);
    setStep(resumeStep);

    toast.info("Welcome back — we saved your booking details.", {
      description:
        draft.fileCount > 0
          ? "Attachments can't be kept through sign-in, so please re-attach your files."
          : isGuest
            ? "Pick up where you left off."
            : "Review everything and place your order.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function saveDraftNow() {
    try {
      const draft: Draft = {
        savedAt: Date.now(),
        step,
        routeFrom,
        routeTo,
        depart,
        ret,
        tripType,
        cabin,
        adults,
        children,
        childAges,
        airline,
        gateChoice,
        note,
        acknowledged,
        fileCount: files.length,
        pax,
        phone,
        meal,
        assistance,
        wheelchair,
        extraLuggage,
        extraLuggageKg,
        extraNote,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // storage full/unavailable — the wizard still works, just without resume
    }
  }

  // Auto-save the draft (debounced) so a guest can sign in / sign up — or a
  // customer can navigate away — without losing what they've typed.
  useEffect(() => {
    if (role !== "customer" || busy) return;
    const t = setTimeout(() => {
      if (!hydratedRef.current) return;
      saveDraftNow();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveDraftNow reads the same fields listed below
  }, [
    role,
    busy,
    step,
    routeFrom,
    routeTo,
    depart,
    ret,
    tripType,
    cabin,
    adults,
    children,
    childAges,
    airline,
    gateChoice,
    note,
    acknowledged,
    files.length,
    pax,
    phone,
    meal,
    assistance,
    wheelchair,
    extraLuggage,
    extraLuggageKg,
    extraNote,
  ]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: File[] = [];
    for (const file of Array.from(list)) {
      const valid = validateAttachment(file);
      if (!valid.ok) {
        toast.error(`Couldn't add ${file.name}`, { description: valid.error });
        continue;
      }
      next.push(file);
    }
    if (next.length) setFiles((prev) => [...prev, ...next].slice(0, 8));
  }

  function setChildCount(n: number) {
    setChildren(n);
    setChildAges((prev) => {
      const copy = [...prev];
      copy.length = n;
      return Array.from(copy, (v) => v ?? "");
    });
  }

  // ----- Passenger slots: one row per traveller from Step 1's counts -----

  const paxSlots = useMemo(() => {
    const slots: { label: string; sub: string }[] = [];
    for (let i = 0; i < adults; i++) {
      slots.push({ label: `Adult ${i + 1}`, sub: "Aged 18+" });
    }
    for (let i = 0; i < children; i++) {
      const raw = (childAges[i] ?? "").trim();
      const n = Number(raw);
      const hasAge = raw !== "" && Number.isFinite(n);
      const asAdult = hasAge && n >= ADULT_AGE;
      slots.push({
        label: hasAge ? `Child ${i + 1} (age ${Math.floor(n)})` : `Child ${i + 1}`,
        sub: asAdult ? "18+ — books as an adult" : "Under 18",
      });
    }
    return slots;
  }, [adults, children, childAges]);

  const paxRows = useMemo(
    () =>
      paxSlots.map((slot, i) => ({
        ...slot,
        given: pax[i]?.given ?? "",
        surname: pax[i]?.surname ?? "",
      })),
    [paxSlots, pax]
  );

  function setPaxField(idx: number, key: "given" | "surname", value: string) {
    setPax((prev) => {
      const copy = Array.from({ length: Math.max(prev.length, idx + 1) }, (_, i) =>
        prev[i] ? { ...prev[i] } : { given: "", surname: "" }
      );
      copy[idx][key] = value;
      return copy;
    });
  }

  // ----- Per-step validation -----

  function validateStep1(): boolean {
    const next: Errors = {};

    if (role === "admin" && !customerId) next.target = "Choose a customer.";
    if (role === "employee") {
      if (!convId) next.target = "Choose a conversation.";
      else if (!selectedConversation?.customerId)
        next.target = "This conversation has no linked customer.";
    }

    if (!routeFrom.trim() || !routeTo.trim())
      next.route = "Both From and To are required.";
    if (!depart) next.depart = "A departure date is required.";
    if (ret && depart && ret < depart)
      next.return = "The return date can't be before departure.";
    if (!tripType) next.tripType = "Pick a trip type.";
    if (!cabin) next.cabin = "Pick a cabin class.";

    if (children > 0) {
      for (let i = 0; i < children; i++) {
        const raw = childAges[i];
        if (raw == null || raw.trim() === "") {
          next.childAges = "Enter an age for each child.";
          break;
        }
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 120) {
          next.childAges = "Enter a valid age (0–120) for each child.";
          break;
        }
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateStep2(): boolean {
    const next: Errors = {};
    if (!gateChoice) {
      next.gate = "Let us know either way — it only takes a second.";
    } else if (gateChoice === "yes" && !note.trim() && files.length === 0) {
      next.gate = "Add the flight details or attach a screenshot so we can match them.";
    } else if (gateChoice === "no" && !acknowledged) {
      next.gate = "Tick the box so we know to search from scratch for you.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateStep3(): boolean {
    const next: Errors = {};
    const incomplete = paxRows.some(
      (r) => !r.given.trim() || !r.surname.trim()
    );
    if (paxRows.length === 0) next.pax = "Add at least one traveller in step 1.";
    else if (incomplete)
      next.pax = "Enter a given name and surname for every passenger.";

    if (phone.trim() && phone.trim().replace(/[^\d]/g, "").length < 7)
      next.phone = "That phone number looks too short.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goToStep(n: number) {
    setErrors({});
    setStep(n);
    // Keep the wizard header in view when the step swaps.
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleNext() {
    const ok = step === 1 ? validateStep1() : step === 2 ? validateStep2() : true;
    if (!ok) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    goToStep(step + 1);
  }

  // ----- Submit -----

  function buildInput(): OrderFormInput | null {
    if (!validateStep3()) {
      toast.error("Please fix the highlighted fields.");
      return null;
    }
    // Steps 1–2 were validated on the way in, but re-check so a stale draft or
    // an edit-from-review can never slip an invalid order through.
    if (!validateStep1()) {
      toast.error("Something in your trip details needs a look.");
      goToStep(1);
      return null;
    }
    if (!validateStep2()) {
      toast.error("Please complete the flight-check step.");
      goToStep(2);
      return null;
    }

    const ages: number[] = [];
    for (let i = 0; i < children; i++) {
      const n = Number(childAges[i]);
      if (Number.isFinite(n)) ages.push(Math.floor(n));
    }

    const names = paxRows
      .map((r) => `${r.given} ${r.surname}`.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    return {
      passengerNames: names,
      routeFrom,
      routeTo,
      travelDate: depart || null,
      returnDate: ret || null,
      tripType: tripType!,
      cabinClass: cabin!,
      adults,
      children,
      childAges: ages,
      wheelchair,
      extraLuggage,
      extraLuggageKg: extraLuggage ? Number(extraLuggageKg) || null : null,
      customerNote: composeCustomerNote({
        gateNote: gateChoice === "yes" ? note : "",
        airline,
        mealPreference: meal,
        specialAssistance: assistance,
        contactPhone: role === "customer" ? phone : "",
        extraNote,
      }),
    };
  }

  async function placeOrder(
    input: OrderFormInput
  ): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
    if (role === "admin") {
      const res = await createOrder({ ...input, customerId });
      return res.ok
        ? { ok: true, orderId: res.data.orderId }
        : { ok: false, error: res.error };
    }
    if (role === "employee") {
      const res = await createOrderFromChat({
        ...input,
        conversationId: convId,
        customerId: selectedConversation!.customerId!,
      });
      return res.ok
        ? { ok: true, orderId: res.data.orderId }
        : { ok: false, error: res.error };
    }
    const res = await createCustomerOrder(input);
    return res.ok
      ? { ok: true, orderId: res.data.orderId }
      : { ok: false, error: res.error };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    if (step < 3) {
      handleNext();
      return;
    }

    const input = buildInput();
    if (!input) return;

    // Logged-out visitor: the wizard is fillable, but placing the order needs an
    // account. Flush the draft NOW (the debounced auto-save may not have fired
    // for the last keystroke), then route through SIGN-UP (most guests are new
    // customers — existing ones are one click from sign-in); the restore effect
    // brings them straight back to this review step.
    if (isGuest) {
      saveDraftNow();
      const redirect = encodeURIComponent(`${BOOK_PATH}?resume=1`);
      router.push(`/signup?redirect=${redirect}`);
      return;
    }

    setBusy(true);
    // Wrap the whole flow so a thrown server action / network error can never
    // leave the submit button stuck on "Placing order…" — busy is always reset
    // on any failure path (success navigates away, so it stays disabled there).
    let orderId: string;
    try {
      const created = await placeOrder(input);
      if (!created.ok) {
        setBusy(false);
        toast.error("Couldn't create the order", { description: created.error });
        return;
      }
      orderId = created.orderId;
    } catch (err) {
      setBusy(false);
      toast.error("Couldn't create the order", {
        description:
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
      return;
    }

    // Upload the flight-check attachments now that the order (and its
    // access-scoped storage path) exists, then record their reference rows.
    // A failure here must not strand the button: the order already exists, so we
    // warn and still route to it rather than leaving the customer stuck.
    if (gateChoice === "yes" && files.length > 0) {
      try {
        const recorded: RecordedAttachment[] = [];
        for (const file of files) {
          const up = await uploadOrderAttachment(file, orderId);
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
          await recordOrderAttachments({ orderId, attachments: recorded });
        }
        if (recorded.length < files.length) {
          toast.warning("Some attachments didn't upload", {
            description: "Your order was still created — you can re-share files in its chat.",
          });
        }
      } catch {
        toast.warning("Some attachments didn't upload", {
          description: "Your order was still created — you can re-share files in its chat.",
        });
      }
    }

    if (role === "customer") clearDraft();
    toast.success("Order created", {
      description: "We've opened its details below.",
    });
    // Full navigation, not router.push: a soft push straight after the server
    // action can stall (observed in prod build), stranding the button on
    // "Placing order…". A hard load always lands on the fresh order detail.
    window.location.assign(detailHref(orderId));
  }

  // ----- Copy -----

  const eyebrow = role === "customer" ? "New booking" : "New order";
  const title = role === "customer" ? "Book a Flight" : "Create an order";
  const subtitle =
    role === "customer"
      ? "Three quick steps — tell us your trip and our team will find you the best fare."
      : "Capture the trip, flight check and passenger details in three steps.";

  const travellerSummary = `${adults} adult${adults !== 1 ? "s" : ""}${
    children > 0 ? `, ${children} child${children !== 1 ? "ren" : ""}` : ""
  }`;

  const stepAnim =
    "space-y-5 animate-in fade-in slide-in-from-right-3 duration-300 motion-reduce:animate-none";

  return (
    <div
      ref={topRef}
      className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out motion-reduce:animate-none"
    >
      {!isGuest ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>
      ) : null}

      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

      <StepIndicator step={step} onJump={goToStep} />

      {/* Trip summary chip — keeps the essentials visible past Step 1 */}
      {step > 1 && routeFrom && routeTo ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-outline bg-chip/60 px-4 py-2.5 text-sm text-brand-dark animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Plane className="size-4 -rotate-45" />
            {routeFrom} → {routeTo}
          </span>
          <span aria-hidden className="hidden size-1 rounded-full bg-brand/40 sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {fmtDate(depart)}
            {ret ? ` – ${fmtDate(ret)}` : ""}
          </span>
          <span aria-hidden className="hidden size-1 rounded-full bg-brand/40 sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {travellerSummary}
          </span>
          {cabin ? (
            <>
              <span aria-hidden className="hidden size-1 rounded-full bg-brand/40 sm:block" />
              <span className="inline-flex items-center gap-1.5">
                <Armchair className="size-3.5" />
                {cabinLabel(cabin)}
              </span>
            </>
          ) : null}
          {airline !== ANY_AIRLINE ? (
            <>
              <span aria-hidden className="hidden size-1 rounded-full bg-brand/40 sm:block" />
              <span>{airline}</span>
            </>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        {/* ==================== STEP 1 — TRIP DETAILS ==================== */}
        {step === 1 ? (
          <div key="step-1" className={stepAnim} role="group" aria-label="Step 1: trip details">
            {role === "admin" ? (
              <SectionCard title="Customer">
                <div className="space-y-2">
                  <Label htmlFor="of-customer">{fieldLabel("Customer", true)}</Label>
                  <select
                    id="of-customer"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={busy || customers.length === 0}
                    className={selectClass}
                  >
                    {customers.length === 0 ? (
                      <option value="">No customers yet</option>
                    ) : (
                      <>
                        <option value="">— Select customer —</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <FieldError message={errors.target} />
                </div>
              </SectionCard>
            ) : null}

            {role === "employee" ? (
              <SectionCard title="Customer">
                <div className="space-y-2">
                  <Label htmlFor="of-conv">{fieldLabel("Conversation", true)}</Label>
                  {presetConversationId ? (
                    <p className="rounded-[10px] border border-border bg-neutral-soft px-3 py-2.5 text-sm font-medium text-foreground">
                      {selectedConversation?.label ?? "Selected conversation"}
                    </p>
                  ) : (
                    <select
                      id="of-conv"
                      value={convId}
                      onChange={(e) => setConvId(e.target.value)}
                      disabled={busy || conversations.length === 0}
                      className={selectClass}
                    >
                      {conversations.length === 0 ? (
                        <option value="">No assigned conversations</option>
                      ) : (
                        conversations.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                  <FieldError message={errors.target} />
                </div>
              </SectionCard>
            ) : null}

            {/* Route + dates */}
            <SectionCard
              title="Where & when"
              description="Just like a flight search — we'll take the details from here."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="of-from">{fieldLabel("From", true)}</Label>
                  <div className="relative">
                    <PlaneTakeoff className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="of-from"
                      value={routeFrom}
                      onChange={(e) => setRouteFrom(e.target.value)}
                      placeholder="London (LHR)"
                      disabled={busy}
                      className="h-11 rounded-[10px] bg-neutral-soft pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="of-to">{fieldLabel("To", true)}</Label>
                  <div className="relative">
                    <PlaneLanding className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="of-to"
                      value={routeTo}
                      onChange={(e) => setRouteTo(e.target.value)}
                      placeholder="Dubai (DXB)"
                      disabled={busy}
                      className="h-11 rounded-[10px] bg-neutral-soft pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="of-depart">{fieldLabel("Departure date", true)}</Label>
                  <Input
                    id="of-depart"
                    type="date"
                    min={todayISO}
                    value={depart}
                    onChange={(e) => setDepart(e.target.value)}
                    disabled={busy}
                    className="h-11 rounded-[10px] bg-neutral-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="of-return">
                    {fieldLabel("Return date")}
                    <span className="ml-1 normal-case text-[11px] tracking-normal text-muted-foreground">
                      (if applicable)
                    </span>
                  </Label>
                  <Input
                    id="of-return"
                    type="date"
                    min={depart || todayISO}
                    value={ret}
                    onChange={(e) => setRet(e.target.value)}
                    disabled={busy}
                    className="h-11 rounded-[10px] bg-neutral-soft"
                  />
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <FieldError message={errors.route} />
                <FieldError message={errors.depart} />
                <FieldError message={errors.return} />
              </div>
            </SectionCard>

            {/* Trip type + cabin + airline */}
            <SectionCard title="Flight preferences">
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <Label>{fieldLabel("Trip type", true)}</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {TRIP_TYPES.map((t) => {
                      const active = tripType === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setTripType(t.value)}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-brand/25",
                            active
                              ? "border-brand bg-chip/60 shadow-sm"
                              : "border-border bg-neutral-soft hover:border-brand/40"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-9 items-center justify-center rounded-lg transition-colors",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-white text-muted-foreground"
                            )}
                          >
                            <Plane className="size-4 -rotate-45" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">
                              {t.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {t.hint}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "ml-auto flex size-5 items-center justify-center rounded-full border transition-colors",
                              active
                                ? "border-brand bg-brand text-white"
                                : "border-border bg-white"
                            )}
                          >
                            {active ? <CheckCircle2 className="size-4" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FieldError message={errors.tripType} />
                </div>

                <div className="space-y-2.5">
                  <Label>{fieldLabel("Cabin class", true)}</Label>
                  <div className="flex flex-wrap gap-2">
                    {CABIN_CLASSES.map((c) => {
                      const active = cabin === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setCabin(c.value)}
                          className={cn(
                            "min-h-11 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-brand/25",
                            active
                              ? "border-brand bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-neutral-soft text-muted-foreground hover:border-brand/40 hover:text-foreground"
                          )}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError message={errors.cabin} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="of-airline">{fieldLabel("Preferred airline")}</Label>
                  <select
                    id="of-airline"
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                    disabled={busy}
                    className={selectClass}
                  >
                    {AIRLINES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Optional — leave on “{ANY_AIRLINE}” and we&apos;ll compare them all.
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Travellers */}
            <SectionCard
              title="Travellers"
              description="Children aged 18 or over are counted as adults automatically."
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Users className="size-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Adults</p>
                      <p className="text-xs text-muted-foreground">Aged 18+</p>
                    </div>
                  </div>
                  <Stepper value={adults} onChange={setAdults} min={1} max={9} disabled={busy} label="adults" />
                </div>

                <div className="flex items-center justify-between border-t border-border pt-5">
                  <div className="flex items-center gap-2.5">
                    <Users className="size-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Children</p>
                      <p className="text-xs text-muted-foreground">Under 18</p>
                    </div>
                  </div>
                  <Stepper
                    value={children}
                    onChange={setChildCount}
                    min={0}
                    max={8}
                    disabled={busy}
                    label="children"
                  />
                </div>

                {children > 0 ? (
                  <div className="space-y-3 border-t border-border pt-5 animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none">
                    <Label>{fieldLabel("Age of each child", true)}</Label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {Array.from({ length: children }).map((_, i) => {
                        const raw = childAges[i] ?? "";
                        const n = Number(raw);
                        const isAdultAge =
                          raw.trim() !== "" && Number.isFinite(n) && n >= ADULT_AGE;
                        return (
                          <div key={i} className="space-y-1">
                            <Input
                              type="number"
                              min={0}
                              max={120}
                              inputMode="numeric"
                              aria-label={`Age of child ${i + 1}`}
                              value={raw}
                              onChange={(e) =>
                                setChildAges((prev) => {
                                  const copy = [...prev];
                                  copy[i] = e.target.value;
                                  return copy;
                                })
                              }
                              placeholder={`Child ${i + 1}`}
                              disabled={busy}
                              className="h-11 rounded-[10px] bg-neutral-soft"
                            />
                            {isAdultAge ? (
                              <p className="text-[11px] font-medium text-amber-600">
                                18+ → counted as an adult
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <FieldError message={errors.childAges} />
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {/* ==================== STEP 2 — FLIGHT CHECK ==================== */}
        {step === 2 ? (
          <div key="step-2" className={stepAnim} role="group" aria-label="Step 2: flight check">
            <SectionCard>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chip text-brand-dark">
                  <ShieldCheck className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-base font-semibold text-navy">
                    Have you already checked specific flights?
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    This helps us find your exact deal faster. If you&apos;ve
                    spotted flights, dates or fares anywhere, share them and
                    we&apos;ll match or beat them — if not, we&apos;ll search
                    from scratch for you.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      value: "yes",
                      icon: Search,
                      label: "Yes, I've checked flights",
                      hint: "I can share details or screenshots",
                    },
                    {
                      value: "no",
                      icon: Sparkles,
                      label: "Not yet — find me the best",
                      hint: "Search from scratch for my trip",
                    },
                  ] as const
                ).map((opt) => {
                  const active = gateChoice === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGateChoice(opt.value)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-brand/25",
                        active
                          ? "border-brand bg-chip/60 shadow-sm"
                          : "border-border bg-neutral-soft hover:border-brand/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-white text-muted-foreground"
                        )}
                      >
                        <opt.icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">
                          {opt.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {opt.hint}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                          active ? "border-brand bg-brand text-white" : "border-border bg-white"
                        )}
                      >
                        {active ? <CheckCircle2 className="size-4" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {gateChoice === "yes" ? (
                <div className="mt-5 space-y-4 border-t border-border pt-5 animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none">
                  <div className="space-y-2">
                    <Label htmlFor="gate-note">
                      {fieldLabel("Flight details or notes")}
                    </Label>
                    <Textarea
                      id="gate-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. BA107 LHR→DXB on 12 Aug, ~£540 return seen on Skyscanner…"
                      rows={4}
                      className="rounded-[10px] bg-neutral-soft"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{fieldLabel("Screenshots or files")}</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ATTACHMENT_ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-border bg-neutral-soft px-4 py-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:border-brand hover:text-brand focus-visible:ring-[3px] focus-visible:ring-brand/25"
                    >
                      <Paperclip className="size-4" />
                      Attach PNG, JPG or PDF (max 10MB each)
                    </button>

                    {files.length > 0 ? (
                      <ul className="space-y-2">
                        {files.map((file, i) => (
                          <li
                            key={`${file.name}-${i}`}
                            className="flex items-center gap-2.5 rounded-[10px] border border-border bg-card px-3 py-2 text-sm animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
                          >
                            <FileText className="size-4 shrink-0 text-brand" />
                            <span className="min-w-0 flex-1 truncate text-foreground">
                              {file.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(0)} KB
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setFiles((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="size-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {gateChoice === "no" ? (
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[10px] border border-border bg-neutral-soft px-4 py-3 animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none">
                  <Switch
                    checked={acknowledged}
                    onCheckedChange={(v: boolean) => setAcknowledged(v)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-foreground">
                    I don&apos;t have specific flights yet — please find the best
                    options for my trip.
                  </span>
                </label>
              ) : null}

              <div className="mt-3">
                <FieldError message={errors.gate} />
              </div>
            </SectionCard>
          </div>
        ) : null}

        {/* ============ STEP 3 — PASSENGERS, EXTRAS & REVIEW ============ */}
        {step === 3 ? (
          <div key="step-3" className={stepAnim} role="group" aria-label="Step 3: passengers and review">
            <SectionCard
              title="Passenger names"
              description="Exactly as they appear on each passport — airlines are strict about this."
            >
              <div className="space-y-4">
                {paxRows.map((row, i) => (
                  <div
                    key={i}
                    className="rounded-[12px] border border-border bg-neutral-soft p-3.5 sm:p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-chip text-xs font-semibold text-brand-dark">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {row.label}
                      </span>
                      <span className="text-xs text-muted-foreground">· {row.sub}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`pax-given-${i}`}>
                          {fieldLabel("Given name(s)", true)}
                        </Label>
                        <Input
                          id={`pax-given-${i}`}
                          value={row.given}
                          onChange={(e) => setPaxField(i, "given", e.target.value)}
                          placeholder="e.g. Jane Ann"
                          autoComplete="off"
                          disabled={busy}
                          className="h-11 rounded-[10px] bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`pax-surname-${i}`}>
                          {fieldLabel("Surname", true)}
                        </Label>
                        <Input
                          id={`pax-surname-${i}`}
                          value={row.surname}
                          onChange={(e) => setPaxField(i, "surname", e.target.value)}
                          placeholder="e.g. Smith"
                          autoComplete="off"
                          disabled={busy}
                          className="h-11 rounded-[10px] bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <FieldError message={errors.pax} />
                <p className="text-xs text-muted-foreground">
                  Need a different number of travellers?{" "}
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="cursor-pointer font-medium text-brand underline-offset-2 hover:underline"
                  >
                    Edit step 1
                  </button>
                  .
                </p>
              </div>
            </SectionCard>

            {role === "customer" ? (
              <SectionCard
                title="Contact details"
                description="So our team can reach you about fares and ticket confirmations."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{fieldLabel("Email")}</Label>
                    {contactEmail ? (
                      <p className="flex h-11 items-center gap-2 truncate rounded-[10px] border border-border bg-neutral-soft px-3 text-sm font-medium text-foreground">
                        <Mail className="size-4 shrink-0 text-slate-400" />
                        <span className="truncate">{contactEmail}</span>
                      </p>
                    ) : (
                      <p className="flex min-h-11 items-center gap-2 rounded-[10px] border border-border bg-neutral-soft px-3 py-2 text-sm text-muted-foreground">
                        <LogIn className="size-4 shrink-0 text-slate-400" />
                        From your account once you sign in
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="of-phone">{fieldLabel("Phone number")}</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="of-phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +44 7700 900123"
                        disabled={busy}
                        className="h-11 rounded-[10px] bg-neutral-soft pl-9"
                      />
                    </div>
                    <FieldError message={errors.phone} />
                  </div>
                </div>
              </SectionCard>
            ) : null}

            <SectionCard title="Extras" description="Optional — tick anything you need.">
              <div className="space-y-1">
                <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[10px] px-1 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <Accessibility className="size-4 text-slate-400" />
                    <span className="text-sm font-medium text-foreground">
                      Wheelchair assistance
                    </span>
                  </span>
                  <Switch
                    checked={wheelchair}
                    onCheckedChange={(v: boolean) => setWheelchair(v)}
                  />
                </label>

                <div className="border-t border-border pt-1">
                  <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[10px] px-1 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Luggage className="size-4 text-slate-400" />
                      <span className="text-sm font-medium text-foreground">
                        Extra luggage
                      </span>
                    </span>
                    <Switch
                      checked={extraLuggage}
                      onCheckedChange={(v: boolean) => {
                        setExtraLuggage(v);
                        if (!v) setExtraLuggageKg("");
                      }}
                    />
                  </label>
                  {extraLuggage ? (
                    <div className="ml-7 max-w-xs space-y-2 pb-2 animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none">
                      <Label htmlFor="of-kg">{fieldLabel("Extra weight (kg)")}</Label>
                      <Input
                        id="of-kg"
                        type="number"
                        min={0}
                        max={200}
                        inputMode="numeric"
                        value={extraLuggageKg}
                        onChange={(e) => setExtraLuggageKg(e.target.value)}
                        placeholder="e.g. 23"
                        disabled={busy}
                        className="h-11 rounded-[10px] bg-neutral-soft"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2 border-t border-border pt-3.5">
                  <Label htmlFor="of-meal">
                    <span className="flex items-center gap-2.5">
                      <UtensilsCrossed className="size-4 text-slate-400" />
                      {fieldLabel("Meal preference")}
                    </span>
                  </Label>
                  <select
                    id="of-meal"
                    value={meal}
                    onChange={(e) => setMeal(e.target.value)}
                    disabled={busy}
                    className={selectClass}
                  >
                    {MEAL_PREFERENCES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 border-t border-border pt-3.5">
                  <Label htmlFor="of-assist">
                    <span className="flex items-center gap-2.5">
                      <UserRound className="size-4 text-slate-400" />
                      {fieldLabel("Special assistance")}
                    </span>
                  </Label>
                  <Input
                    id="of-assist"
                    value={assistance}
                    onChange={(e) => setAssistance(e.target.value)}
                    placeholder="e.g. travelling with an infant, mobility help at the gate…"
                    disabled={busy}
                    className="h-11 rounded-[10px] bg-neutral-soft"
                  />
                </div>

                <div className="space-y-2 border-t border-border pt-3.5">
                  <Label htmlFor="of-extra-note">
                    <span className="flex items-center gap-2.5">
                      <StickyNote className="size-4 text-slate-400" />
                      {fieldLabel("Anything else?")}
                    </span>
                  </Label>
                  <Textarea
                    id="of-extra-note"
                    value={extraNote}
                    onChange={(e) => setExtraNote(e.target.value)}
                    placeholder="Flexible on dates, budget in mind, a stopover you'd love…"
                    rows={3}
                    disabled={busy}
                    className="rounded-[10px] bg-neutral-soft"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Review */}
            <SectionCard
              title="Review your booking"
              description="A quick check before we get to work."
            >
              <div className="divide-y divide-border">
                <ReviewRow
                  label="Trip"
                  onEdit={() => goToStep(1)}
                  value={
                    <>
                      <span className="font-semibold">
                        {routeFrom || "—"} → {routeTo || "—"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {fmtDate(depart)}
                        {ret ? ` – ${fmtDate(ret)}` : " · one-way"} ·{" "}
                        {tripTypeLabel(tripType)} · {cabinLabel(cabin)}
                      </span>
                    </>
                  }
                />
                <ReviewRow
                  label="Travellers"
                  onEdit={() => goToStep(1)}
                  value={
                    <>
                      <span className="font-semibold">{travellerSummary}</span>
                      {children > 0 ? (
                        <span className="block text-xs text-muted-foreground">
                          Child ages:{" "}
                          {childAges
                            .slice(0, children)
                            .map((a) => a || "?")
                            .join(", ")}
                        </span>
                      ) : null}
                    </>
                  }
                />
                <ReviewRow
                  label="Airline"
                  onEdit={() => goToStep(1)}
                  value={<span className="font-semibold">{airline}</span>}
                />
                <ReviewRow
                  label="Flight check"
                  onEdit={() => goToStep(2)}
                  value={
                    gateChoice === "yes" ? (
                      <>
                        <span className="font-semibold">Flights shared</span>
                        <span className="block text-xs text-muted-foreground">
                          {note.trim() ? "Notes added" : "No notes"}
                          {files.length > 0
                            ? ` · ${files.length} file${files.length !== 1 ? "s" : ""}`
                            : ""}
                        </span>
                      </>
                    ) : gateChoice === "no" ? (
                      <span className="font-semibold">
                        Find the best options for me
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not answered yet</span>
                    )
                  }
                />
                <ReviewRow
                  label="Passengers"
                  value={
                    paxRows.every((r) => r.given.trim() && r.surname.trim()) &&
                    paxRows.length > 0 ? (
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {paxRows.map((r, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-full bg-chip px-2.5 py-0.5 text-xs font-medium text-brand-dark"
                          >
                            {r.given.trim()} {r.surname.trim()}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Complete the names above
                      </span>
                    )
                  }
                />
                {wheelchair || extraLuggage || meal !== MEAL_PREFERENCES[0] || assistance.trim() ? (
                  <ReviewRow
                    label="Extras"
                    value={
                      <span className="text-sm">
                        {[
                          wheelchair ? "Wheelchair assistance" : null,
                          extraLuggage
                            ? `Extra luggage${extraLuggageKg ? ` (${extraLuggageKg} kg)` : ""}`
                            : null,
                          meal !== MEAL_PREFERENCES[0] ? `${meal} meal` : null,
                          assistance.trim() ? "Special assistance" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    }
                  />
                ) : null}
              </div>

              {isGuest ? (
                <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-outline bg-chip/60 px-3.5 py-3 text-sm text-brand-dark">
                  <LogIn className="mt-0.5 size-4 shrink-0" />
                  <span>
                    You&apos;ll create a free account (or sign in) to place this
                    order — everything you&apos;ve entered here is kept for you.
                  </span>
                </div>
              ) : null}
            </SectionCard>
          </div>
        ) : null}

        {/* ==================== NAVIGATION ==================== */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep(step - 1)}
              disabled={busy}
              className="h-11 rounded-[10px] px-5"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}

          {step < 3 ? (
            <Button
              type="submit"
              className="h-11 rounded-[10px] px-6 sm:min-w-40"
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={busy}
              className="h-11 rounded-[10px] px-6 sm:min-w-48"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Placing order…
                </>
              ) : isGuest ? (
                <>
                  <LogIn className="size-4" />
                  Sign up & Place Order
                </>
              ) : (
                <>
                  {role === "customer" ? "Place Order" : "Create order"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground sm:text-right">
          {step === 1
            ? "Step 1 of 3 — the quick bit."
            : step === 2
              ? "Step 2 of 3 — this helps us find your exact deal faster."
              : "Step 3 of 3 — no payment is taken; our team replies with a quote."}
        </p>
      </form>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="flex shrink-0 items-center gap-2 pt-0.5 text-sm text-muted-foreground">
        {label}
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${label.toLowerCase()}`}
            className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-muted hover:text-brand"
          >
            <Pencil className="size-3.5" />
          </button>
        ) : null}
      </span>
      <span className="min-w-0 text-right text-sm text-foreground">{value}</span>
    </div>
  );
}
