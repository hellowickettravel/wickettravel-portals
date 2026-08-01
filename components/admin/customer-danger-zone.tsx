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
    <div className="flex flex-col gap-4 rounded-card border border-ruby-line bg-ruby-tint p-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
      <div>
        <p className="text-[16.5px] leading-[1.42] font-semibold text-ruby">
          Danger zone
        </p>
        <p className="mt-1.5 max-w-[58ch] text-[14.5px] leading-[1.6] text-tx-muted">
          Permanently delete this customer and their chat history. Orders are
          kept for revenue history.
        </p>
      </div>
      <Button
        variant="destructive"
        className="shrink-0"
        onClick={() => setOpen(true)}
        disabled={busy}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
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
