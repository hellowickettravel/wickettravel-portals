"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Btn } from "@/components/admin/ui";
import { ConfirmSheet } from "@/components/admin/sheet";
import { TrashIcon, WarningIcon } from "@/components/admin/icons";
import { deleteCustomer } from "@/lib/actions/admin";

/**
 * Destructive "delete customer" control for the customer detail page, in the
 * design's danger form: a rimmed card with a wash header and its own glyph
 * tile, matching the Danger zone on Settings → Security. Confirms first,
 * surfaces real errors, then redirects back to the list.
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
    <div className="border-danger-rim overflow-hidden rounded-[12px] border bg-white shadow-[0_1px_2px_oklch(0.455_0.160_25_/_0.06)]">
      <div className="border-danger-edge bg-danger-wash flex items-center gap-3 border-b px-5 py-4">
        <span className="bg-danger-chip text-danger-ink flex size-8 flex-none items-center justify-center rounded-[9px]">
          <WarningIcon size={17} />
        </span>
        <h2 className="text-danger-title m-0 text-[13.5px] font-semibold tracking-[-0.008em]">
          Danger zone
        </h2>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
          <h3 className="text-ink-800 m-0 text-[15px] font-semibold tracking-[-0.012em]">
            Delete this customer
          </h3>
          <p className="text-ink-600 m-0 max-w-[72ch] text-[13px] leading-[1.6] font-normal text-pretty">
            Permanently removes {customerName} and their conversations. Their
            orders are kept for revenue history, but un-linked from the
            customer.
          </p>
        </div>
        <Btn variant="danger" onClick={() => setOpen(true)} disabled={busy}>
          <TrashIcon size={15} />
          Delete customer
        </Btn>
      </div>

      <ConfirmSheet
        open={open}
        onClose={() => !busy && setOpen(false)}
        onConfirm={onConfirm}
        busy={busy}
        destructive
        icon={<TrashIcon size={20} />}
        title="Delete customer?"
        body={`This permanently removes ${customerName} and their conversations — it cannot be undone. Their orders are kept for revenue history but un-linked from the customer.`}
        confirmLabel="Delete permanently"
      />
    </div>
  );
}
