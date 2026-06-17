"use client";

import { ImageUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const NOTIFICATIONS = [
  { id: "n1", label: "New order alerts", desc: "Notify admins when an order is created.", on: true },
  { id: "n2", label: "New message alerts", desc: "Notify when a customer sends a message.", on: true },
  { id: "n3", label: "Daily summary email", desc: "A daily digest of orders and activity.", on: false },
  { id: "n4", label: "Employee activity", desc: "Alerts when employees change order status.", on: false },
];

function fieldLabel(text: string) {
  return (
    <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
      {text}
    </span>
  );
}

export default function SettingsPage() {
  const save = (what: string) => () =>
    toast.success(`${what} saved`, {
      description: "UI only — changes persist once wired to Supabase.",
    });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Manage your business profile, branding and preferences."
      />

      {/* Business profile */}
      <SectionCard title="Business profile" description="Used across invoices and customer messages.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="biz-name">{fieldLabel("Business name")}</Label>
            <Input id="biz-name" defaultValue="Wicket Travel" className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-email">{fieldLabel("Email")}</Label>
            <Input id="biz-email" type="email" defaultValue="hello@wicket.co.uk" className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-phone">{fieldLabel("Phone")}</Label>
            <Input id="biz-phone" defaultValue="+44 20 1234 5678" className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-address">{fieldLabel("Address")}</Label>
            <Input id="biz-address" defaultValue="221B Baker Street, London" className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={save("Business profile")}>Save changes</Button>
        </div>
      </SectionCard>

      {/* Branding */}
      <SectionCard title="Branding" description="Your logo and brand colour.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            {fieldLabel("Logo")}
            <div className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-neutral-soft text-muted-foreground transition-colors hover:border-brand hover:text-brand">
              <ImageUp className="size-6" />
              <span className="text-xs font-medium">Upload logo (PNG/SVG)</span>
            </div>
          </div>
          <div className="space-y-2">
            {fieldLabel("Primary colour")}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-neutral-soft p-3">
              <div className="size-12 rounded-xl bg-brand shadow-sm ring-1 ring-black/5" />
              <div>
                <p className="font-display text-sm font-semibold text-foreground">#0088CC</p>
                <p className="text-xs text-muted-foreground">Wicket Blue · brand primary</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Commission model */}
      <SectionCard title="Commission model" description="Default commission applied to new orders.">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="commission">{fieldLabel("Default commission (%)")}</Label>
          <Input id="commission" type="number" defaultValue={12} className="h-10 rounded-[10px] bg-neutral-soft" />
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={save("Commission model")}>Save</Button>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notifications" description="Choose what your team gets alerted about.">
        <ul className="divide-y divide-border">
          {NOTIFICATIONS.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch defaultChecked={n.on} />
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard
        title="Danger zone"
        description="Irreversible actions — proceed with caution."
        className="border-rose-200"
      >
        <div className="flex flex-col gap-3 rounded-xl bg-rose-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-medium text-rose-700">Reset workspace</p>
              <p className="text-xs text-rose-600/80">
                Permanently delete all orders, conversations and employees.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-rose-300 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
            onClick={() =>
              toast.error("Reset workspace", {
                description: "UI only — this destructive action is disabled.",
              })
            }
          >
            Reset
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
