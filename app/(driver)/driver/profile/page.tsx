"use client";

import Link from "next/link";
import {
  Star,
  Car,
  Phone,
  Mail,
  MapPin,
  BadgeCheck,
  Clock3,
  ShieldCheck,
  FileText,
  LogOut,
  Plane,
  Palette,
  Hash,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnlineToggle } from "@/components/driver/online-toggle";
import { DRIVER, airportLabel } from "@/lib/driver/mock";

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function DriverProfilePage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <h1 className="font-display text-xl font-semibold tracking-tight text-navy sm:text-2xl">
        Profile
      </h1>

      {/* Identity card */}
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(165deg,var(--ocean)_0%,var(--ocean-deep)_58%,var(--ocean-night)_100%)] p-5 shadow-card">
        <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(120%_120%_at_20%_0%,black,transparent_75%)]" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-orange text-xl font-bold text-white shadow-md">
            {initialsOf(DRIVER.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-display text-lg font-semibold text-white">
                {DRIVER.name}
              </p>
              <BadgeCheck className="size-4 shrink-0 text-orange-light" />
            </div>
            <p className="text-xs text-white/70">{DRIVER.city} · Partner since {DRIVER.memberSince}</p>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white ring-1 ring-inset ring-white/15">
                <Star className="size-3 fill-orange text-orange" />
                {DRIVER.rating}
              </span>
              <span className="text-xs text-white/70">{DRIVER.totalTrips.toLocaleString("en-IN")} trips</span>
            </div>
          </div>
        </div>
      </div>

      {/* Availability */}
      <section>
        <SectionLabel>Availability</SectionLabel>
        <OnlineToggle size="full" />
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 shadow-card">
          <div className="flex size-9 items-center justify-center rounded-xl bg-chip text-brand-dark">
            <Clock3 className="size-[18px]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-navy">Working hours</p>
            <p className="text-xs text-muted-foreground">6:00 AM – 11:00 PM · All days</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg">Edit</Button>
        </div>
      </section>

      {/* Contact */}
      <section>
        <SectionLabel>Contact</SectionLabel>
        <div className="divide-y divide-border rounded-2xl bg-card ring-1 ring-foreground/10 shadow-card">
          <InfoRow icon={Phone} label="Phone" value={DRIVER.phone} />
          <InfoRow icon={Mail} label="Email" value={DRIVER.email} />
          <InfoRow icon={MapPin} label="Base city" value={DRIVER.city} />
        </div>
      </section>

      {/* Vehicle */}
      <section>
        <SectionLabel>Vehicle</SectionLabel>
        <div className="divide-y divide-border rounded-2xl bg-card ring-1 ring-foreground/10 shadow-card">
          <InfoRow icon={Car} label="Type" value={DRIVER.vehicle.type} />
          <InfoRow icon={Car} label="Make & model" value={DRIVER.vehicle.makeModel} />
          <InfoRow icon={Hash} label="Registration" value={DRIVER.vehicle.plate} />
          <InfoRow icon={Users} label="Seats" value={`${DRIVER.vehicle.seats} seater`} />
          <InfoRow icon={Palette} label="Colour" value={DRIVER.vehicle.color} />
        </div>
      </section>

      {/* Covered airports */}
      <section>
        <SectionLabel>Airports covered</SectionLabel>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 shadow-card">
          <div className="flex flex-wrap gap-2">
            {DRIVER.airports.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 rounded-full bg-chip px-3 py-1.5 text-sm font-medium text-brand-dark"
              >
                <Plane className="size-3.5 -rotate-45" />
                {airportLabel(a)}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{DRIVER.serviceArea}</p>
        </div>
      </section>

      {/* Documents */}
      <section>
        <SectionLabel>Documents</SectionLabel>
        <div className="divide-y divide-border rounded-2xl bg-card ring-1 ring-foreground/10 shadow-card">
          {DRIVER.documents.map((doc) => (
            <div key={doc.name} className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chip text-brand-dark">
                <FileText className="size-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-navy">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{doc.detail}</p>
              </div>
              {doc.status === "verified" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="size-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  <Clock3 className="size-3.5" />
                  Pending
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Sign out */}
      <Button
        render={<Link href="/driver/login" />}
        variant="outline"
        className="h-12 w-full rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      >
        <LogOut className="size-4" />
        Sign out
      </Button>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        Wicket Travel Driver Partner · v1.0
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-chip text-brand-dark">
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-navy">{value}</p>
      </div>
    </div>
  );
}
