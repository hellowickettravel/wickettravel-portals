"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Car,
  Plane,
  FileText,
  Upload,
  Check,
  Loader2,
  CircleCheck,
  Clock3,
  ShieldCheck,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AIRPORTS, type Airport, type VehicleType } from "@/lib/driver/mock";
import { cn } from "@/lib/utils";

const VEHICLE_TYPES: VehicleType[] = ["Sedan", "SUV", "Tempo Traveller"];

const DOCS = [
  { key: "licence", label: "Driving Licence" },
  { key: "rc", label: "Vehicle Registration (RC)" },
  { key: "insurance", label: "Insurance Certificate" },
  { key: "id", label: "ID Photo (Aadhaar/PAN)" },
] as const;

export default function DriverApplyPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [vehicleType, setVehicleType] = useState<VehicleType>("SUV");
  const [airports, setAirports] = useState<Airport["code"][]>(["HYD"]);
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [applicantName, setApplicantName] = useState("");

  function toggleAirport(code: Airport["code"]) {
    setAirports((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function handleUpload(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setUploaded((u) => ({ ...u, [key]: file.name }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // UI only — no real submission. Show the pending-approval confirmation.
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 800);
  }

  if (submitted) {
    return <SubmittedState name={applicantName} onLogin={() => router.push("/driver/login")} />;
  }

  return (
    <main className="min-h-dvh bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <Link href="/driver/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back to sign in</span>
          <span className="sm:hidden">Back</span>
        </Link>
        <BrandLogo className="h-6 w-auto" priority />
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
          {/* Intro */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-chip bg-marine-tint px-2.5 py-1 text-xs font-medium text-marine">
              <Car className="size-3.5" />
              Become a Partner
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-tx-head sm:text-3xl">
              Drive with Wicket Travel
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tell us about you and your vehicle. Our team reviews every
              application — once approved, you can start accepting airport rides.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal details */}
            <FormSection icon={User} title="Personal details" step={1}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="name" required>
                  <Input
                    id="name"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                  />
                </Field>
                <Field label="Phone number" htmlFor="phone" required>
                  <Input id="phone" type="tel" inputMode="tel" required placeholder="+91 98765 43210" />
                </Field>
                <Field label="Email" htmlFor="email" required>
                  <Input id="email" type="email" required placeholder="you@example.in" />
                </Field>
                <Field label="City" htmlFor="city" required>
                  <Input id="city" required placeholder="e.g. Hyderabad" />
                </Field>
              </div>
            </FormSection>

            {/* Vehicle details */}
            <FormSection icon={Car} title="Vehicle details" step={2}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-tx-muted">
                    Vehicle type <span className="text-coral-hover">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {VEHICLE_TYPES.map((t) => {
                      const active = vehicleType === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setVehicleType(t)}
                          aria-pressed={active}
                          className={cn(
                            "flex min-h-[44px] items-center justify-center rounded-card px-2 py-2.5 text-center text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-marine/40",
                            active
                              ? "bg-marine text-tx-invert"
                              : "bg-white text-muted-foreground ring-1 ring-inset ring-line-strong hover:text-foreground"
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Make & model" htmlFor="model" required>
                    <Input id="model" required placeholder="e.g. Toyota Innova Crysta" />
                  </Field>
                  <Field label="Registration / plate no." htmlFor="plate" required>
                    <Input id="plate" required placeholder="e.g. TS 09 AB 1234" className="uppercase" />
                  </Field>
                  <Field label="Number of seats" htmlFor="seats" required>
                    <Input id="seats" type="number" min={2} max={20} required placeholder="e.g. 6" />
                  </Field>
                  <Field label="Vehicle colour" htmlFor="colour">
                    <Input id="colour" placeholder="e.g. Pearl White" />
                  </Field>
                </div>
              </div>
            </FormSection>

            {/* Airports & service area */}
            <FormSection icon={Plane} title="Airports & service area" step={3}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-tx-muted">
                    Airports you cover <span className="text-coral-hover">*</span>
                  </Label>
                  <div className="space-y-2">
                    {AIRPORTS.map((a) => {
                      const active = airports.includes(a.code);
                      return (
                        <button
                          key={a.code}
                          type="button"
                          onClick={() => toggleAirport(a.code)}
                          aria-pressed={active}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-card px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-marine/40",
                            active
                              ? "bg-marine-tint ring-1 ring-inset ring-marine/30"
                              : "bg-white ring-1 ring-inset ring-line-strong hover:bg-sunk"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-control transition-colors",
                              active ? "bg-marine text-white" : "ring-1 ring-inset ring-line-strong"
                            )}
                          >
                            {active ? <Check className="size-3.5" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-tx-head">
                              {a.city} · {a.code}
                            </span>
                            <span className="block text-xs text-muted-foreground">{a.name}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Field label="Service area notes" htmlFor="area">
                  <Textarea
                    id="area"
                    placeholder="e.g. Hyderabad city + outstation to Warangal & Vijayawada. Available 6 AM–11 PM."
                    className="min-h-24"
                  />
                </Field>
              </div>
            </FormSection>

            {/* Documents */}
            <FormSection icon={FileText} title="Documents" step={4}>
              <p className="mb-3 text-xs text-muted-foreground">
                Upload clear photos or PDFs. Your details are verified before approval.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DOCS.map((doc) => {
                  const name = uploaded[doc.key];
                  return (
                    <label
                      key={doc.key}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-card border border-dashed px-4 py-3.5 outline-none transition-colors",
                        name
                          ? "border-jade-line bg-jade-tint/60"
                          : "border-line-strong bg-white hover:border-marine/40 hover:bg-sunk"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-card",
                          name ? "bg-jade/15 text-jade" : "bg-marine-tint text-marine-deep"
                        )}
                      >
                        {name ? <CircleCheck className="size-5" /> : <Upload className="size-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-tx-head">{doc.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {name ?? "Tap to upload"}
                        </span>
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleUpload(doc.key, e)}
                      />
                    </label>
                  );
                })}
              </div>
            </FormSection>

            {/* Submit */}
            <div className="space-y-3 pt-2">
              <Button type="submit" disabled={loading} size="lg" className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting application…
                  </>
                ) : (
                  "Submit application"
                )}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                By submitting, you agree to Wicket Travel&apos;s partner terms.
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function SubmittedState({ name, onLogin }: { name: string; onLogin: () => void }) {
  const firstName = name.trim().split(/\s+/)[0] || "there";
  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center justify-center border-b border-border bg-white px-4">
        <BrandLogo className="h-6 w-auto" priority />
      </header>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center animate-in fade-in zoom-in-95 duration-500 ease-out">
          <div className="mx-auto flex size-20 items-center justify-center rounded-panel bg-jade-tint ring-1 ring-jade-line">
            <CircleCheck className="size-10 text-jade" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-tx-head">
            Application submitted!
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Thanks, {firstName}. Your driver application is now{" "}
            <span className="font-medium text-tx-head">pending approval</span>. Our
            team will verify your details and documents, usually within 1–2
            business days.
          </p>

          {/* Timeline */}
          <div className="mt-8 space-y-3 rounded-card bg-card p-5 text-left border border-line shadow-card">
            <TimelineRow icon={CircleCheck} tone="done" title="Application received" sub="We've got your details" />
            <TimelineRow icon={Clock3} tone="current" title="Under review" sub="Verifying documents & vehicle" />
            <TimelineRow icon={ShieldCheck} tone="upcoming" title="Approved & activated" sub="You'll get a call + SMS" />
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5" /> +91 40 1234 5678
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-3.5" /> partners@wicket.co.uk
            </span>
          </div>

          <Button onClick={onLogin} variant="outline" className="mt-8 w-full">
            Back to sign in
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            You can sign in once your account is approved.
          </p>
        </div>
      </div>
    </main>
  );
}

function TimelineRow({
  icon: Icon,
  tone,
  title,
  sub,
}: {
  icon: typeof Clock3;
  tone: "done" | "current" | "upcoming";
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-icon",
          tone === "done" && "bg-jade/15 text-jade",
          tone === "current" && "bg-gold/15 text-gold",
          tone === "upcoming" && "bg-sunk text-muted-foreground"
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <div>
        <p className={cn("text-sm font-medium", tone === "upcoming" ? "text-muted-foreground" : "text-tx-head")}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      {tone === "current" ? (
        <span className="ml-auto inline-flex items-center gap-1 rounded-chip bg-gold-tint px-2 py-0.5 text-[11px] font-medium text-gold">
          Now
        </span>
      ) : null}
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  step,
  children,
}: {
  icon: typeof User;
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card bg-card p-5 border border-line shadow-card sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-card bg-marine/10 text-marine">
          <Icon className="size-[18px]" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Step {step} of 4
          </p>
          <h2 className="tracking-heading text-base font-semibold text-tx-head">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wider text-tx-muted">
        {label} {required ? <span className="text-coral-hover">*</span> : null}
      </Label>
      {children}
    </div>
  );
}
