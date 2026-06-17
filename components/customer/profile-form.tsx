"use client";

import { useState } from "react";
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

const PREFS = [
  { id: "p1", label: "Order updates", desc: "Quote, ticket and status changes.", on: true },
  { id: "p2", label: "Promotions", desc: "Occasional deals and fare drops.", on: false },
  { id: "p3", label: "WhatsApp notifications", desc: "Get updates on WhatsApp too.", on: true },
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
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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

      {/* Notifications (UI only) */}
      <SectionCard
        title="Notification preferences"
        description="Choose what you'd like to hear about. (Not yet persisted.)"
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
              <Switch
                defaultChecked={p.on}
                onCheckedChange={() =>
                  toast.info("Notification prefs", { description: "UI only — not saved yet." })
                }
              />
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
