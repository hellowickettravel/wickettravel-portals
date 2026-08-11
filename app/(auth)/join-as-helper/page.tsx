import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthHeading } from "@/components/auth/auth-heading";

export const metadata: Metadata = {
  title: "Become a helper · Wicket Travel",
  description:
    "Already flying? Keep an eye on someone's parent on the way and get paid for it.",
};

/**
 * The helper's own front door.
 *
 * `/signup?as=helper` works and still does, but a query string is not a page
 * you can put on a poster, in an email, or in front of somebody deciding
 * whether this is for them. A helper is being asked to do something quite
 * unlike buying a flight — take responsibility for a stranger's parent — so
 * they get a page that explains the job, what it pays, and what we will ask of
 * them, BEFORE the form.
 *
 * The form itself is the shared sign-up: one account system, one password
 * policy, one place email confirmation is handled. This page hands off to it
 * with ?as=helper, which is what sets the role.
 */

const STEPS = [
  {
    n: "1",
    title: "Tell us who you are",
    body: "Name, email and a password. Two minutes.",
  },
  {
    n: "2",
    title: "Get verified",
    body: "A photo ID and a confirmed email address, checked by a person — not a machine. This is what families are trusting when they say yes.",
  },
  {
    n: "3",
    title: "Post a flight you're already taking",
    body: "Route, date, the help you could give and what you'd like to be paid. We only match confirmed flights first.",
  },
  {
    n: "4",
    title: "We introduce you",
    body: "When a family on the same route accepts, we pass on contact details and you arrange the rest together.",
  },
];

const TRUTHS = [
  "You are not a carer, a nurse or a chaperone. You keep an eye on someone and help them through an airport.",
  "You choose every trip. Nothing is assigned to you and there is no minimum.",
  "You are paid per trip. The family pays Wicket, we take a commission, the rest is yours.",
  "Nothing you post is public until our team has checked it, and your contact details are never shown on the board.",
];

export default function JoinAsHelperPage() {
  return (
    <AuthShell screen="helper">
      <AuthHeading
        title="Become a helper"
        description="You're already flying. Keep an eye on someone's parent on the way, and be paid for it."
      />

      <ol className="m-0 mb-7 flex list-none flex-col gap-4 p-0">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-3.5">
            <span className="bg-ink-100 text-ink-700 flex size-7 flex-none items-center justify-center rounded-full text-[12.5px] font-semibold tabular-nums">
              {s.n}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-ink-900 text-[14px] font-medium">
                {s.title}
              </span>
              <span className="text-ink-600 text-[13px] leading-[1.55] font-normal text-pretty">
                {s.body}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="border-ink-200 mb-7 rounded-[10px] border p-4">
        <p className="text-ink-900 m-0 mb-2.5 text-[13px] font-medium">
          Before you sign up, so there are no surprises
        </p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {TRUTHS.map((t) => (
            <li key={t} className="flex gap-2.5">
              <span className="bg-ink-400 mt-[7px] size-1.5 flex-none rounded-full" />
              <span className="text-ink-600 text-[12.5px] leading-[1.55] font-normal text-pretty">
                {t}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/signup?as=helper"
        className="bg-ember-600 hover:bg-ember-700 focus:bg-ember-700 mb-4 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold tracking-[-0.008em] text-white no-underline outline-none [transition:background-color_140ms_ease,transform_90ms_ease] hover:no-underline focus:shadow-[0_0_0_3px_#fff,0_0_0_6px_oklch(0.565_0.172_47_/_0.42)] active:translate-y-px"
      >
        Create my helper account
      </Link>

      <p className="text-ink-600 m-0 text-center text-[13.5px] font-normal">
        Already have one?{" "}
        <Link href="/login" className="font-medium">
          Sign in
        </Link>
      </p>
      <p className="text-ink-500 m-0 mt-5 text-center text-[12.5px] leading-[1.55] font-normal text-pretty">
        Looking for help for your own parent instead?{" "}
        <Link href="/signup" className="font-medium">
          Create a customer account
        </Link>{" "}
        — that&apos;s the other side of the same board.
      </p>
    </AuthShell>
  );
}
