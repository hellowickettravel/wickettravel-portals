"use client";

import { useState } from "react";
import { ChevronDown, Mail, MessageCircleQuestion, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    a: "Full lets you manage chats and orders. Chat-only hides Orders. View-only is read-only — you can see conversations and orders but can't reply or edit.",
  },
  {
    q: "I can't see the Orders tab — why?",
    a: "Your access level is set to Chat-only. Ask an admin to change it to Full if you need to manage orders.",
  },
];

function fieldLabel(text: string) {
  return (
    <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
      {text}
    </span>
  );
}

export default function EmployeeSupportPage() {
  const [open, setOpen] = useState<number | null>(0);

  function submitIssue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    toast.success("Issue submitted", {
      description: "UI only — your admin would receive this request.",
    });
  }

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
              Need something changed — access level, assignments or a bug? Reach
              your administrator directly.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => toast.info("Contact admin", { description: "UI only — opens your admin's email." })}
            >
              <Mail className="size-4" />
              Email admin
            </Button>
          </div>
        </SectionCard>
      </div>

      {/* Raise an issue */}
      <SectionCard title="Raise an internal issue" description="Report a bug or request help from the team.">
        <form onSubmit={submitIssue} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">{fieldLabel("Subject")}</Label>
            <Input id="subject" placeholder="Short summary" required className="h-10 rounded-[10px] bg-neutral-soft" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">{fieldLabel("Details")}</Label>
            <Textarea id="details" placeholder="Describe what's happening…" required className="min-h-28 rounded-[10px] bg-neutral-soft" />
          </div>
          <div className="flex justify-end">
            <Button type="submit">Submit issue</Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
