"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plane,
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
  Users,
  Trash2,
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
  type OrderFormInput,
} from "@/lib/orders/form";
import type { TripType, CabinClass } from "@/lib/db/types";
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
    <p className="text-xs font-medium text-rose-600 animate-in fade-in slide-in-from-top-1">
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
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="flex size-9 items-center justify-center rounded-lg border border-border bg-white text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center font-display text-base font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="flex size-9 items-center justify-center rounded-lg border border-border bg-white text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

type Errors = Partial<
  Record<
    | "target"
    | "passengers"
    | "route"
    | "depart"
    | "tripType"
    | "cabin"
    | "childAges",
    string
  >
>;

export function OrderForm({
  role,
  customers = [],
  conversations = [],
  presetConversationId,
}: {
  role: OrderFormRole;
  customers?: OrderFormCustomer[];
  conversations?: OrderFormConversation[];
  presetConversationId?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ----- Step 1: pre-order gate -----
  const [step, setStep] = useState<"gate" | "details">("gate");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const gateEngaged = note.trim().length > 0 || files.length > 0 || acknowledged;

  // ----- Step 2: order details -----
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [convId, setConvId] = useState(
    presetConversationId ?? conversations[0]?.id ?? ""
  );
  const [passengerNames, setPassengerNames] = useState<string[]>([""]);
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [depart, setDepart] = useState("");
  const [ret, setRet] = useState("");
  const [tripType, setTripType] = useState<TripType | null>(null);
  const [cabin, setCabin] = useState<CabinClass | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState<string[]>([]);
  const [wheelchair, setWheelchair] = useState(false);
  const [extraLuggage, setExtraLuggage] = useState(false);
  const [extraLuggageKg, setExtraLuggageKg] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === convId),
    [conversations, convId]
  );

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

  function setPassengerName(idx: number, value: string) {
    setPassengerNames((prev) => prev.map((p, i) => (i === idx ? value : p)));
  }

  function validate(): OrderFormInput | null {
    const next: Errors = {};

    if (role === "admin" && !customerId) next.target = "Choose a customer.";
    if (role === "employee") {
      if (!convId) next.target = "Choose a conversation.";
      else if (!selectedConversation?.customerId)
        next.target = "This conversation has no linked customer.";
    }

    const cleanNames = passengerNames.map((p) => p.trim()).filter(Boolean);
    if (cleanNames.length === 0)
      next.passengers = "Add at least one passenger name.";
    if (!routeFrom.trim() || !routeTo.trim())
      next.route = "Both From and To are required.";
    if (!depart) next.depart = "A departure date is required.";
    if (!tripType) next.tripType = "Pick a trip type.";
    if (!cabin) next.cabin = "Pick a cabin class.";

    const ages: number[] = [];
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
        ages.push(Math.floor(n));
      }
    }

    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return null;
    }

    return {
      passengerNames: cleanNames,
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
      customerNote: note.trim() || null,
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
    const input = validate();
    if (!input) return;

    setBusy(true);
    // Wrap the whole flow so a thrown server action / network error can never
    // leave the submit button stuck on "Creating order…" — busy is always reset
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

    // Upload the pre-order note's attachments now that the order (and its
    // access-scoped storage path) exists, then record their reference rows.
    // A failure here must not strand the button: the order already exists, so we
    // warn and still route to it rather than leaving the customer stuck.
    if (files.length > 0) {
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

    toast.success("Order created", {
      description: "We've opened its details below.",
    });
    router.push(detailHref(orderId));
    router.refresh();
  }

  const eyebrow =
    role === "customer" ? "New booking" : "New order";
  const title =
    role === "customer" ? "Book a Flight" : "Create an order";
  const subtitle =
    role === "customer"
      ? "Tell us your trip and our team will find you the best fare."
      : "Capture the full trip and passenger details for this booking.";

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
      >
        <ArrowLeft className="size-4" />
        Back to orders
      </Link>

      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[
          { key: "gate", label: "Before we start" },
          { key: "details", label: "Trip details" },
        ].map((s, i) => {
          const activeIdx = step === "gate" ? 0 : 1;
          const done = i < activeIdx;
          const current = i === activeIdx;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    current
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <CheckCircle2 className="size-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    current ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i === 0 ? (
                <span className="hidden h-px w-10 bg-border sm:block" />
              ) : null}
            </div>
          );
        })}
      </div>

      {step === "gate" ? (
        <div
          key="gate"
          className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300"
        >
          <SectionCard>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chip text-brand-dark">
                <ShieldCheck className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-semibold text-navy">
                  Already checked some flights?
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  If you&apos;ve already found specific flights, dates or fares,
                  share the details (and any screenshots) below so we don&apos;t
                  waste your time re-searching. If not, just acknowledge and
                  continue — we&apos;ll take it from your trip details.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
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

              {/* Attachments */}
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
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-border bg-neutral-soft px-4 py-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:border-brand hover:text-brand focus-visible:ring-[3px] focus-visible:ring-brand/25"
                >
                  <Paperclip className="size-4" />
                  Attach PNG, JPG or PDF (max 10MB each)
                </button>

                {files.length > 0 ? (
                  <ul className="space-y-2">
                    {files.map((file, i) => (
                      <li
                        key={`${file.name}-${i}`}
                        className="flex items-center gap-2.5 rounded-[10px] border border-border bg-card px-3 py-2 text-sm animate-in fade-in slide-in-from-bottom-1"
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
                          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {/* Acknowledge */}
              <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border bg-neutral-soft px-4 py-3">
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
            </div>
          </SectionCard>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {gateEngaged
                ? "Great — let's get your trip details."
                : "Add a note, attach a file, or acknowledge to continue."}
            </p>
            <Button
              type="button"
              disabled={!gateEngaged}
              onClick={() => setStep("details")}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <form
          key="details"
          onSubmit={handleSubmit}
          className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300"
        >
          {/* Who is this for (staff only) */}
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

          {/* Passengers */}
          <SectionCard
            title="Passengers"
            description="Add a name for each traveller, exactly as on their passport."
          >
            <div className="space-y-3">
              {passengerNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chip text-xs font-semibold text-brand-dark">
                    {i + 1}
                  </div>
                  <Input
                    value={name}
                    onChange={(e) => setPassengerName(i, e.target.value)}
                    placeholder="e.g. Jane A. Smith"
                    disabled={busy}
                    className="h-11 rounded-[10px] bg-neutral-soft"
                  />
                  {passengerNames.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPassengerNames((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }
                      className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600"
                      aria-label={`Remove passenger ${i + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || passengerNames.length >= 20}
                onClick={() => setPassengerNames((prev) => [...prev, ""])}
              >
                <Plus className="size-4" />
                Add passenger
              </Button>
              <FieldError message={errors.passengers} />
            </div>
          </SectionCard>

          {/* Route + dates */}
          <SectionCard title="Route & dates">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="of-from">{fieldLabel("From", true)}</Label>
                <Input
                  id="of-from"
                  value={routeFrom}
                  onChange={(e) => setRouteFrom(e.target.value)}
                  placeholder="London (LHR)"
                  disabled={busy}
                  className="h-11 rounded-[10px] bg-neutral-soft"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="of-to">{fieldLabel("To", true)}</Label>
                <Input
                  id="of-to"
                  value={routeTo}
                  onChange={(e) => setRouteTo(e.target.value)}
                  placeholder="Dubai (DXB)"
                  disabled={busy}
                  className="h-11 rounded-[10px] bg-neutral-soft"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="of-depart">{fieldLabel("Departure date", true)}</Label>
                <Input
                  id="of-depart"
                  type="date"
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
            </div>
          </SectionCard>

          {/* Trip type + cabin */}
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
                          "flex items-center gap-3 rounded-[12px] border px-4 py-3 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-brand/25",
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
                          "rounded-full border px-4 py-2 text-sm font-medium outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-brand/25",
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
            </div>
          </SectionCard>

          {/* Party size */}
          <SectionCard
            title="Party size"
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
                <Stepper value={adults} onChange={setAdults} min={1} disabled={busy} />
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
                  disabled={busy}
                />
              </div>

              {children > 0 ? (
                <div className="space-y-3 border-t border-border pt-5 animate-in fade-in slide-in-from-top-1">
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

          {/* Extras */}
          <SectionCard title="Extras" description="Optional — tick anything you need.">
            <div className="space-y-1">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] px-1 py-2.5">
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
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] px-1 py-2.5">
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
                  <div className="ml-7 max-w-xs space-y-2 pb-2 pl-0 animate-in fade-in slide-in-from-top-1">
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
            </div>
          </SectionCard>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("gate")}
              disabled={busy}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button type="submit" disabled={busy} className="sm:min-w-44">
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating order…
                </>
              ) : (
                <>
                  {role === "customer" ? "Request Quote" : "Create order"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
