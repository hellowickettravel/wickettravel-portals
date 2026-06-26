"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
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
  createCustomerSupportTicket,
  listMyCustomerSupportTickets,
} from "@/lib/actions/support";
import { CUSTOMER_SUPPORT_TICKETS_KEY } from "@/lib/query-keys";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How do I get a quote?",
    a: "Head to “Book a Flight”, tell us where and when you want to travel, and our team will come back with a fare. You'll see the price appear on your order and get a notification when it's ready.",
  },
  {
    q: "Where do I see my prices and order status?",
    a: "Open “My Orders”. Each order shows its latest status and price the moment our team updates it — no need to refresh.",
  },
  {
    q: "How do I talk to the team?",
    a: "Use “Messages” to chat with us right here in the portal. We typically reply within minutes during working hours.",
  },
  {
    q: "How do I pay for a booking?",
    a: "Once you're happy with a quote, our team will share secure payment details with you directly in your chat.",
  },
];

function fieldLabel(text: string) {
  return (
    <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
      {text}
    </span>
  );
}

export function CustomerSupport() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");

  const { data: tickets } = useQuery({
    queryKey: CUSTOMER_SUPPORT_TICKETS_KEY,
    queryFn: listMyCustomerSupportTickets,
  });
  const myTickets = tickets ?? [];

  const mutation = useMutation({
    mutationFn: createCustomerSupportTicket,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't submit", { description: res.error });
        return;
      }
      toast.success("Query submitted", {
        description: "Our team has been notified and will get back to you.",
      });
      setSubject("");
      setDetails("");
      queryClient.invalidateQueries({ queryKey: CUSTOMER_SUPPORT_TICKETS_KEY });
    },
    onError: () =>
      toast.error("Couldn't submit", { description: "Please try again." }),
  });

  function submitQuery(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) {
      toast.error("Subject and details are both required.");
      return;
    }
    mutation.mutate({ subject, message: details });
  }

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <PageHeader
        eyebrow="Help"
        title="Support"
        subtitle="Find quick answers or send our team a question."
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
                      className="flex w-full items-center justify-between gap-4 rounded-lg py-4 text-left outline-none transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-primary/40"
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

        {/* Contact card */}
        <SectionCard title="Need a hand?">
          <div className="flex flex-col items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-chip text-brand-dark">
              <LifeBuoy className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              Raise a query below and it goes straight to the Wicket team. You can
              also message us any time from your portal.
            </p>
            <Button
              variant="outline"
              className="w-full"
              render={<a href="/customer/messages" />}
            >
              Message the team
            </Button>
          </div>
        </SectionCard>
      </div>

      {/* Raise a query */}
      <SectionCard
        title="Contact support"
        description="Send us a question and we'll get back to you — it lands with the Wicket team."
      >
        <form onSubmit={submitQuery} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">{fieldLabel("Subject")}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's it about?"
              required
              disabled={mutation.isPending}
              className="h-10 rounded-[10px] bg-neutral-soft"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">{fieldLabel("Message")}</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us how we can help…"
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
                  Sending…
                </>
              ) : (
                "Send query"
              )}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* My queries */}
      <SectionCard title={`My queries (${myTickets.length})`} flush>
        {myTickets.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            You haven&apos;t raised any queries yet.
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
