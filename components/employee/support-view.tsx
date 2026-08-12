"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createSupportTicket,
  listMySupportTickets,
} from "@/lib/actions/support";
import { MY_SUPPORT_TICKETS_KEY } from "@/lib/query-keys";
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
  textareaClass,
} from "@/components/admin/ui";
import {
  LifebuoyIcon,
  MailIcon,
  PlusIcon,
  SendIcon,
} from "@/components/admin/icons";

const FAQS = [
  {
    q: "How do I reply to a customer?",
    a: "Open Messages, pick a conversation from the left, type in the message bar and hit send. Your reply is delivered live to the customer in their portal.",
  },
  {
    q: "How do I create an order from a chat?",
    a: "Open the conversation, then start a new order — the customer is already selected, so you only confirm the trip, the fare and the passengers.",
  },
  {
    q: "What do the access levels mean?",
    a: "Full — manage chats and create orders. Semi-admin — everything Full can do plus order editing and status management (close, cancel, reopen). Chat-only — conversations only, with no access to Orders. View-only — read-only: you can follow conversations and orders but cannot reply or edit.",
  },
  {
    q: "Why can't I edit an order or change its status?",
    a: "Editing an order and changing its status needs Semi-admin. With Full access you can create and view orders but not edit them after the fact. Ask an administrator to move you up if you need it.",
  },
  {
    q: "I can't see the Orders tab — why?",
    a: "Your access level is Chat-only. Ask an administrator to change it to Full or Semi-admin if you need to work with orders.",
  },
];

/**
 * The employee's help screen: answers first, then the two ways to reach an
 * administrator — email, or an internal ticket that lands in the admin's
 * Support queue. `listMySupportTickets` is scoped to the tickets they raised.
 */
export function EmployeeSupport({ adminEmail }: { adminEmail: string }) {
  // One thread open at a time — see the admin queue for the same reason.
  const [openTicket, setOpenTicket] = useState<string | null>(null);
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
        description: "An administrator has been notified and will follow up.",
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
    <Screen width={1080}>
      <PageHead
        title="Support"
        intro="Answers to the things that come up most, and two ways to reach an administrator."
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
                      isOpen && "bg-marine-tint border-marine-edge text-marine-600 rotate-45"
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

        {/* ------------------------------------------------ contact admin */}
        <Card>
          <CardHead title="Contact an administrator" />
          <div className="flex flex-col items-start gap-3 p-5">
            <span className="bg-marine-wash text-marine-600 flex size-11 flex-none items-center justify-center rounded-[11px]">
              <LifebuoyIcon size={20} />
            </span>
            <p className="text-ink-600 m-0 text-[13px] leading-[1.6] font-normal text-pretty">
              Need your access level changed, work reassigned, or something
              fixed? Email an administrator directly — or raise a ticket below
              so it is tracked.
            </p>
            <Btn as="link" href={mailtoHref} className="w-full">
              <MailIcon size={15} />
              Email an administrator
            </Btn>
          </div>
        </Card>
      </div>

      {/* --------------------------------------------------- raise a ticket */}
      <Card>
        <CardHead
          title="Raise an internal issue"
          hint="It lands in the administrators' Support queue, and you can follow it below."
        />
        <form onSubmit={submitIssue}>
          <div className="flex flex-col gap-4 p-5">
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="sup-subject">Subject</FieldLabel>
              <input
                id="sup-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary"
                required
                disabled={mutation.isPending}
                className={cn(inputClass, focusRing)}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <FieldLabel htmlFor="sup-details">Details</FieldLabel>
              <textarea
                id="sup-details"
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="What is happening, and what did you expect?"
                required
                disabled={mutation.isPending}
                className={cn(textareaClass, focusRing)}
              />
            </label>
          </div>
          <div className="px-5 pb-5">
            <Btn type="submit" variant="ember" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : <SendIcon size={15} />}
              Submit issue
            </Btn>
          </div>
        </form>
      </Card>

      {/* ------------------------------------------------------ my tickets */}
      <Card>
        <CardHead title={`My tickets (${myTickets.length})`} />
        {myTickets.length === 0 ? (
          <EmptyState
            title="No tickets yet"
            body="Anything you raise above appears here, with its status, so you can see when an administrator has picked it up."
          />
        ) : (
          myTickets.map((t) => {
            const isOpen = openTicket === t.id;
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
                    {/* Answering on your own ticket — the exchange used to
                        happen off-platform and leave no record. */}
                    <Btn
                      size="sm"
                      aria-expanded={isOpen}
                      onClick={() => setOpenTicket(isOpen ? null : t.id)}
                    >
                      {isOpen ? "Hide replies" : "View & reply"}
                    </Btn>
                  </span>
                </div>
                {isOpen ? (
                  <div className="border-line-soft bg-surface-1 wt-fade-in rounded-[12px] border p-4">
                    <SupportThread ticketId={t.id} audience="employee" />
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
