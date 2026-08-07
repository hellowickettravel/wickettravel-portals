"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, focusRing } from "@/components/admin/ui";
import { ArrowRightIcon, RouteIcon } from "@/components/admin/icons";
import {
  assignConversation,
  listConversationsForTools,
  listEmployeesForTools,
} from "@/lib/actions/dev";
import {
  ADMIN_TOOLS_CONVERSATIONS_KEY,
  ADMIN_TOOLS_EMPLOYEES_KEY,
} from "@/lib/query-keys";
import { ADMIN_INBOX_KEY } from "@/lib/query-keys";

const selectClass =
  "border-line-field text-ink-800 h-10 w-full cursor-pointer rounded-[10px] border bg-white px-3.5 text-[13px] font-normal outline-none disabled:opacity-50";

/**
 * The design's "Route a conversation" panel. Messaging is fully internal
 * (Supabase Realtime), so this hands an existing customer thread to the
 * employee who should own it — it lands in their live inbox immediately.
 *
 * The design's first field picks an order; ours picks the conversation,
 * because that is the record an assignment actually attaches to here.
 */
export function InboxTools() {
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ADMIN_TOOLS_EMPLOYEES_KEY,
    queryFn: listEmployeesForTools,
  });
  const { data: conversations } = useQuery({
    queryKey: ADMIN_TOOLS_CONVERSATIONS_KEY,
    queryFn: listConversationsForTools,
  });

  const emps = employees ?? [];
  const convos = conversations ?? [];

  const [conv, setConv] = useState("");
  const [emp, setEmp] = useState("");

  const assignMutation = useMutation({
    mutationFn: assignConversation,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Routing failed", { description: res.error });
        return;
      }
      toast.success("Conversation routed", {
        description: "It now appears in that employee's inbox.",
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_TOOLS_CONVERSATIONS_KEY });
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
            Pick a conversation and the employee who should own it — they&apos;ll
            pick up the thread from here.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!conv || !emp) {
            toast.error("Pick a conversation and an employee.");
            return;
          }
          assignMutation.mutate({ conversationId: conv, employeeId: emp });
        }}
        className="flex flex-wrap items-end gap-4 px-5 py-4"
      >
        <label className="flex min-w-0 flex-[1_1_240px] flex-col gap-[7px]">
          <span className="text-ink-700 text-[11.5px] font-medium">
            Conversation
          </span>
          <select
            value={conv}
            onChange={(e) => setConv(e.target.value)}
            disabled={assignMutation.isPending}
            className={cn(selectClass, focusRing)}
          >
            <option value="">Select a conversation…</option>
            {convos.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.customer?.name || c.customer?.wa_phone || "Unknown") +
                  (c.assignedEmployee
                    ? ` — ${c.assignedEmployee}`
                    : " — unassigned")}
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
            disabled={assignMutation.isPending}
            className={cn(selectClass, focusRing)}
          >
            <option value="">Select an employee…</option>
            {emps.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name || e.email || e.id}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          aria-label="Route conversation"
          title="Route conversation"
          disabled={assignMutation.isPending}
          className="bg-marine-500 hover:bg-marine-600 flex size-10 flex-none items-center justify-center rounded-full border-0 text-white outline-none disabled:opacity-60"
        >
          <ArrowRightIcon size={17} />
        </button>
      </form>

      {convos.length === 0 ? (
        <p className="text-ink-600 border-line-soft m-0 border-t px-5 py-3 text-[12px]">
          No conversations yet — they appear here once a customer messages you.
        </p>
      ) : null}
    </Card>
  );
}
