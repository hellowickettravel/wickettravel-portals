import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing email over SMTP. Any mailbox provider works — Google Workspace,
 * Microsoft 365, Zoho, or a transactional service's SMTP relay (Resend,
 * Postmark, SendGrid, Brevo). Configure with:
 *
 *   SMTP_HOST, SMTP_PORT (587 default; 465 implies TLS), SMTP_USER, SMTP_PASS,
 *   EMAIL_FROM  e.g. "Wicket Travel <hello@wickettravel.com>"
 *
 * Without SMTP_HOST, development sends into a throwaway Ethereal inbox: the
 * message is captured, never delivered, and comes back with a preview link.
 * Production without SMTP_HOST refuses to send rather than pretending.
 */

export type MailMode = "smtp" | "test" | "off";

export type MailStatus = { mode: MailMode; from: string | null };

export type SendResult =
  | { ok: true; previewUrl: string | null }
  | { ok: false; error: string };

function mode(): MailMode {
  if (process.env.SMTP_HOST) return "smtp";
  return process.env.NODE_ENV === "production" ? "off" : "test";
}

export function getMailStatus(): MailStatus {
  const m = mode();
  return {
    mode: m,
    from:
      m === "smtp"
        ? process.env.EMAIL_FROM || process.env.SMTP_USER || null
        : m === "test"
          ? "Ethereal test inbox"
          : null,
  };
}

let transport: Promise<{ t: Transporter; from: string }> | null = null;

function getTransport() {
  if (transport) return transport;
  transport = (async () => {
    if (mode() === "smtp") {
      const port = Number(process.env.SMTP_PORT || 587);
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
        pool: true,
        maxConnections: 3,
      });
      return { t, from: process.env.EMAIL_FROM || process.env.SMTP_USER || "" };
    }
    const account = await nodemailer.createTestAccount();
    const t = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    });
    return { t, from: `Wicket Travel (test) <${account.user}>` };
  })();
  // A failed setup (bad network, bad host) must not be cached forever.
  transport.catch(() => {
    transport = null;
  });
  return transport;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
}): Promise<SendResult> {
  if (mode() === "off") {
    return { ok: false, error: "Email isn't set up yet — add the SMTP settings to the server." };
  }
  try {
    const { t, from } = await getTransport();
    if (!from) return { ok: false, error: "EMAIL_FROM is not set." };
    const info = await t.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo || undefined,
    });
    const preview = mode() === "test" ? nodemailer.getTestMessageUrl(info) : false;
    return { ok: true, previewUrl: preview || null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The email could not be sent." };
  }
}
