"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createCustomerSupportTicket,
  listMyCustomerSupportTickets,
} from "@/lib/actions/support";
import { CUSTOMER_SUPPORT_TICKETS_KEY } from "@/lib/query-keys";
import { fmtStamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Btn,
  Card,
  CardHead,
  EmptyState,
  FieldLabel,
  PageHead,
  Pill,
  Screen,
  Spinner,
  focusRing,
  inputClass,
  textareaClass,
} from "@/components/admin/ui";
import {
  ChatIcon,
  LifebuoyIcon,
  PlaneIcon,
  PlusIcon,
  SendIcon,
} from "@/components/admin/icons";

const FAQS = [
  {
    q: "How do I get a quote?",
    a: "Go to Book a flight, tell us where and when you want to travel, and our team will come back with a fare. The price appears on the order and you'll get a notification the moment it's ready.",
  },
  {
    q: "Where do I see my prices and order status?",
    a: "Open My orders. Each order shows its latest status and price as soon as our team updates it — the screen refreshes itself, so there's no need to reload.",
  },
  {
    q: "How do I talk to the team?",
    a: "Use Messages for anything general, or open an order and use the thread inside it to keep the conversation attached to that booking. We usually reply within minutes during working hours.",
  },
  {
    q: "How do I pay for a booking?",
    a: "Once you're happy with a quote, the team shares secure payment details with you directly in your chat. We never ask for card details over email.",
  },
  {
    q: "Can I change dates or names after booking?",
    a: "Ask in the order's own thread. Airlines charge for changes and some fares can't be changed at all, so the team will confirm what's possible and what it costs before anything moves.",
  },
];

/**
 * The traveller's help screen: answers first, then the two ways to reach us —
 * the live chat they already have, or a tracked ticket. `listMyCustomerSupportTickets`
 * is RLS-scoped to the tickets they raised themselves.
 */
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
    <Screen width={1080}>
      <PageHead
        title="Support"
        intro="Quick answers to the things that come up most, and two ways to reach us."
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
        {/* ----------------------------------------------------- the FAQ */}
        <Card className="min-[900px]:col-span-2">
          <CardHead title="Frequently asked questions" />
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                className="border-line-soft border-b last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left leading-[normal] outline-none"
                >
                  <span className="text-ink-800 text-[13px] font-medium">
                    {f.q}
                  </span>
                  <span
                    className={cn(
                      "border-line-field text-ink-600 flex size-[26px] flex-none items-center justify-center rounded-full border transition-transform duration-150",
                      isOpen &&
                        "bg-marine-tint border-marine-edge text-marine-600 rotate-45"
                    )}
                  >
                    <PlusIcon size={14} />
                  </span>
                </button>
                {isOpen ? (
                  <p className="text-ink-600 m-0 px-5 pb-4 text-[13px] leading-[1.6] font-normal text-pretty">
                    {f.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </Card>

        {/* ------------------------------------------------- talk to us */}
        <Card>
          <CardHead title="Talk to the team" />
          <div className="flex flex-col items-start gap-3 p-5">
            <span className="bg-marine-wash text-marine-600 flex size-11 flex-none items-center justify-center rounded-[11px]">
              <LifebuoyIcon size={20} />
            </span>
            <p className="text-ink-600 m-0 text-[13px] leading-[1.6] font-normal text-pretty">
              For anything about a live booking, the chat is fastest — it goes
              straight to the consultant handling it. Use the form below for
              anything you want tracked as a ticket.
            </p>
            <Btn as="link" href="/customer/messages" variant="marine" className="w-full">
              <ChatIcon size={15} />
              Open Messages
            </Btn>
            <Btn as="link" href="/customer/book" className="w-full">
              <PlaneIcon size={15} />
              Book a flight
            </Btn>
          </div>
        </Card>
      </div>

      {/* --------------------------------------------------- raise a query */}
      <Card>
        <CardHead
          title="Send us a question"
          hint="It lands with the Wicket Travel team, and you can follow it below."
        />
        <form onSubmit={submitQuery}>
          <div className="flex flex-col gap-4 p-5">
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="cust-subject">Subject</FieldLabel>
              <input
                id="cust-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's it about?"
                required
                disabled={mutation.isPending}
                className={cn(inputClass, focusRing)}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="cust-details">Message</FieldLabel>
              <textarea
                id="cust-details"
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell us how we can help…"
                required
                disabled={mutation.isPending}
                className={cn(textareaClass, focusRing)}
              />
            </label>
          </div>
          <div className="px-5 pb-5">
            <Btn type="submit" variant="ember" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : <SendIcon size={15} />}
              Send question
            </Btn>
          </div>
        </form>
      </Card>

      {/* ------------------------------------------------------ my queries */}
      <Card>
        <CardHead title={`My questions (${myTickets.length})`} />
        {myTickets.length === 0 ? (
          <EmptyState
            title="No questions yet"
            body="Anything you send above appears here with its status, so you can see when someone has picked it up."
          />
        ) : (
          myTickets.map((t) => (
            <div
              key={t.id}
              className="border-line-soft flex items-start gap-4 border-b px-5 py-4 last:border-b-0"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-ink-800 truncate text-[13px] font-medium">
                  {t.subject}
                </span>
                <span className="text-ink-600 line-clamp-2 text-[12.5px] leading-[1.5] font-normal">
                  {t.message}
                </span>
                <span className="text-ink-500 text-[11.5px] font-normal">
                  {fmtStamp(t.created_at)}
                </span>
              </span>
              <Pill tone={t.status === "resolved" ? "ok" : "warn"}>
                {t.status === "resolved" ? "Resolved" : "Open"}
              </Pill>
            </div>
          ))
        )}
      </Card>
    </Screen>
  );
}
