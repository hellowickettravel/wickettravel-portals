"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { deleteCustomer } from "@/lib/actions/admin";

/**
 * Destructive "delete customer" control for the customer detail page. Confirms
 * first, surfaces real errors via toast, then redirects back to the list.
 */
export function CustomerDangerZone({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onConfirm() {
    setBusy(true);
    const res = await deleteCustomer(customerId);
    if (!res.ok) {
      setBusy(false);
      toast.error("Couldn't delete customer", { description: res.error });
      return;
    }
    toast.success("Customer deleted");
    router.push("/admin/customers");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-rose-200 bg-rose-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-poppins text-sm font-semibold text-rose-700">
          Danger zone
        </p>
        <p className="text-xs text-ink-600">
          Permanently delete this customer and their chat history. Orders are
          kept for revenue history.
        </p>
      </div>
      <Button
        variant="outline"
        className="shrink-0 border-rose-300 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
        onClick={() => setOpen(true)}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        Delete customer
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete customer?"
        description={`This permanently removes ${customerName} and their conversations — this cannot be undone. Their orders are kept for revenue history but un-linked from the customer.`}
        confirmLabel="Delete permanently"
        destructive
        onConfirm={onConfirm}
      />
    </div>
  );
}
