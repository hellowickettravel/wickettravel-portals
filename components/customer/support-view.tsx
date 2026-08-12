"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createCustomerSupportTicket,
  createHelperSupportTicket,
  listMyCustomerSupportTickets,
  listMyHelperSupportTickets,
} from "@/lib/actions/support";
import type { SupportTicket } from "@/lib/db/types";
import {
  CUSTOMER_SUPPORT_TICKETS_KEY,
  HELPER_SUPPORT_TICKETS_KEY,
} from "@/lib/query-keys";
import { fmtStamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SupportThread } from "@/components/admin/support-thread";
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
  RowsSkeleton,
  textareaClass,
} from "@/components/admin/ui";
import {
  ChatIcon,
  LifebuoyIcon,
  MailIcon,
  PhoneIcon,
  PlaneIcon,
  PlusIcon,
  SendIcon,
} from "@/components/admin/icons";

/** Helper portal only — the live channels the contact card used to carry. */
const SUPPORT_EMAIL = "support@wickettravel.co.uk";
const SUPPORT_PHONE = "+44 20 8144 0000";

const CUSTOMER_FAQS = [
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
 * A helper's questions are a different set entirely. They are not booking a
 * flight; they are providing a service and waiting to be paid for it, so the
 * things they need answered are about review, matching and money.
 */
const HELPER_FAQS = [
  {
    q: "How long does verification take?",
    a: "We check every photo ID by hand, usually within a working day. You'll see the status change on Get verified and we'll notify you — you don't need to keep checking.",
  },
  {
    q: "Why hasn't my trip been matched yet?",
    a: "We pair a trip with a family going the same route on the same date. If nothing has come through, no request matching your flight has been posted yet. Confirmed flights are matched ahead of provisional ones.",
  },
  {
    q: "When do I get the family's contact details?",
    a: "After you have both accepted the match and the family has settled the fee with us. Contact release is a single, deliberate step our team takes — and it can't be undone.",
  },
  {
    q: "When am I paid, and how much?",
    a: "Your payout is the fee agreed on the listing, less our commission. Money reaches you after the family has paid us and the introduction has been released. Your earnings are on your dashboard.",
  },
  {
    q: "What am I actually agreeing to do?",
    a: "Keep an eye on someone's parent on a flight you were already taking — meeting them at the airport, helping through the gate, staying with them where needed. You are never booking or paying for a ticket.",
  },
];

/**
 * The help screen for the two non-staff portals: answers first, then the ways
 * to reach us — a tracked ticket with a real reply thread, plus whatever live
 * channel that portal has. Both list actions are RLS-scoped to the tickets the
 * signed-in person raised themselves.
 *
 * ## One component, two portals
 *
 * `/helper` used to render an honest contact card instead of this, because
 * `support_tickets` was gated to customers in RLS *and* in the action, so the
 * form would have failed on every submit. `sql/APPLY_HELPER_SUPPORT.sql` opens
 * it, and rather than fork the screen the audience became a prop — the shape
 * is identical, only the questions people ask and the live channel differ.
 *
 * If that SQL has not been run, `createHelperSupportTicket` returns an error
 * naming the file rather than a raw constraint violation.
 */
export function CustomerSupport({
  audience = "customer",
}: {
  audience?: "customer" | "helper";
}) {
  const forHelper = audience === "helper";
  // One thread open at a time — see the admin queue for the same reason.
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");

  const ticketsKey = forHelper
    ? HELPER_SUPPORT_TICKETS_KEY
    : CUSTOMER_SUPPORT_TICKETS_KEY;

  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ticketsKey,
    queryFn: forHelper
      ? listMyHelperSupportTickets
      : listMyCustomerSupportTickets,
  });
  const myTickets: SupportTicket[] = tickets ?? [];

  const mutation = useMutation({
    mutationFn: forHelper
      ? createHelperSupportTicket
      : createCustomerSupportTicket,
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
      queryClient.invalidateQueries({ queryKey: ticketsKey });
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
        intro={
          forHelper
            ? "Answers to what helpers ask most, and a tracked question our team replies to on the record."
            : "Quick answers to the things that come up most, and two ways to reach us."
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
        {/* ----------------------------------------------------- the FAQ */}
        <Card className="min-[900px]:col-span-2">
          <CardHead title="Frequently asked questions" />
          {(forHelper ? HELPER_FAQS : CUSTOMER_FAQS).map((f, i) => {
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
            {forHelper ? (
              <>
                <p className="text-ink-600 m-0 text-[13px] leading-[1.6] font-normal text-pretty">
                  Once you have been introduced to a family you can message them
                  on the match itself. For anything about review, matching or
                  payment, send us a question below — it is tracked and we reply
                  on the record.
                </p>
                <Btn as="link" href="/helper" variant="marine" className="w-full">
                  <ChatIcon size={15} />
                  My trips &amp; matches
                </Btn>
                <Btn
                  as="link"
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="w-full"
                >
                  <MailIcon size={15} />
                  Email the team
                </Btn>
                <Btn
                  as="link"
                  href={`tel:${SUPPORT_PHONE.replace(/[^+\d]/g, "")}`}
                  className="w-full"
                >
                  <PhoneIcon size={15} />
                  {SUPPORT_PHONE}
                </Btn>
              </>
            ) : (
              <>
                <p className="text-ink-600 m-0 text-[13px] leading-[1.6] font-normal text-pretty">
                  For anything about a live booking, the chat is fastest — it
                  goes straight to the consultant handling it. Use the form
                  below for anything you want tracked as a ticket.
                </p>
                <Btn as="link" href="/customer/messages" variant="marine" className="w-full">
                  <ChatIcon size={15} />
                  Open Messages
                </Btn>
                <Btn as="link" href="/customer/book" className="w-full">
                  <PlaneIcon size={15} />
                  Book a flight
                </Btn>
              </>
            )}
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
        {/* Loading before empty: this list said "No questions yet" during its
            first fetch, to someone who may well have just sent one. */}
        {ticketsLoading ? (
          <RowsSkeleton rows={3} />
        ) : myTickets.length === 0 ? (
          <EmptyState
            title="No questions yet"
            body="Anything you send above appears here with its status, so you can see when someone has picked it up."
          />
        ) : (
          myTickets.map((t) => {
            const open = openTicket === t.id;
            return (
              <div
                key={t.id}
                className="border-line-soft flex flex-col gap-3 border-b px-5 py-4 last:border-b-0"
              >
                <div className="flex items-start gap-4">
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
                  <span className="flex flex-none items-center gap-2.5">
                    <Pill tone={t.status === "resolved" ? "ok" : "warn"}>
                      {t.status === "resolved" ? "Resolved" : "Open"}
                    </Pill>
                    {/* Replying to your own ticket used to be impossible —
                        the answer arrived by email and the ticket stayed
                        silent. Now the whole exchange lives on the record. */}
                    <Btn
                      size="sm"
                      aria-expanded={open}
                      onClick={() => setOpenTicket(open ? null : t.id)}
                    >
                      {open ? "Hide replies" : "View & reply"}
                    </Btn>
                  </span>
                </div>
                {open ? (
                  <div className="border-line-soft bg-surface-1 wt-fade-in rounded-[12px] border p-4">
                    <SupportThread ticketId={t.id} audience={audience} />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </Card>
    </Screen>
  );
}
