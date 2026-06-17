"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUp, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { getBusinessSettings, saveBusinessSettings } from "@/lib/actions/admin";
import { ADMIN_SETTINGS_KEY } from "@/lib/query-keys";

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
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [resetOpen, setResetOpen] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ADMIN_SETTINGS_KEY,
    queryFn: getBusinessSettings,
  });

  // Form state — hydrated from the loaded settings.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [commission, setCommission] = useState("");

  useEffect(() => {
    if (settings) {
      setName(settings.business_name ?? "");
      setEmail(settings.business_email ?? "");
      setPhone(settings.business_phone ?? "");
      setAddress(settings.business_address ?? "");
      setCommission(
        settings.default_commission != null ? String(settings.default_commission) : ""
      );
    }
  }, [settings]);

  // Realtime: settings changes from another admin appear live.
  useEffect(() => {
    const channel = supabase
      .channel("business-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "business_settings" },
        () => queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const saveMutation = useMutation({
    mutationFn: saveBusinessSettings,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't save", { description: res.error });
        return;
      }
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY });
    },
    onError: () => toast.error("Couldn't save", { description: "Please try again." }),
  });

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsedCommission = commission.trim() === "" ? null : Number(commission);
    if (parsedCommission != null && !Number.isFinite(parsedCommission)) {
      toast.error("Commission must be a number");
      return;
    }
    saveMutation.mutate({
      businessName: name,
      businessEmail: email,
      businessPhone: phone,
      businessAddress: address,
      defaultCommission: parsedCommission,
    });
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Manage your business profile, branding and preferences."
      />

      <form onSubmit={save} className="space-y-7">
        {/* Business profile + commission (persisted) */}
        <SectionCard title="Business profile" description="Used across invoices and customer messages.">
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading settings…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="biz-name">{fieldLabel("Business name")}</Label>
                <Input id="biz-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-[10px] bg-neutral-soft" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-email">{fieldLabel("Email")}</Label>
                <Input id="biz-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-[10px] bg-neutral-soft" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-phone">{fieldLabel("Phone")}</Label>
                <Input id="biz-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-[10px] bg-neutral-soft" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-address">{fieldLabel("Address")}</Label>
                <Input id="biz-address" value={address} onChange={(e) => setAddress(e.target.value)} className="h-10 rounded-[10px] bg-neutral-soft" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">{fieldLabel("Default commission (%)")}</Label>
                <Input id="commission" type="number" value={commission} onChange={(e) => setCommission(e.target.value)} className="h-10 max-w-xs rounded-[10px] bg-neutral-soft" />
              </div>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending || isLoading}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </SectionCard>
      </form>

      {/* Branding (stub) */}
      <SectionCard title="Branding" description="Your logo and brand colour.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            {fieldLabel("Logo (coming soon)")}
            <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-neutral-soft text-muted-foreground">
              <ImageUp className="size-6" />
              <span className="text-xs font-medium">Logo upload — not wired yet</span>
            </div>
          </div>
          <div className="space-y-2">
            {fieldLabel("Primary colour")}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-neutral-soft p-3">
              <div className="size-12 rounded-xl bg-brand shadow-sm ring-1 ring-black/5" />
              <div>
                <p className="font-display text-sm font-semibold text-foreground">#0088CC</p>
                <p className="text-xs text-muted-foreground">Wicket Blue · brand primary (display-only)</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Notifications (stub) */}
      <SectionCard title="Notifications" description="Choose what your team gets alerted about. (Not yet persisted.)">
        <ul className="divide-y divide-border">
          {NOTIFICATIONS.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch
                defaultChecked={n.on}
                onCheckedChange={() =>
                  toast.info("Notifications", { description: "UI only — not saved yet." })
                }
              />
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Danger zone (guarded stub) */}
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
            onClick={() => setResetOpen(true)}
          >
            Reset
          </Button>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset workspace?"
        description="This permanently deletes ALL orders, conversations and employees. This cannot be undone."
        confirmLabel="Reset everything"
        destructive
        onConfirm={() =>
          toast.error("Reset workspace", {
            description: "Disabled — this destructive action is intentionally not wired.",
          })
        }
      />
    </div>
  );
}
