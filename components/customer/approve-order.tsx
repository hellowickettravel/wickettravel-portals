"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approveMyOrder } from "@/lib/actions/order-lifecycle";
import { AUTO_COMPLETE_HOURS } from "@/lib/orders/display";
import { fmtDate } from "@/lib/format";
import { Btn, Card, CardHead } from "@/components/admin/ui";
import { CheckCircleIcon } from "@/components/admin/icons";

/**
 * "Your booking is ready — approve it."
 *
 * Shown on a customer's order once staff have marked it delivered and before
 * it completes. The card exists because the alternative — an order that
 * silently flips to Completed a day later — gives the traveller no moment to
 * say "this is wrong" while somebody is still holding the file.
 *
 * The deadline is stated on the card rather than only in the notification,
 * because a notification is read once and this screen is where the decision is
 * actually made.
 */
export function ApproveOrder({
  orderId,
  deliveredAt,
}: {
  orderId: string;
  deliveredAt: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const closesAt = new Date(
    new Date(deliveredAt).getTime() + AUTO_COMPLETE_HOURS * 60 * 60 * 1000
  );

  async function approve() {
    setBusy(true);
    const res = await approveMyOrder(orderId);
    setBusy(false);
    if (!res.ok) {
      toast.error("Couldn't approve this order", { description: res.error });
      return;
    }
    toast.success("Thanks — your order is complete", {
      description: "Your documents stay in this thread.",
    });
    router.refresh();
  }

  return (
    <Card className="border-ok-edge">
      <CardHead
        title="Your booking is ready"
        hint={`Delivered ${fmtDate(deliveredAt)}. If you don't confirm, this order completes on its own on ${fmtDate(closesAt.toISOString())}.`}
        icon={<CheckCircleIcon size={18} />}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-ink-600 m-0 max-w-[62ch] text-[13px] leading-[1.6] font-normal text-pretty">
          Check the flight details and passenger names above. If everything is
          right, approve it and we&apos;ll close the order. If something is
          wrong, message us on this order instead — approving is final.
        </p>
        <Btn
          variant="ember"
          onClick={approve}
          pending={busy}
          pendingLabel="Approving…"
        >
          <CheckCircleIcon size={15} />
          Approve &amp; complete
        </Btn>
      </div>
    </Card>
  );
}
