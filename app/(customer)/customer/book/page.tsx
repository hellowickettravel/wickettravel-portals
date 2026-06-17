"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plane,
  Minus,
  Plus,
  ArrowRight,
  Calendar,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createQuoteRequest } from "@/lib/actions/customer";
import { CUSTOMER_ORDERS_KEY } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type TripType = "One-way" | "Return";
type Cabin = "Economy" | "Business";

function fieldLabel(text: string) {
  return (
    <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
      {text}
    </span>
  );
}

function Stepper({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-9 items-center justify-center rounded-lg border border-border bg-white text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        disabled={value <= min}
      >
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center font-display text-base font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex size-9 items-center justify-center rounded-lg border border-border bg-white text-foreground transition-colors hover:bg-muted"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export default function BookFlightPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tripType, setTripType] = useState<TripType>("Return");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [depart, setDepart] = useState("");
  const [ret, setRet] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [cabin, setCabin] = useState<Cabin>("Economy");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pax = adults + children;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!from.trim() || !to.trim() || !depart) {
      toast.error("Missing details", {
        description: "Please add where you're flying from, to, and your departure date.",
      });
      return;
    }

    // Cabin/trip type aren't dedicated columns — fold them into notes so the
    // team sees the full request.
    const summary = [
      `${tripType}, ${cabin}`,
      `${adults} adult${adults !== 1 ? "s" : ""}${
        children ? `, ${children} child${children !== 1 ? "ren" : ""}` : ""
      }`,
      notes.trim(),
    ]
      .filter(Boolean)
      .join(" · ");

    setSubmitting(true);
    const res = await createQuoteRequest({
      routeFrom: from,
      routeTo: to,
      travelDate: depart || null,
      returnDate: tripType === "Return" ? ret || null : null,
      passengers: pax,
      notes: summary,
    });
    setSubmitting(false);

    if (!res.ok) {
      toast.error("Couldn't send request", { description: res.error });
      return;
    }

    queryClient.invalidateQueries({ queryKey: CUSTOMER_ORDERS_KEY });
    toast.success("Quote requested", {
      description: "Our team will reply with fares. You can track it in My Orders.",
    });
    router.push("/customer/orders");
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="New booking"
        title="Book a Flight"
        subtitle="Tell us your trip and we'll find you the best fare."
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Form */}
        <div className="space-y-5 lg:col-span-2">
          <SectionCard title="Trip details">
            {/* Trip type */}
            <div className="mb-5 inline-flex rounded-xl bg-muted p-1">
              {(["Return", "One-way"] as TripType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTripType(t)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                    tripType === t
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from">{fieldLabel("From")}</Label>
                <Input id="from" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="London (LHR)" className="h-11 rounded-[10px] bg-neutral-soft" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">{fieldLabel("To")}</Label>
                <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Dubai (DXB)" className="h-11 rounded-[10px] bg-neutral-soft" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depart">{fieldLabel("Departure date")}</Label>
                <Input id="depart" type="date" value={depart} onChange={(e) => setDepart(e.target.value)} className="h-11 rounded-[10px] bg-neutral-soft" />
              </div>
              {tripType === "Return" ? (
                <div className="space-y-2">
                  <Label htmlFor="return">{fieldLabel("Return date")}</Label>
                  <Input id="return" type="date" value={ret} onChange={(e) => setRet(e.target.value)} className="h-11 rounded-[10px] bg-neutral-soft" />
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Passengers & cabin">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Adults</p>
                  <p className="text-xs text-muted-foreground">Aged 12+</p>
                </div>
                <Stepper value={adults} onChange={setAdults} min={1} />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-5">
                <div>
                  <p className="text-sm font-medium text-foreground">Children</p>
                  <p className="text-xs text-muted-foreground">Aged 2–11</p>
                </div>
                <Stepper value={children} onChange={setChildren} min={0} />
              </div>
              <div className="border-t border-border pt-5">
                <p className="mb-2.5 text-sm font-medium text-foreground">Cabin class</p>
                <div className="inline-flex rounded-xl bg-muted p-1">
                  {(["Economy", "Business"] as Cabin[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCabin(c)}
                      className={cn(
                        "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                        cabin === c
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Anything else?" description="Optional — special requests, baggage, seats…">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. window seats, extra baggage, flexible by a day or two…"
              className="min-h-24 rounded-[10px] bg-neutral-soft"
            />
          </SectionCard>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-brand">
              <Sparkles className="size-4" />
              <span className="font-label text-xs font-semibold uppercase tracking-wider">
                Your request
              </span>
            </div>

            <div className="flex items-center gap-2 font-display text-lg font-semibold text-navy">
              <span>{from.trim() || "From"}</span>
              <Plane className="size-4 -rotate-45 text-brand" />
              <span>{to.trim() || "To"}</span>
            </div>

            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5 text-muted-foreground">
                <Plane className="size-4 text-slate-400" />
                {tripType}
              </li>
              <li className="flex items-center gap-2.5 text-muted-foreground">
                <Calendar className="size-4 text-slate-400" />
                {depart || "Departure —"}
                {tripType === "Return" ? ` → ${ret || "Return —"}` : ""}
              </li>
              <li className="flex items-center gap-2.5 text-muted-foreground">
                <Users className="size-4 text-slate-400" />
                {pax} passenger{pax !== 1 ? "s" : ""} · {cabin}
              </li>
            </ul>

            <Button type="submit" disabled={submitting} className="h-11 w-full rounded-[10px]">
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  Request Quote
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No payment now — we&apos;ll reply with fares.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
