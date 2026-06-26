"use client";

import { useQuery } from "@tanstack/react-query";
import { listMyInbox } from "@/lib/actions/employee";
import { MY_INBOX_KEY } from "@/lib/query-keys";
import {
  OrderForm,
  type OrderFormConversation,
} from "@/components/orders/order-form";

/**
 * Employee create-order screen. Sources the conversation picker from the
 * employee's own inbox (RLS-scoped to their assignments). When launched from a
 * chat the conversation is preselected via `presetConversationId`.
 */
export function EmployeeOrderCreate({
  presetConversationId,
}: {
  presetConversationId?: string;
}) {
  const { data: inbox } = useQuery({
    queryKey: MY_INBOX_KEY,
    queryFn: listMyInbox,
  });

  const conversations: OrderFormConversation[] = (inbox ?? [])
    .filter((c) => c.customer?.id)
    .map((c) => ({
      id: c.id,
      customerId: c.customer?.id ?? null,
      label: c.customer?.name || c.customer?.wa_phone || "Customer",
    }));

  return (
    <OrderForm
      role="employee"
      conversations={conversations}
      presetConversationId={presetConversationId}
    />
  );
}
