"use client";

import { Lock, BellRing } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const PREFS = [
  { id: "p1", label: "Order updates", desc: "Quote, ticket and status changes.", on: true },
  { id: "p2", label: "Promotions", desc: "Occasional deals and fare drops.", on: false },
  { id: "p3", label: "WhatsApp notifications", desc: "Get updates on WhatsApp too.", on: true },
];

function fieldLabel(text: string) {
  return (
    <span className="font-label text-[11px] font-medium uppercase tracking-wider text-slate-500">
      {text}
    </span>
  );
}

export default function CustomerProfilePage() {
  const save = (what: string) => () =>
    toast.success(`${what} saved`, {
      description: "UI only — changes persist once wired to Supabase.",
    });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        subtitle="Manage your details and preferences."
      />

      {/* Personal info */}
      <SectionCard title="Personal information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{fieldLabel("Full name")}</Label>
            <Input id="name" defaultValue="Jane Traveller" className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{fieldLabel("Email (read-only)")}</Label>
            <Input
              id="email"
              defaultValue="jane@example.com"
              readOnly
              className="h-10 cursor-not-allowed rounded-[10px] bg-muted text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{fieldLabel("Phone")}</Label>
            <Input id="phone" defaultValue="+44 7700 900123" className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={save("Profile")}>Save changes</Button>
        </div>
      </SectionCard>

      {/* Password */}
      <SectionCard title="Password" description="Update the password for your account.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="cur">{fieldLabel("Current")}</Label>
            <Input id="cur" type="password" placeholder="••••••••" className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">{fieldLabel("New")}</Label>
            <Input id="new" type="password" placeholder="At least 8 characters" className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conf">{fieldLabel("Confirm")}</Label>
            <Input id="conf" type="password" placeholder="Re-enter new password" className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={save("Password")} variant="outline">
            <Lock className="size-4" />
            Update password
          </Button>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        title="Notification preferences"
        description="Choose what you'd like to hear about."
      >
        <ul className="divide-y divide-border">
          {PREFS.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                <BellRing className="mt-0.5 size-4 shrink-0 text-brand" />
                <div>
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </div>
              <Switch defaultChecked={p.on} />
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
