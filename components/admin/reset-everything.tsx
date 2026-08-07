"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, ShieldAlert, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
          <ShieldAlert className="size-[17px]" />
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
                <X className="text-danger-strong mt-[3px] size-3.5 flex-none" />
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
                <Check className="text-ok-ink mt-[3px] size-3.5 flex-none" />
                <span className="min-w-0 flex-1">{k}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="border-line-soft flex flex-wrap items-center justify-end gap-4 border-t pt-5">
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            <AlertTriangle className="size-4" />
            Reset everything
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
          {step === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-poppins text-danger-ink">
                  Reset everything?
                </DialogTitle>
                <DialogDescription>
                  This permanently deletes <strong>all</strong> employees,
                  customers, orders, messages, conversations, support tickets,
                  notifications and uploaded files. Only your admin account and
                  business settings survive. This cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm">
                    <span className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                      Type{" "}
                      <span className="font-semibold text-danger-ink">
                        {CONFIRM_PHRASE}
                      </span>{" "}
                      to confirm
                    </span>
                  </Label>
                  <Input
                    id="reset-confirm"
                    autoComplete="off"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    disabled={busy}
                    className="h-10 rounded-[10px] bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-password">
                    <span className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                      Confirm your password
                    </span>
                  </Label>
                  <Input
                    id="reset-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your account password"
                    disabled={busy}
                    className="h-10 rounded-[10px] bg-white"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canContinue}
                  onClick={() => setStep("final")}
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-poppins text-danger-ink">
                  Final confirmation
                </DialogTitle>
                <DialogDescription>
                  This permanently deletes ALL employees, customers, orders,
                  messages and data. This cannot be undone. Continue?
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("form")}
                  disabled={busy}
                >
                  Go back
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={runReset}
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Wiping…
                    </>
                  ) : (
                    "Yes, delete everything"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
