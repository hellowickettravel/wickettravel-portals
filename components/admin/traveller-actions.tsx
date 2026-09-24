"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Btn, Card, CardHead, Pill, type PillTone } from "@/components/admin/ui";
import { ConfirmSheet } from "@/components/admin/sheet";
import { CakeIcon, EditIcon, SendIcon, TrashIcon } from "@/components/admin/icons";
import { TravellerForm } from "@/components/admin/traveller-form";
import { deleteTraveller, sendTravellerBirthdayWishes } from "@/lib/actions/travellers";
import { fmtBirthday, fmtDaysUntil } from "@/lib/birthdays";
import { fmtRelative } from "@/lib/format";
import { BIRTHDAY_WINDOW_DAYS, type TravellerInput, type TravellerListItem } from "@/lib/travellers";

const LIST_KEY = ["admin", "travel-details"] as const;

/** Edit and Remove on a traveller's own page. */
export function TravellerActions({
  id,
  name,
  form,
  isAccountHolder,
}: {
  id: string;
  name: string;
  form: TravellerInput;
  isAccountHolder: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const remove = useMutation({
    mutationFn: () => deleteTraveller(id),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't remove", { description: res.error });
        return;
      }
      toast.success(`${name} removed from Travel details`);
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      router.push("/admin/travel-details");
    },
    onError: () => toast.error("Couldn't remove", { description: "Please try again." }),
  });

  return (
    <>
      <Btn onClick={() => setEditing(true)}>
        <EditIcon size={15} />
        Edit details
      </Btn>
      <Btn variant="danger" onClick={() => setConfirmDelete(true)}>
        <TrashIcon size={15} />
        Remove
      </Btn>

      <TravellerForm
        open={editing}
        onClose={() => setEditing(false)}
        initial={form}
        isAccountHolder={isAccountHolder}
        onSaved={() => {
          setEditing(false);
          queryClient.invalidateQueries({ queryKey: LIST_KEY });
          router.refresh();
        }}
      />

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => !remove.isPending && setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
        icon={<TrashIcon size={20} />}
        title={`Remove ${name}?`}
        body={
          isAccountHolder
            ? "This removes them from Travel details only. Their customer account, orders and messages stay exactly as they are."
            : "This removes their saved details from Travel details. The orders they travelled on are not changed, and they won't be added back automatically."
        }
        confirmLabel="Remove"
        destructive
        busy={remove.isPending}
      />
    </>
  );
}

const STATUS: Record<NonNullable<TravellerListItem["birthday"]>["status"], { label: string; tone: PillTone }> = {
  ready: { label: "Ready to send", tone: "marine" },
  sent: { label: "Wished", tone: "ok" },
  failed: { label: "Failed — retry", tone: "danger" },
  no_email: { label: "No email on file", tone: "ink" },
  opted_out: { label: "Opted out", tone: "ink" },
  account: { label: "Via Birthdays", tone: "ink" },
};

/** The birthday card on a traveller's page, with a one-person send. */
export function TravellerBirthdaySend({
  id,
  name,
  birthday,
  mailOff,
  customerId,
}: {
  id: string;
  name: string;
  birthday: NonNullable<TravellerListItem["birthday"]>;
  mailOff: boolean;
  customerId: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const soon = birthday.daysUntil <= BIRTHDAY_WINDOW_DAYS;
  const canSend = soon && (birthday.status === "ready" || birthday.status === "failed") && !mailOff;

  const send = useMutation({
    mutationFn: () => sendTravellerBirthdayWishes({ travellerIds: [id] }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't send", { description: res.error });
        return;
      }
      const { sent, skipped, failed } = res.data;
      if (sent.length) {
        toast.success(`Birthday wish sent to ${name}`, {
          description: sent[0].previewUrl ? "Test mode — open the preview from the Travel details screen." : undefined,
          action: sent[0].previewUrl
            ? { label: "Preview", onClick: () => window.open(sent[0].previewUrl!, "_blank", "noopener") }
            : undefined,
        });
      } else if (failed.length) {
        toast.error("Couldn't send", { description: failed[0].error });
      } else if (skipped.length) {
        toast.message("Not sent", { description: skipped[0].reason });
      }
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      router.refresh();
    },
    onError: () => toast.error("Couldn't send", { description: "Please try again." }),
  });

  const s = STATUS[birthday.status];
  return (
    <Card>
      <CardHead
        title="Birthday"
        icon={<CakeIcon size={16} />}
        action={
          customerId ? (
            <Btn as="link" href="/admin/birthdays" size="sm">
              Open Birthdays
            </Btn>
          ) : soon ? (
            <Btn size="sm" variant="ember" disabled={!canSend} pending={send.isPending} onClick={() => send.mutate()}>
              <SendIcon size={14} />
              Send wish
            </Btn>
          ) : null
        }
      />
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="flex flex-col">
          <span className="text-ink-800 text-[14px] font-medium">{fmtBirthday(birthday.date)}</span>
          <span className="text-ink-500 text-[12px]">
            {fmtDaysUntil(birthday.daysUntil)}
            {birthday.turning ? ` · turns ${birthday.turning}` : ""}
          </span>
        </span>
        {soon ? (
          <span className="flex flex-col items-end gap-1" title={birthday.error ?? undefined}>
            <Pill tone={s.tone}>{s.label}</Pill>
            {birthday.sentAt ? <span className="text-ink-500 text-[11px]">{fmtRelative(birthday.sentAt)}</span> : null}
          </span>
        ) : null}
      </div>
      {customerId ? (
        <p className="text-ink-500 border-line-soft m-0 border-t px-5 py-3 text-[12px]">
          They have a customer account, so their wish is sent from the Birthdays screen.
        </p>
      ) : mailOff && soon ? (
        <p className="text-ink-500 border-line-soft m-0 border-t px-5 py-3 text-[12px]">
          Email isn&apos;t set up on the server yet.
        </p>
      ) : null}
    </Card>
  );
}
