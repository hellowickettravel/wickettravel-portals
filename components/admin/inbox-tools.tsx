"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, UserCheck, Loader2, Beaker } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/admin/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  simulateIncoming,
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
    <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
      {text}
    </span>
  );
}

const selectClass =
  "h-10 w-full rounded-[10px] border border-input bg-neutral-soft px-3 text-sm text-foreground outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25";

/**
 * Admin-only dev panel. WhatsApp isn't wired yet, so this fakes the two things
 * the real Cloud API webhook will eventually do automatically:
 *   • inject an inbound customer message (creating customer/conversation as needed)
 *   • assign a conversation to an employee so it lands in their live inbox
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

  // Simulate form
  const [custName, setCustName] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [body, setBody] = useState("");
  const [simAssignee, setSimAssignee] = useState("");

  // Assign form
  const [assignConv, setAssignConv] = useState("");
  const [assignEmp, setAssignEmp] = useState("");

  function refreshTools() {
    queryClient.invalidateQueries({ queryKey: ADMIN_TOOLS_CONVERSATIONS_KEY });
  }

  const simMutation = useMutation({
    mutationFn: simulateIncoming,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Simulate failed", { description: res.error });
        return;
      }
      toast.success("Incoming message injected", {
        description: simAssignee
          ? "Assigned — it should appear live in that employee's inbox."
          : "Created. Assign it to an employee so it shows in their inbox.",
      });
      setBody("");
      refreshTools();
    },
    onError: () =>
      toast.error("Simulate failed", { description: "Please try again." }),
  });

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
          <Beaker className="size-4 text-brand" />
          Dev tools — mock messaging
        </span>
      }
      description="WhatsApp isn't connected yet. Use these to seed test data and route chats to employees."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Simulate incoming */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            simMutation.mutate({
              customerName: custName,
              waPhone,
              body,
              assignToEmployeeId: simAssignee || null,
            });
          }}
          className="space-y-3 rounded-xl border border-border bg-neutral-soft/40 p-4"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquarePlus className="size-4 text-brand" />
            Simulate incoming message
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sim-name">{fieldLabel("Customer name")}</Label>
              <Input
                id="sim-name"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="James Carter"
                disabled={simMutation.isPending}
                className="h-10 rounded-[10px] bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-phone">{fieldLabel("WhatsApp phone")}</Label>
              <Input
                id="sim-phone"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="+44 7700 900123"
                required
                disabled={simMutation.isPending}
                className="h-10 rounded-[10px] bg-card"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-body">{fieldLabel("Message")}</Label>
            <Textarea
              id="sim-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi, I need a return London → Dubai for 2 adults."
              rows={2}
              required
              disabled={simMutation.isPending}
              className="rounded-[10px] bg-card"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-assignee">{fieldLabel("Auto-assign to (optional)")}</Label>
            <select
              id="sim-assignee"
              value={simAssignee}
              onChange={(e) => setSimAssignee(e.target.value)}
              disabled={simMutation.isPending}
              className={selectClass}
            >
              <option value="">— Don&apos;t assign —</option>
              {emps.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name || e.email || e.id}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={simMutation.isPending} className="w-full">
            {simMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Injecting…
              </>
            ) : (
              "Inject incoming message"
            )}
          </Button>
        </form>

        {/* Assign conversation */}
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
          className="space-y-3 rounded-xl border border-border bg-neutral-soft/40 p-4"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserCheck className="size-4 text-brand" />
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
          <Button
            type="submit"
            variant="outline"
            disabled={assignMutation.isPending}
            className="w-full"
          >
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
              No conversations yet — simulate one first.
            </p>
          ) : null}
        </form>
      </div>
    </SectionCard>
  );
}
