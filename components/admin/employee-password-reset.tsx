"use client";

import { useState } from "react";
import { KeyRound, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { resetEmployeePassword } from "@/lib/actions/admin";

/**
 * Admin control to reset an employee's password. Generates a temporary password
 * server-side (service role) and shows it once so the admin can hand it over —
 * email delivery isn't relied upon.
 */
export function EmployeePasswordReset({ employeeId }: { employeeId: string }) {
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function reset() {
    setBusy(true);
    const res = await resetEmployeePassword(employeeId);
    setBusy(false);
    if (!res.ok) {
      toast.error("Couldn't reset password", { description: res.error });
      return;
    }
    setTempPassword(res.tempPassword);
    setCopied(false);
  }

  async function copy() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy — select and copy manually.");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={reset} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        Reset password
      </Button>

      <Dialog open={tempPassword !== null} onOpenChange={(o) => !o && setTempPassword(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins">Temporary password</DialogTitle>
            <DialogDescription>
              Share this with the employee. They can change it later in Settings.
              You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-xl border border-line-base bg-surface-1 p-3">
            <code className="flex-1 font-mono text-sm text-ink-800">
              {tempPassword}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setTempPassword(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
