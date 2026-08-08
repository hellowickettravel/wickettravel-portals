"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Btn, Spinner } from "@/components/admin/ui";
import { Sheet, SheetFoot, SheetHead } from "@/components/admin/sheet";
import { CheckIcon, CopyIcon, KeyIcon } from "@/components/admin/icons";
import { resetEmployeePassword } from "@/lib/actions/admin";

/**
 * Admin control to reset an employee's password. Generates a temporary
 * password server-side (service role) and shows it once so the admin can hand
 * it over — email delivery isn't relied upon. The result lands in the design's
 * own sheet rather than the portals' shared dialog.
 */
export function EmployeePasswordReset({ employeeId }: { employeeId: string }) {
  const titleId = useId();
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
      toast.error("Couldn't copy — select and copy it manually.");
    }
  }

  return (
    <>
      <Btn size="sm" onClick={reset} disabled={busy}>
        {busy ? <Spinner size={14} /> : <KeyIcon size={14} />}
        Reset password
      </Btn>

      <Sheet
        open={tempPassword !== null}
        onClose={() => setTempPassword(null)}
        labelledBy={titleId}
        width={460}
      >
        <SheetHead
          icon={<KeyIcon size={20} />}
          title="Temporary password"
          subtitle="Share this with the employee. They can change it from their own settings — you will not be able to see it again."
          titleId={titleId}
          onClose={() => setTempPassword(null)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="border-line-base bg-surface-1 flex items-center gap-3 rounded-[10px] border p-3">
            <code className="text-ink-800 min-w-0 flex-1 font-mono text-[13.5px] break-all">
              {tempPassword}
            </code>
            <Btn size="sm" onClick={copy}>
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? "Copied" : "Copy"}
            </Btn>
          </div>
        </div>
        <SheetFoot>
          <Btn variant="marine" onClick={() => setTempPassword(null)}>
            Done
          </Btn>
        </SheetFoot>
      </Sheet>
    </>
  );
}
