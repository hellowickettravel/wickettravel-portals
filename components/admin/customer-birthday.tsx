"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setCustomerBirthday } from "@/lib/actions/birthdays";
import { fmtBirthday, fmtDaysUntil, nextBirthday } from "@/lib/birthdays";
import { cn } from "@/lib/utils";
import { Btn, Card, CardHead, FieldLabel, focusRing, inputClass } from "@/components/admin/ui";
import { CalendarIcon } from "@/components/admin/icons";

export function CustomerBirthday({
  customerId,
  initial,
}: {
  customerId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial ?? "");
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const next = nextBirthday(saved);

  async function save(dob: string) {
    setBusy(true);
    const res = await setCustomerBirthday({ customerId, dateOfBirth: dob || null });
    setBusy(false);
    if (!res.ok) {
      toast.error("Couldn't save the birthday", { description: res.error });
      return;
    }
    setSaved(dob);
    setValue(dob);
    toast.success(dob ? "Birthday saved" : "Birthday removed");
    router.refresh();
  }

  return (
    <Card>
      <CardHead
        title="Birthday"
        icon={<CalendarIcon size={16} />}
        hint={
          next
            ? `${fmtBirthday(saved)} · ${fmtDaysUntil(next.daysUntil)}${
                next.turning ? ` · turns ${next.turning}` : ""
              }`
            : "Not on file — add it so they get birthday wishes."
        }
      />
      <form
        className="flex flex-wrap items-end gap-3 px-5 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save(value);
        }}
      >
        <label className="flex min-w-[170px] flex-1 flex-col gap-2">
          <FieldLabel htmlFor="admin-cust-dob">Date of birth</FieldLabel>
          <input
            id="admin-cust-dob"
            type="date"
            value={value}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setValue(e.target.value)}
            className={cn(inputClass, focusRing)}
          />
        </label>
        <Btn type="submit" variant="marine" pending={busy} disabled={value === saved}>
          Save
        </Btn>
        {saved ? (
          <Btn type="button" onClick={() => void save("")} disabled={busy}>
            Remove
          </Btn>
        ) : null}
      </form>
    </Card>
  );
}
