"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateMyName } from "@/lib/actions/account";
import {
  getMyNotificationPrefs,
  saveMyNotificationPrefs,
} from "@/lib/actions/notifications";
import { NOTIFICATION_PREFS_KEY } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  Btn,
  Card,
  CardHead,
  FieldLabel,
  PageHead,
  Screen,
  Spinner,
  Toggle,
  focusRing,
  inputClass,
} from "@/components/admin/ui";
import { AvatarUpload } from "@/components/admin/avatar-upload";
import { CheckIcon, LockIcon } from "@/components/admin/icons";

type PrefKey = "new_message" | "new_order" | "status_change";

const PREF_ITEMS: { key: PrefKey; label: string; desc: string }[] = [
  {
    key: "new_message",
    label: "New customer messages",
    desc: "When a customer replies in one of your chats.",
  },
  {
    key: "new_order",
    label: "New order activity",
    desc: "When an order tied to you is created.",
  },
  {
    key: "status_change",
    label: "Order status changes",
    desc: "When one of your orders changes status.",
  },
];

/**
 * The employee's own account settings — their name, their password and what
 * they want to be told about. Nothing here reaches the business settings the
 * admin owns; an employee can only change their own record.
 */
export function SettingsForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification preferences — real backend (notification_prefs), gates which
  // notification types create_notification actually delivers to this employee.
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
      toast.error("Couldn't save preference", {
        description: "Please try again.",
      });
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
      toast.error("Password too short", {
        description: "Use at least 8 characters.",
      });
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
    <Screen width={1080}>
      <PageHead
        title="Settings"
        intro="Your name, your password, and what you want to be told about."
      />

      {/* ------------------------------------------------------- profile */}
      <Card>
        <CardHead title="My profile" />
        <AvatarUpload note="PNG, JPG or WebP, up to 4MB. This is you — it shows on your account button, beside your name in the inbox and on every message you send a customer. It is not the sidebar logo." />
        <form onSubmit={saveName}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 p-5">
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="set-name">Full name</FieldLabel>
              <input
                id="set-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(inputClass, focusRing)}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="set-email">Email</FieldLabel>
              <input
                id="set-email"
                value={email}
                readOnly
                aria-describedby="set-email-note"
                className={cn(
                  inputClass,
                  "bg-surface-1 text-ink-600 cursor-not-allowed"
                )}
              />
              <span
                id="set-email-note"
                className="text-ink-500 text-[11.5px] font-normal"
              >
                Ask an administrator to change your sign-in address.
              </span>
            </label>
          </div>
          <div className="px-5 pb-5">
            <Btn
              type="submit"
              variant="ember"
              disabled={savingName || name.trim() === initialName.trim()}
            >
              {savingName ? <Spinner /> : <CheckIcon size={15} />}
              Save changes
            </Btn>
          </div>
        </form>
      </Card>

      {/* ------------------------------------------------------ password */}
      <Card>
        <CardHead
          title="Password"
          hint="Use at least 8 characters. You stay signed in on this device."
        />
        <form onSubmit={savePassword}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 p-5">
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="set-new">New password</FieldLabel>
              <input
                id="set-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={cn(inputClass, focusRing)}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="set-conf">Confirm password</FieldLabel>
              <input
                id="set-conf"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter the new password"
                className={cn(inputClass, focusRing)}
              />
            </label>
          </div>
          <div className="px-5 pb-5">
            <Btn type="submit" disabled={savingPassword || !newPassword}>
              {savingPassword ? <Spinner /> : <LockIcon size={15} />}
              Update password
            </Btn>
          </div>
        </form>
      </Card>

      {/* ------------------------------------------------- notifications */}
      <Card>
        <CardHead
          title="Notification preferences"
          hint="Saved the moment you switch one."
        />
        {PREF_ITEMS.map((p) => (
          /* The design insets a row's rule past the label column. */
          <div
            key={p.key}
            className="after:bg-line-soft relative flex flex-wrap items-center gap-4 px-5 py-4 after:absolute after:right-0 after:bottom-0 after:left-5 after:h-px after:content-[''] last:after:hidden"
          >
            <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
              <span className="text-ink-800 text-[13px] font-medium">
                {p.label}
              </span>
              <span className="text-ink-500 text-[12.5px] leading-[1.5] font-normal text-pretty">
                {p.desc}
              </span>
            </span>
            <Toggle
              checked={prefs ? prefs[p.key] : true}
              label={p.label}
              disabled={prefsLoading || prefsMutation.isPending}
              onChange={() => togglePref(p.key)}
            />
          </div>
        ))}
      </Card>
    </Screen>
  );
}
