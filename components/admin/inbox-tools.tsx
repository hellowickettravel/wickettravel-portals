"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, Loader2, Route } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/admin/section-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  assignConversation,
  listEmployeesForTools,
  listConversationsForTools,
} from "@/lib/actions/dev";
import {
  ADMIN_TOOLS_EMPLOYEES_KEY,
  ADMIN_TOOLS_CONVERSATIONS_KEY,
} from "@/lib/query-keys";

function fieldLabel(text: string) {
  return (
    <span className="text-xs font-medium uppercase tracking-wider text-tx-muted">
      {text}
    </span>
  );
}

const selectClass =
  "h-10 w-full rounded-control border border-input bg-sunk px-3 text-base text-foreground outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:border-marine focus-visible:ring-[3px] focus-visible:ring-marine/25 sm:text-sm";

/**
 * Admin conversation-routing panel. Messaging is fully internal (Supabase
 * Realtime), so customers send their own messages from the portal — there's no
 * mock injection. This panel lets an admin route any conversation to an
 * employee so it lands in that employee's live inbox.
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

  // Assign form
  const [assignConv, setAssignConv] = useState("");
  const [assignEmp, setAssignEmp] = useState("");

  function refreshTools() {
    queryClient.invalidateQueries({ queryKey: ADMIN_TOOLS_CONVERSATIONS_KEY });
  }

  const assignMutation = useMutation({
    mutationFn: assignConversation,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Assign failed", { description: res.error });
        return;
      }
      toast.success("Conversation assigned", {
        description: "It now appears in that employee's inbox.",
      });
      refreshTools();
    },
    onError: () =>
      toast.error("Assign failed", { description: "Please try again." }),
  });

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <Route className="size-4 text-marine" />
          Route a conversation
        </span>
      }
      description="Assign a customer conversation to an employee so it lands in their live inbox."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!assignConv || !assignEmp) {
            toast.error("Pick a conversation and an employee.");
            return;
          }
          assignMutation.mutate({
            conversationId: assignConv,
            employeeId: assignEmp,
          });
        }}
        className="max-w-xl space-y-3 rounded-card border border-border bg-sunk/40 p-4"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserCheck className="size-4 text-marine" />
          Assign a conversation
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="assign-conv">{fieldLabel("Conversation")}</Label>
          <select
            id="assign-conv"
            value={assignConv}
            onChange={(e) => setAssignConv(e.target.value)}
            disabled={assignMutation.isPending}
            className={selectClass}
          >
            <option value="">— Select conversation —</option>
            {convos.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.customer?.name || c.customer?.wa_phone || "Unknown") +
                  (c.assignedEmployee ? ` (→ ${c.assignedEmployee})` : " (unassigned)")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assign-emp">{fieldLabel("Employee")}</Label>
          <select
            id="assign-emp"
            value={assignEmp}
            onChange={(e) => setAssignEmp(e.target.value)}
            disabled={assignMutation.isPending}
            className={selectClass}
          >
            <option value="">— Select employee —</option>
            {emps.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name || e.email || e.id}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={assignMutation.isPending}>
          {assignMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Assigning…
            </>
          ) : (
            "Assign conversation"
          )}
        </Button>
        {convos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No conversations yet — they appear here once a customer messages you.
          </p>
        ) : null}
      </form>
    </SectionCard>
  );
}
