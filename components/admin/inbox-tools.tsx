"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, focusRing } from "@/components/admin/ui";
import { ArrowRightIcon, RouteIcon } from "@/components/admin/icons";
import { assignOrder, listEmployees, listOrders } from "@/lib/actions/admin";
import { ADMIN_TOOLS_EMPLOYEES_KEY } from "@/lib/query-keys";
import { ADMIN_INBOX_KEY } from "@/lib/query-keys";
import { routeLabel } from "@/lib/format";

/** The design's select: 40px, 10px radius, 14px gutter, no native chevron. */
const selectClass =
  "border-line-field text-ink-800 h-10 w-full cursor-pointer appearance-none rounded-[10px] border bg-white px-3.5 text-[13px] font-normal outline-none disabled:opacity-50";

const ORDERS_KEY = ["admin", "orders"] as const;

/**
 * The design's "Route a conversation" panel: pick the order and the employee
 * who should own it. Assigning the order is what moves the work — the employee
 * sees the record and its thread in their portal straight away.
 */
export function InboxTools() {
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ADMIN_TOOLS_EMPLOYEES_KEY,
    queryFn: listEmployees,
  });
  const { data: orders } = useQuery({
    queryKey: ORDERS_KEY,
    queryFn: listOrders,
  });

  const emps = useMemo(
    () => (employees ?? []).filter((e) => e.is_active),
    [employees]
  );
  // Work first: anything still open, soonest departure at the top.
  const openOrders = useMemo(
    () =>
      (orders ?? [])
        .filter((o) => o.status === "new" || o.status === "in_progress")
        .sort((a, b) =>
          (a.travel_date ?? "9999").localeCompare(b.travel_date ?? "9999")
        ),
    [orders]
  );

  const [orderId, setOrderId] = useState("");
  const [emp, setEmp] = useState("");

  const route = useMutation({
    mutationFn: assignOrder,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Routing failed", { description: res.error });
        return;
      }
      toast.success("Order routed", {
        description: "It now appears in that employee's portal.",
      });
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_INBOX_KEY });
    },
    onError: () =>
      toast.error("Routing failed", { description: "Please try again." }),
  });

  return (
    <Card>
      <div className="border-line-soft flex items-center gap-3 border-b px-5 py-[15px]">
        <span className="bg-violet-bg text-violet-ink flex size-9 flex-none items-center justify-center rounded-[10px]">
          <RouteIcon size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="text-ink-800 m-0 text-[13.5px] font-semibold tracking-[-0.008em]">
            Route a conversation
          </h2>
          <p className="text-ink-600 m-0 mt-[3px] text-[12px] font-normal">
            Pick an order and the employee who should own it — they&apos;ll pick
            up the thread from here.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!orderId) {
            toast.error("Pick an order to route.");
            return;
          }
          route.mutate({ id: orderId, employeeId: emp || null });
        }}
        className="flex flex-wrap items-end gap-4 px-5 py-4"
      >
        <label className="flex min-w-0 flex-[1_1_240px] flex-col gap-[7px]">
          <span className="text-ink-700 text-[11.5px] font-medium">Order</span>
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            disabled={route.isPending}
            className={cn(selectClass, focusRing)}
          >
            <option value="">Select an order…</option>
            {openOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {`${o.order_number} — ${o.customer?.name ?? "Unassigned customer"} · ${routeLabel(o.route_from, o.route_to)}`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-[1_1_240px] flex-col gap-[7px]">
          <span className="text-ink-700 text-[11.5px] font-medium">
            Assign to employee
          </span>
          <select
            value={emp}
            onChange={(e) => setEmp(e.target.value)}
            disabled={route.isPending}
            className={cn(selectClass, focusRing)}
          >
            {emps.map((e) => (
              <option key={e.id} value={e.id}>
                {`${e.full_name || e.email || e.id}${e.job_title ? ` — ${e.job_title}` : ""}`}
              </option>
            ))}
            <option value="">Unassigned</option>
          </select>
        </label>

        <button
          type="submit"
          aria-label="Route conversation"
          title="Route conversation"
          disabled={route.isPending}
          className="bg-marine-500 hover:bg-marine-600 flex size-10 flex-none items-center justify-center rounded-full border-0 text-white outline-none disabled:opacity-60"
        >
          <ArrowRightIcon size={17} />
        </button>
      </form>

      {openOrders.length === 0 ? (
        <p className="text-ink-600 border-line-soft m-0 border-t px-5 py-3 text-[12px]">
          No open orders to route — new and in-progress orders appear here.
        </p>
      ) : null}
    </Card>
  );
}
