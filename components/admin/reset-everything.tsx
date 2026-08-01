"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
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
    <div className="rounded-card border-2 border-ruby-line bg-ruby-tint/60 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-card bg-ruby-tint text-ruby">
          <ShieldAlert className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="tracking-heading text-base font-semibold text-ruby">
            Danger zone — Reset everything
          </h3>
          <p className="mt-1 text-sm text-ruby/80">
            Permanently wipe the portal back to a fresh state. This{" "}
            <strong>deletes every employee, customer, order, message,
            conversation, support ticket and notification</strong>, removes all
            customer/employee/other-admin logins, and empties all uploaded
            attachments.
          </p>
          <p className="mt-2 text-sm text-ruby/80">
            <strong>Kept:</strong> your own admin account and your business
            settings (name, email, phone, commission and logo). Everything else
            is gone. <strong>This cannot be undone.</strong>
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <AlertTriangle className="size-4" />
          Reset everything
        </Button>
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
          {step === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle className="tracking-heading text-ruby">
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
                    <span className="text-xs font-medium uppercase tracking-wider text-tx-muted">
                      Type{" "}
                      <span className="font-semibold text-ruby">
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-password">
                    <span className="text-xs font-medium uppercase tracking-wider text-tx-muted">
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
                <DialogTitle className="tracking-heading text-ruby">
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
