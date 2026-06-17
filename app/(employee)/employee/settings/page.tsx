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
  { id: "n1", label: "New chat assigned", desc: "When a conversation is assigned to you.", on: true },
  { id: "n2", label: "New customer message", desc: "When a customer replies in your chats.", on: true },
  { id: "n3", label: "Order status changes", desc: "When one of your orders changes status.", on: false },
];

function fieldLabel(text: string) {
  return (
    <span className="font-label text-[11px] font-medium uppercase tracking-wider text-slate-500">
      {text}
    </span>
  );
}

export default function EmployeeSettingsPage() {
  const save = (what: string) => () =>
    toast.success(`${what} saved`, {
      description: "UI only — changes persist once wired to Supabase.",
    });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage your personal details and preferences."
      />

      {/* Profile */}
      <SectionCard title="My profile">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{fieldLabel("Full name")}</Label>
            <Input id="name" defaultValue="Aisha Khan" className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{fieldLabel("Email (read-only)")}</Label>
            <Input
              id="email"
              defaultValue="aisha@wicket.co.uk"
              readOnly
              className="h-10 cursor-not-allowed rounded-[10px] bg-muted text-muted-foreground"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={save("Profile")}>Save changes</Button>
        </div>
      </SectionCard>

      {/* Password */}
      <SectionCard title="Password" description="Update your account password.">
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
      <SectionCard title="Notification preferences" description="Choose what you'd like to be alerted about.">
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
