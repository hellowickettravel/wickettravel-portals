import { Card, CardHead, ContactButtons, PageHead, Screen } from "@/components/admin/ui";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "@/components/admin/icons";

const SUPPORT_EMAIL = "support@wickettravel.co.uk";
const SUPPORT_PHONE = "+44 20 8144 0000";

/**
 * Helper support.
 *
 * Deliberately NOT the customer ticket form: support_tickets is gated to
 * `role = 'customer'` in RLS as well as in the server action, so rendering
 * that form here would give a helper a button that fails every time. Opening
 * it to helpers means changing a policy on a table that works today, which is
 * its own small piece of work — until then this is an honest contact card
 * rather than a broken form.
 */
export default function HelperSupportPage() {
  const mailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Parents Tickets — helper support"
  )}`;
  const telHref = `tel:${SUPPORT_PHONE.replace(/[^+\d]/g, "")}`;
  const waHref = `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`;

  return (
    <Screen>
      <PageHead
        title="Support"
        intro="Question about a trip, a match or a payment? Our team answers helpers directly."
      />

      <Card>
        <CardHead title="Talk to the team" hint="Weekdays, 9am–6pm UK time" />
        <ContactButtons
          icons={{
            mail: <MailIcon size={24} />,
            whatsapp: <WhatsAppIcon size={24} />,
            phone: <PhoneIcon size={24} />,
          }}
          channels={[
            { key: "mail", label: "Email", sub: SUPPORT_EMAIL, href: mailHref },
            {
              key: "whatsapp",
              label: "WhatsApp",
              sub: SUPPORT_PHONE,
              href: waHref,
              external: true,
            },
            { key: "phone", label: "Call", sub: SUPPORT_PHONE, href: telHref },
          ]}
        />
      </Card>

      <Card>
        <CardHead title="Before you write in" />
        <ul className="text-ink-600 m-0 flex list-none flex-col gap-3 px-5 py-5 text-[13px] leading-[1.55] font-normal">
          {[
            "Your trip is waiting for review — we check every one by hand, usually within a working day.",
            "You haven't been matched yet — we pair you when a family posts the same route and date. Confirmed flights are matched first.",
            "You've been introduced but haven't heard back — message the family on the details we shared, then tell us if they go quiet.",
            "Payment hasn't arrived — money reaches you after the family has paid us and we've released the introduction.",
          ].map((line) => (
            <li key={line} className="flex gap-3">
              <span className="bg-marine-tint mt-[7px] size-1.5 flex-none rounded-full" />
              <span className="text-pretty">{line}</span>
            </li>
          ))}
        </ul>
      </Card>
    </Screen>
  );
}
