"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Btn, Spinner, focusRing } from "@/components/admin/ui";
import { Sheet, SheetFoot, SheetHead } from "@/components/admin/sheet";
import {
  CheckIcon,
  CloseIcon,
  TrashIcon,
  WarningIcon,
} from "@/components/admin/icons";
import { resetEverything } from "@/lib/actions/admin";

const CONFIRM_PHRASE = "RESET EVERYTHING";

/**
 * DESTRUCTIVE "Reset Everything" control for Admin Settings. Wipes the whole
 * portal back to a fresh state (every employee, customer, order, message,
 * conversation, ticket and notification — plus uploaded attachments), keeping
 * only the acting admin and the business settings/logo.
 *
 * Three independent guards before anything runs:
 *   1. Type the exact phrase "RESET EVERYTHING".
 *   2. Re-enter the current account password (verified server-side).
 *   3. A final "this cannot be undone" confirmation.
 */
export function ResetEverything() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "final">("form");
  const titleId = useId();
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const phraseMatches = confirmText.trim() === CONFIRM_PHRASE;
  const canContinue = phraseMatches && password.length > 0 && !busy;

  function reset() {
    setStep("form");
    setConfirmText("");
    setPassword("");
    setBusy(false);
  }

  function onOpenChange(next: boolean) {
    if (busy) return; // don't let the dialog close mid-wipe
    setOpen(next);
    if (!next) reset();
  }

  async function runReset() {
    setBusy(true);
    try {
      const res = await resetEverything(password);
      if (!res.ok) {
        setBusy(false);
        setStep("form");
        toast.error("Reset aborted", { description: res.error });
        return;
      }

      const { deletedCounts, errors } = res.summary;
      const removed =
        deletedCounts.accounts +
        deletedCounts.orders +
        deletedCounts.messages +
        deletedCounts.conversations +
        deletedCounts.customers;

      if (errors.length > 0) {
        toast.warning("Portal reset with some errors", {
          description: `${errors.length} item(s) failed: ${errors
            .slice(0, 3)
            .join("; ")}${errors.length > 3 ? "…" : ""}`,
        });
      } else {
        toast.success("Portal reset complete", {
          description: `Removed ${removed} records and emptied attachments. Your admin account is intact.`,
        });
      }

      setOpen(false);
      reset();
      // Blow away cached data so every screen reflects the empty portal.
      queryClient.clear();
      router.refresh();
    } catch (e) {
      setBusy(false);
      setStep("form");
      toast.error("Reset failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  }

  return (
    // The design gives the danger zone its own card: a danger-tinted header
    // rule, then two columns that spell out exactly what is deleted and what
    // survives, before the button is ever reachable.
    <div className="border-danger-rim overflow-hidden rounded-[12px] border bg-white shadow-[0_1px_2px_oklch(0.455_0.160_25_/_0.06)]">
      <div className="border-danger-edge bg-danger-wash flex items-center gap-3 border-b px-5 py-4">
        <span className="bg-danger-chip text-danger-ink flex size-8 flex-none items-center justify-center rounded-[9px]">
          <WarningIcon size={17} />
        </span>
        <h2 className="text-danger-title m-0 text-[13.5px] font-semibold tracking-[-0.008em]">
          Danger zone
        </h2>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-ink-800 m-0 text-[15px] font-semibold tracking-[-0.012em]">
            Reset everything
          </h3>
          <p className="text-ink-600 m-0 max-w-[72ch] text-[13px] leading-[1.6] font-normal text-pretty">
            Permanently wipe the portal back to a fresh state. This cannot be
            undone, and there is no backup once it runs.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          <div className="border-danger-edge bg-danger-mist flex flex-col gap-2.5 rounded-[10px] border p-4">
            <span className="text-danger-ink text-[11px] font-semibold tracking-[0.11em] uppercase">
              Deleted forever
            </span>
            {[
              "Every employee, customer and their portal logins",
              "Every order, its messages and attachments",
              "Every conversation and message thread",
              "Every support ticket and notification",
              "All uploaded files in storage",
            ].map((d) => (
              <span
                key={d}
                className="text-ink-700 flex items-start gap-2.5 text-[12.5px] leading-[1.5] font-normal text-pretty"
              >
                <CloseIcon size={14} width={2.2} className="text-danger-strong mt-[3px] flex-none" />
                <span className="min-w-0 flex-1">{d}</span>
              </span>
            ))}
          </div>
          <div className="border-line-base bg-surface-1 flex flex-col gap-2.5 rounded-[10px] border p-4">
            <span className="text-ok-ink text-[11px] font-semibold tracking-[0.11em] uppercase">
              Kept
            </span>
            {[
              "Your own admin account and password",
              "Business profile — name, email, phone and address",
              "Default commission rate and the uploaded logo",
            ].map((k) => (
              <span
                key={k}
                className="text-ink-700 flex items-start gap-2.5 text-[12.5px] leading-[1.5] font-normal text-pretty"
              >
                <CheckIcon size={14} width={2.2} className="text-ok-ink mt-[3px] flex-none" />
                <span className="min-w-0 flex-1">{k}</span>
              </span>
            ))}
          </div>
        </div>

        {/* The design puts the confirm phrase in the card, next to the button,
            and only unlocks it once the phrase matches. The password step and
            the final confirmation live in the sheet behind it. */}
        <div className="border-line-soft flex flex-wrap items-end gap-4 border-t pt-5">
          <label className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">
            <span className="text-ink-700 text-[12px] font-medium">
              Type{" "}
              <strong className="text-danger-ink font-semibold">
                {CONFIRM_PHRASE}
              </strong>{" "}
              to confirm
            </span>
            <input
              type="text"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              aria-label={`Type ${CONFIRM_PHRASE} to confirm`}
              className={cn(
                "border-danger-line text-ink-800 h-[42px] w-full rounded-[10px] border bg-white px-4 text-[13.5px] font-medium tracking-[0.04em] outline-none",
                focusRing
              )}
            />
          </label>
          <Btn
            variant="danger"
            className={cn(
              "h-[42px]",
              phraseMatches && "bg-danger-strong hover:bg-danger-ink border-0 text-white"
            )}
            disabled={!phraseMatches}
            onClick={() => setOpen(true)}
          >
            <TrashIcon size={15} />
            Reset everything
          </Btn>
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => !busy && onOpenChange(false)}
        labelledBy={titleId}
        width={460}
      >
        {step === "form" ? (
          <>
            <SheetHead
              tone="danger"
              icon={<WarningIcon size={20} />}
              title="Reset everything?"
              subtitle="This permanently deletes every employee, customer, order, message, conversation, ticket, notification and uploaded file. Only your admin account and the business settings survive."
              titleId={titleId}
              onClose={() => !busy && onOpenChange(false)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <label className="flex flex-col gap-2">
                <span className="text-ink-700 text-[12px] font-medium">
                  Confirm your password
                </span>
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your account password"
                  disabled={busy}
                  className={cn(
                    "border-line-field text-ink-800 h-[42px] w-full rounded-[10px] border bg-white px-4 text-[13.5px] font-normal outline-none",
                    focusRing
                  )}
                />
              </label>
            </div>
            <SheetFoot>
              <Btn onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Btn>
              <Btn
                variant="danger"
                className="bg-danger-strong hover:bg-danger-ink border-0 text-white"
                disabled={!canContinue}
                onClick={() => setStep("final")}
              >
                Continue
              </Btn>
            </SheetFoot>
          </>
        ) : (
          <>
            <SheetHead
              tone="danger"
              icon={<TrashIcon size={20} />}
              title="Final confirmation"
              subtitle="This permanently deletes all employees, customers, orders, messages and data. It cannot be undone."
              titleId={titleId}
              onClose={() => !busy && onOpenChange(false)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <p className="text-ink-600 m-0 text-[13px] leading-[1.6] font-normal text-pretty">
                There is no backup and no undo. Continue?
              </p>
            </div>
            <SheetFoot>
              <Btn onClick={() => setStep("form")} disabled={busy}>
                Go back
              </Btn>
              <Btn
                variant="danger"
                className="bg-danger-strong hover:bg-danger-ink border-0 text-white"
                onClick={runReset}
                disabled={busy}
              >
                {busy ? <Spinner /> : <TrashIcon size={15} />}
                {busy ? "Wiping…" : "Yes, delete everything"}
              </Btn>
            </SheetFoot>
          </>
        )}
      </Sheet>

    </div>
  );
}
