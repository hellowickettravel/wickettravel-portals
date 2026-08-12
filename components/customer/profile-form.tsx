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

// Customer-facing labels mapped onto the shared notification_prefs columns.
// These gate the customer notification loop (quote/price → new_order, status →
// status_change, team reply → new_message) created by the 0015 triggers.
type PrefKey = "new_order" | "status_change" | "new_message";

const PREF_ITEMS: { key: PrefKey; label: string; desc: string }[] = [
  {
    key: "new_order",
    label: "Quotes & prices",
    desc: "When the team adds a quote or price to one of your orders.",
  },
  {
    key: "status_change",
    label: "Order status updates",
    desc: "When an order is confirmed, completed or cancelled.",
  },
  {
    key: "new_message",
    label: "Messages from the team",
    desc: "When someone replies in your chat.",
  },
];

/**
 * The traveller's own account — their name, their password and what they want
 * to be told about. Email and phone are read-only: both are how the team
 * reaches them about live bookings, so changing either goes through the team.
 */
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

  const readOnly = cn(inputClass, "bg-surface-1 text-ink-600 cursor-not-allowed");

  return (
    <Screen width={1080}>
      <PageHead
        title="Profile"
        intro="Your details, your password, and what you want to hear from us about."
      />

      {/* -------------------------------------------------- personal info */}
      <Card>
        <CardHead title="Your details" />
        {/* The same component the staff portals use — one upload feature, four
            portals. Only the wording differs, because a customer's picture
            shows up in different places from an admin's. */}
        <AvatarUpload note="PNG, JPG or WebP, up to 4MB. This is you — it shows beside the messages you send to our team. Nobody outside Wicket Travel sees it." />
        <form onSubmit={saveName}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 p-5">
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="cust-name">Full name</FieldLabel>
              <input
                id="cust-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(inputClass, focusRing)}
              />
              <span className="text-ink-500 text-[11.5px] font-normal">
                Use the name on your passport where you can.
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="cust-email">Email</FieldLabel>
              <input
                id="cust-email"
                value={email}
                readOnly
                aria-describedby="cust-email-note"
                className={readOnly}
              />
              <span
                id="cust-email-note"
                className="text-ink-500 text-[11.5px] font-normal"
              >
                Your sign-in address. Ask the team to change it.
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="cust-phone">Phone</FieldLabel>
              <input
                id="cust-phone"
                value={phone || "Not on file"}
                readOnly
                aria-describedby="cust-phone-note"
                className={readOnly}
              />
              <span
                id="cust-phone-note"
                className="text-ink-500 text-[11.5px] font-normal"
              >
                Message the team to add or change this.
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

      {/* ------------------------------------------------------- password */}
      <Card>
        <CardHead
          title="Password"
          hint="Use at least 8 characters. You stay signed in on this device."
        />
        <form onSubmit={savePassword}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 p-5">
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="cust-new">New password</FieldLabel>
              <input
                id="cust-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={cn(inputClass, focusRing)}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="cust-conf">Confirm password</FieldLabel>
              <input
                id="cust-conf"
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

      {/* -------------------------------------------------- notifications */}
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
