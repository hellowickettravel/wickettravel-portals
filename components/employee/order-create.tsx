"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createOrderFromChat, listMyInbox } from "@/lib/actions/employee";
import { MY_INBOX_KEY } from "@/lib/query-keys";
import {
  AdminOrderForm,
  type AdminOrderCustomer,
} from "@/components/admin/admin-order-form";

/**
 * Employee create-order screen — the design's three-step wizard, with the
 * employee's own boundary around it.
 *
 * The picker is sourced from `listMyInbox`, which RLS scopes to the
 * conversations assigned to this employee, so an employee can only raise an
 * order against a customer they already own. Creation goes through
 * `createOrderFromChat`, which re-checks the access level server-side and
 * stamps `created_by` as them.
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

  // customerId → conversationId, so the wizard can keep asking for a customer
  // while the action gets the conversation it needs.
  const { customers, conversationFor } = useMemo(() => {
    const map = new Map<string, string>();
    const list: AdminOrderCustomer[] = [];
    for (const c of inbox ?? []) {
      const id = c.customer?.id;
      if (!id || map.has(id)) continue;
      map.set(id, c.id);
      list.push({
        id,
        label: c.customer?.name || c.customer?.wa_phone || "Customer",
      });
    }
    // A conversation opened from a chat wins the default slot.
    if (presetConversationId) {
      const preset = (inbox ?? []).find((c) => c.id === presetConversationId);
      const pid = preset?.customer?.id;
      if (pid) {
        const i = list.findIndex((x) => x.id === pid);
        if (i > 0) list.unshift(list.splice(i, 1)[0]);
      }
    }
    return { customers: list, conversationFor: map };
  }, [inbox, presetConversationId]);

  return (
    <AdminOrderForm
      customers={customers}
      basePath="/employee"
      onCreate={async (input) => {
        const conversationId = conversationFor.get(input.customerId);
        if (!conversationId) {
          return {
            ok: false as const,
            error:
              "Pick a customer you have a conversation with — orders are raised from a chat.",
          };
        }
        const res = await createOrderFromChat({
          ...input,
          conversationId,
          customerId: input.customerId,
        });
        return res.ok
          ? { ok: true as const, data: { orderId: res.data.orderId } }
          : res;
      }}
    />
  );
}
