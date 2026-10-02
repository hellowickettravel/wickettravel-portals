"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmSheet } from "@/components/admin/sheet";
import { TrashIcon } from "@/components/admin/icons";
import { focusRing } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type Result = { ok: true } | { ok: false; error: string };

/**
 * The in-table delete action: a 30px bin that sits beside "View" and asks
 * first, in the design's danger sheet. Rows on the list screens open their
 * record on click, so clicks here (including inside the portalled sheet,
 * whose React events still bubble through this component) stop at the
 * wrapper and never reach the row.
 */
export function DeleteRowButton({
  what,
  name,
  body,
  action,
  onDeleted,
  disabledReason,
}: {
  /** Lower-case noun for the button, title and toasts: "ticket". */
  what: string;
  /** How the row is known: a reference or a person's name. */
  name: string;
  /** What else goes with it, in plain words. */
  body: React.ReactNode;
  action: () => Promise<Result>;
  onDeleted: () => void;
  /** Set when this row can't be deleted: the bin shows, greyed, with why. */
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await action();
      if (!res.ok) {
        toast.error(`Couldn't delete this ${what}`, { description: res.error });
        return;
      }
      toast.success(`${what.charAt(0).toUpperCase()}${what.slice(1)} deleted`);
      setOpen(false);
      onDeleted();
    } catch {
      toast.error(`Couldn't delete this ${what}`, { description: "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        title={disabledReason ?? `Delete ${what}`}
        aria-label={`Delete ${what} ${name}`}
        aria-disabled={disabledReason ? true : undefined}
        onClick={() => {
          if (disabledReason) toast(disabledReason);
          else setOpen(true);
        }}
        className={cn(
          "border-line-field inline-flex size-[30px] items-center justify-center rounded-full border bg-white outline-none",
          disabledReason
            ? "text-ink-300 cursor-not-allowed"
            : "text-danger-ink hover:bg-danger-bg hover:border-current",
          focusRing
        )}
      >
        <TrashIcon size={14} />
      </button>
      <ConfirmSheet
        open={open}
        onClose={() => !busy && setOpen(false)}
        onConfirm={confirm}
        destructive
        busy={busy}
        icon={<TrashIcon size={20} />}
        title={`Delete ${name}?`}
        body={body}
        confirmLabel="Delete permanently"
      />
    </span>
  );
}
