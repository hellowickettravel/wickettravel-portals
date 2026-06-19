"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Mail,
  MessageCircleQuestion,
  LifeBuoy,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createSupportTicket,
  listMySupportTickets,
} from "@/lib/actions/support";
import { MY_SUPPORT_TICKETS_KEY } from "@/lib/query-keys";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How do I reply to a customer?",
    a: "Open Messages, pick a conversation from the left, type in the message bar and hit send. Replies sync to the customer's WhatsApp once the integration is live.",
  },
  {
    q: "How do I create an order from a chat?",
    a: "Inside a conversation, click “Create order” in the header. It pre-fills the order form with the customer's details so you only confirm the fare and dates.",
  },
  {
    q: "What do the access levels mean?",
    a: "Full — manage chats and create orders. Semi-admin — everything Full can do plus order editing & status management (open/close/cancel/reopen). Chat-only — conversations only, with no access to Orders. View-only — read-only: you can see conversations and orders but can't reply or edit.",
  },
  {
    q: "Why can't I edit an order or change its status?",
    a: "Editing orders and changing their status (close/cancel/reopen) requires Semi-admin access. With Full access you can create and view orders but not edit them after the fact. Ask an admin to switch you to Semi-admin if you need it.",
  },
  {
    q: "I can't see the Orders tab — why?",
    a: "Your access level is set to Chat-only. Ask an admin to change it to Full or Semi-admin if you need to work with orders.",
  },
];

function fieldLabel(text: string) {
  return (
    <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
      {text}
    </span>
  );
}

export function EmployeeSupport({ adminEmail }: { adminEmail: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");

  const { data: tickets } = useQuery({
    queryKey: MY_SUPPORT_TICKETS_KEY,
    queryFn: listMySupportTickets,
  });
  const myTickets = tickets ?? [];

  const mutation = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't submit", { description: res.error });
        return;
      }
      toast.success("Issue submitted", {
        description: "An admin has been notified and will follow up.",
      });
      setSubject("");
      setDetails("");
      queryClient.invalidateQueries({ queryKey: MY_SUPPORT_TICKETS_KEY });
    },
    onError: () =>
      toast.error("Couldn't submit", { description: "Please try again." }),
  });

  function submitIssue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) {
      toast.error("Subject and details are both required.");
      return;
    }
    mutation.mutate({ subject, message: details });
  }

  const mailtoHref = `mailto:${adminEmail}?subject=${encodeURIComponent(
    "Support request from the employee portal"
  )}`;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Help"
        title="Support"
        subtitle="Find answers fast or reach your admin."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* FAQ */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Frequently asked questions"
            action={<MessageCircleQuestion className="size-5 text-brand" />}
          >
            <ul className="divide-y divide-border">
              {FAQS.map((f, i) => {
                const isOpen = open === i;
                return (
                  <li key={f.q}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 py-4 text-left"
                    >
                      <span className="text-sm font-medium text-foreground">{f.q}</span>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>
                    {isOpen ? (
                      <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
                        {f.a}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </div>

        {/* Contact admin */}
        <SectionCard title="Contact admin">
          <div className="flex flex-col items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-chip text-brand-dark">
              <LifeBuoy className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              Need something changed — access level, assignments or a bug? Email
              your administrator directly.
            </p>
            <Button variant="outline" className="w-full" render={<a href={mailtoHref} />}>
              <Mail className="size-4" />
              Email admin
            </Button>
          </div>
        </SectionCard>
      </div>

      {/* Raise an issue */}
      <SectionCard
        title="Raise an internal issue"
        description="Report a bug or request help — it lands in your admin's Support queue."
      >
        <form onSubmit={submitIssue} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">{fieldLabel("Subject")}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary"
              required
              disabled={mutation.isPending}
              className="h-10 rounded-[10px] bg-neutral-soft"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">{fieldLabel("Details")}</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what's happening…"
              required
              disabled={mutation.isPending}
              className="min-h-28 rounded-[10px] bg-neutral-soft"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit issue"
              )}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* My tickets */}
      <SectionCard title={`My tickets (${myTickets.length})`} flush>
        {myTickets.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            You haven&apos;t raised any issues yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {myTickets.map((t) => (
              <li key={t.id} className="flex items-start gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {t.subject}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {t.message}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {fmtRelative(t.created_at)}
                  </p>
                </div>
                <StatusBadge tone={t.status === "resolved" ? "green" : "amber"}>
                  {t.status === "resolved" ? "Resolved" : "Open"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
