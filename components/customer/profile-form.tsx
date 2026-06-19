"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { updateMyName } from "@/lib/actions/account";
import {
  getMyNotificationPrefs,
  saveMyNotificationPrefs,
} from "@/lib/actions/notifications";
import { NOTIFICATION_PREFS_KEY } from "@/lib/query-keys";

// Customer-facing labels mapped onto the shared notification_prefs columns. These
// gate the customer notification loop (quote/price → new_order, status →
// status_change, team reply → new_message) created by the 0015 triggers.
type PrefKey = "new_order" | "status_change" | "new_message";

const PREF_ITEMS: { key: PrefKey; label: string; desc: string }[] = [
  { key: "new_order", label: "Quotes & prices", desc: "When the team adds a quote or price to your order." },
  { key: "status_change", label: "Order status updates", desc: "When your order is confirmed, completed or cancelled." },
  { key: "new_message", label: "Messages from the team", desc: "When the Wicket team replies in your chat." },
];

function fieldLabel(text: string) {
  return (
    <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
      {text}
    </span>
  );
}

export function CustomerProfileForm({
  initialName,
  email,
  phone,
}: {
  initialName: string;
  email: string;
  phone: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification preferences — real backend (notification_prefs), gates which
  // customer notifications the 0015 triggers actually deliver.
  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: NOTIFICATION_PREFS_KEY,
    queryFn: getMyNotificationPrefs,
  });

  const prefsMutation = useMutation({
    mutationFn: saveMyNotificationPrefs,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_PREFS_KEY });
      const prev = queryClient.getQueryData(NOTIFICATION_PREFS_KEY);
      queryClient.setQueryData(NOTIFICATION_PREFS_KEY, {
        new_message: next.newMessage,
        new_order: next.newOrder,
        status_change: next.statusChange,
        daily_summary: next.dailySummary,
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(NOTIFICATION_PREFS_KEY, ctx.prev);
      toast.error("Couldn't save preference", { description: "Please try again." });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_PREFS_KEY }),
  });

  function togglePref(key: PrefKey) {
    if (!prefs) return;
    prefsMutation.mutate({
      newMessage: key === "new_message" ? !prefs.new_message : prefs.new_message,
      newOrder: key === "new_order" ? !prefs.new_order : prefs.new_order,
      statusChange:
        key === "status_change" ? !prefs.status_change : prefs.status_change,
      dailySummary: prefs.daily_summary,
    });
  }

  async function saveName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingName(true);
    const res = await updateMyName(name);
    setSavingName(false);
    if (!res.ok) {
      toast.error("Couldn't save", { description: res.error });
      return;
    }
    toast.success("Profile saved");
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password too short", { description: "Use at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error("Couldn't update password", { description: error.message });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        subtitle="Manage your details and preferences."
      />

      {/* Personal info */}
      <SectionCard title="Personal information">
        <form onSubmit={saveName}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{fieldLabel("Full name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{fieldLabel("Email (read-only)")}</Label>
              <Input
                id="email"
                value={email}
                readOnly
                className="h-10 cursor-not-allowed rounded-[10px] bg-muted text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{fieldLabel("WhatsApp phone (read-only)")}</Label>
              <Input
                id="phone"
                value={phone || "—"}
                readOnly
                className="h-10 cursor-not-allowed rounded-[10px] bg-muted text-muted-foreground"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit" disabled={savingName || name.trim() === initialName.trim()}>
              {savingName ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Password */}
      <SectionCard title="Password" description="Update the password for your account.">
        <form onSubmit={savePassword}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new">{fieldLabel("New password")}</Label>
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf">{fieldLabel("Confirm")}</Label>
              <Input
                id="conf"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit" variant="outline" disabled={savingPassword || !newPassword}>
              {savingPassword ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  Update password
                </>
              )}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Notifications (real — persisted to notification_prefs) */}
      <SectionCard
        title="Notification preferences"
        description="Choose what you'd like to be alerted about. Saved instantly."
      >
        <ul className="divide-y divide-border">
          {PREF_ITEMS.map((p) => (
            <li key={p.key} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                <BellRing className="mt-0.5 size-4 shrink-0 text-brand" />
                <div>
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </div>
              <Switch
                checked={prefs ? prefs[p.key] : true}
                disabled={prefsLoading || prefsMutation.isPending}
                onCheckedChange={() => togglePref(p.key)}
              />
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
