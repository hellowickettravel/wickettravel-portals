"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUp, Loader2, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { ResetEverything } from "@/components/admin/reset-everything";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import {
  getBusinessSettings,
  saveBusinessSettings,
  saveBrandLogo,
} from "@/lib/actions/admin";
import {
  getMyNotificationPrefs,
  saveMyNotificationPrefs,
} from "@/lib/actions/notifications";
import { uploadBrandingLogo } from "@/lib/storage";
import { ADMIN_SETTINGS_KEY } from "@/lib/query-keys";

const PREFS_KEY = ["notification-prefs"] as const;

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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ADMIN_SETTINGS_KEY,
    queryFn: getBusinessSettings,
  });

  const { data: prefs } = useQuery({
    queryKey: PREFS_KEY,
    queryFn: getMyNotificationPrefs,
  });

  // Business profile form state.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [commission, setCommission] = useState("");

  // Notification prefs form state.
  const [newOrder, setNewOrder] = useState(true);
  const [newMessage, setNewMessage] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [statusChange, setStatusChange] = useState(true);

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

  useEffect(() => {
    if (prefs) {
      setNewOrder(prefs.new_order);
      setNewMessage(prefs.new_message);
      setDailySummary(prefs.daily_summary);
      setStatusChange(prefs.status_change);
    }
  }, [prefs]);

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

  const prefsMutation = useMutation({
    mutationFn: saveMyNotificationPrefs,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't save preferences", { description: res.error });
        return;
      }
      toast.success("Notification preferences saved");
      queryClient.invalidateQueries({ queryKey: PREFS_KEY });
    },
    onError: () =>
      toast.error("Couldn't save preferences", { description: "Please try again." }),
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

  function savePrefs() {
    prefsMutation.mutate({
      newOrder,
      newMessage,
      dailySummary,
      statusChange,
    });
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    const uploaded = await uploadBrandingLogo(file);
    if (!uploaded.ok) {
      setUploadingLogo(false);
      toast.error("Upload failed", { description: uploaded.error });
      return;
    }
    const saved = await saveBrandLogo(uploaded.url);
    setUploadingLogo(false);
    if (!saved.ok) {
      toast.error("Couldn't save logo", { description: saved.error });
      return;
    }
    toast.success("Logo updated", {
      description: "It now appears in the portal sidebar.",
    });
    queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY });
  }

  async function removeLogo() {
    const saved = await saveBrandLogo(null);
    if (!saved.ok) {
      toast.error("Couldn't remove logo", { description: saved.error });
      return;
    }
    toast.success("Logo removed");
    queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY });
  }

  const logoUrl = settings?.logo_url ?? null;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Manage your business profile, branding and preferences."
      />

      <form onSubmit={save} className="space-y-7">
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

      {/* Branding */}
      <SectionCard title="Branding" description="Your logo. The brand colour is fixed by the Wicket design system.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            {fieldLabel("Logo")}
            <div className="flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-neutral-soft">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Business logo" className="size-full object-cover" />
                ) : (
                  <ImageUp className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleLogo}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <ImageUp className="size-4" />
                      {logoUrl ? "Replace logo" : "Upload logo"}
                    </>
                  )}
                </Button>
                {logoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={removeLogo}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                ) : null}
                <p className="text-xs text-muted-foreground">PNG or JPG, up to 10MB.</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {fieldLabel("Primary colour")}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-neutral-soft p-3">
              <div className="size-12 rounded-xl bg-brand shadow-sm ring-1 ring-black/5" />
              <div>
                <p className="font-display text-sm font-semibold text-foreground">#0088CC</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" />
                  Wicket Blue · locked by the design system
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Notifications (persisted, per-admin) */}
      <SectionCard title="Notifications" description="Choose what you get alerted about. Saved to your account.">
        <ul className="divide-y divide-border">
          {[
            { label: "New order alerts", desc: "Notify you when an order is created.", checked: newOrder, set: setNewOrder },
            { label: "New message alerts", desc: "Notify when a customer sends a message.", checked: newMessage, set: setNewMessage },
            { label: "Order status changes", desc: "Alerts when an order's status changes.", checked: statusChange, set: setStatusChange },
            { label: "Daily summary email", desc: "A daily digest of orders and activity (coming soon).", checked: dailySummary, set: setDailySummary },
          ].map((n) => (
            <li key={n.label} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch checked={n.checked} onCheckedChange={(v) => n.set(Boolean(v))} />
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={savePrefs} disabled={prefsMutation.isPending}>
            {prefsMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save preferences"
            )}
          </Button>
        </div>
      </SectionCard>

      {/* Danger zone — full portal wipe. Kept visually separate at the bottom. */}
      <div className="pt-2">
        <ResetEverything />
      </div>
    </div>
  );
}
