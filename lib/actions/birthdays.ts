"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMissingColumn, isMissingTable, isUuid } from "@/lib/db/errors";
import { getMailStatus, sendMail, type MailStatus } from "@/lib/email";
import {
  DEFAULT_BIRTHDAY_MESSAGE,
  DEFAULT_BIRTHDAY_SUBJECT,
  MESSAGE_MAX,
  SUBJECT_MAX,
  isPlausibleDob,
  nextBirthday,
  renderBirthdayEmail,
  todayYMD,
  type BirthdayBrand,
} from "@/lib/birthdays";

/**
 * Birthday wishes. Admin-only: every action re-checks the caller's role, and
 * recipients are always resolved here from customer ids — the browser never
 * supplies an email address, so this can't be turned into a way to mail
 * arbitrary people.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** How far ahead "Coming up" looks, and how early a wish may be sent. */
const WINDOW_DAYS = 30;
const MAX_PER_SEND = 200;

async function requireAdmin() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") throw new Error("Unauthorized");
  return { user, profile };
}

export type BirthdayRowStatus = "ready" | "sent" | "failed" | "no_email" | "suspended";

export type BirthdayRow = {
  customerId: string;
  name: string;
  email: string | null;
  dateOfBirth: string;
  /** This year's (or next year's) birthday, "YYYY-MM-DD". */
  date: string;
  year: number;
  daysUntil: number;
  turning: number | null;
  status: BirthdayRowStatus;
  sentAt: string | null;
  error: string | null;
};

export type MissingBirthday = { customerId: string; name: string; email: string | null };

export type BirthdayHistoryItem = {
  id: string;
  customerId: string | null;
  name: string;
  email: string;
  status: "sent" | "failed";
  error: string | null;
  sentAt: string;
};

export type BirthdayTemplate = { subject: string; message: string };

export type BirthdayOverview = {
  today: BirthdayRow[];
  upcoming: BirthdayRow[];
  missing: MissingBirthday[];
  missingCount: number;
  withBirthdayCount: number;
  history: BirthdayHistoryItem[];
  template: BirthdayTemplate;
  brand: BirthdayBrand;
  mail: MailStatus;
  /** Which migration is still to run, if any. Sending waits for 0023. */
  setup: null | "0022" | "0023";
  todayISO: string;
};

type CustomerRow = {
  id: string;
  profile_id: string | null;
  name: string | null;
  date_of_birth: string | null;
};

type ProfileRow = { id: string; email: string | null; is_active: boolean | null };

type LogRow = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  email: string;
  birthday_year: number;
  status: "sent" | "failed";
  error: string | null;
  sent_at: string;
};

async function loadSettings(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle<Record<string, string | null>>();
  const brand: BirthdayBrand = {
    businessName: data?.business_name?.trim() || "Wicket Travel",
    logoUrl: data?.logo_url ?? null,
    businessEmail: data?.business_email ?? null,
    businessPhone: data?.business_phone ?? null,
    businessAddress: data?.business_address ?? null,
  };
  const template: BirthdayTemplate = {
    subject: data?.birthday_subject?.trim() || DEFAULT_BIRTHDAY_SUBJECT,
    message: data?.birthday_message?.trim() || DEFAULT_BIRTHDAY_MESSAGE,
  };
  return { brand, template };
}

export async function getBirthdayOverview(): Promise<BirthdayOverview> {
  await requireAdmin();
  const supabase = await createClient();
  const today = todayYMD();
  const todayISO = `${today.y}-${String(today.m).padStart(2, "0")}-${String(today.d).padStart(2, "0")}`;

  const [settings, customersRes, logRes] = await Promise.all([
    loadSettings(supabase),
    supabase
      .from("customers")
      .select("id, profile_id, name, date_of_birth")
      .returns<CustomerRow[]>(),
    supabase
      .from("birthday_emails")
      .select("id, customer_id, customer_name, email, birthday_year, status, error, sent_at")
      .order("sent_at", { ascending: false })
      .limit(1000)
      .returns<LogRow[]>(),
  ]);

  const empty: BirthdayOverview = {
    today: [],
    upcoming: [],
    missing: [],
    missingCount: 0,
    withBirthdayCount: 0,
    history: [],
    ...settings,
    mail: getMailStatus(),
    setup: null,
    todayISO,
  };

  if (customersRes.error) {
    if (isMissingColumn(customersRes.error)) return { ...empty, setup: "0022" };
    throw customersRes.error;
  }

  let setup: BirthdayOverview["setup"] = null;
  let logs: LogRow[] = [];
  if (logRes.error) {
    if (!isMissingTable(logRes.error)) throw logRes.error;
    setup = "0023";
  } else {
    logs = logRes.data ?? [];
  }

  const customers = customersRes.data ?? [];
  const profileIds = customers.map((c) => c.profile_id).filter((id): id is string => !!id);
  const { data: profiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, is_active")
        .in("id", profileIds)
        .returns<ProfileRow[]>()
    : { data: [] as ProfileRow[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Latest attempt per customer per birthday year — logs are newest first.
  const attempt = new Map<string, LogRow>();
  for (const l of logs) {
    const key = `${l.customer_id}:${l.birthday_year}`;
    const seen = attempt.get(key);
    // A success always wins over a later failed retry of the same birthday.
    if (!seen || (l.status === "sent" && seen.status !== "sent")) attempt.set(key, l);
  }

  const rows: BirthdayRow[] = [];
  const missing: MissingBirthday[] = [];
  for (const c of customers) {
    const profile = c.profile_id ? profileById.get(c.profile_id) : undefined;
    const email = profile?.email?.trim() || null;
    const name = c.name?.trim() || "Unnamed customer";
    const next = nextBirthday(c.date_of_birth, today);
    if (!next) {
      missing.push({ customerId: c.id, name, email });
      continue;
    }
    if (next.daysUntil > WINDOW_DAYS) continue;

    const log = attempt.get(`${c.id}:${next.year}`);
    let status: BirthdayRowStatus = "ready";
    if (log?.status === "sent") status = "sent";
    else if (!email || !EMAIL_RE.test(email)) status = "no_email";
    else if (profile?.is_active === false) status = "suspended";
    else if (log?.status === "failed") status = "failed";

    rows.push({
      customerId: c.id,
      name,
      email,
      dateOfBirth: c.date_of_birth!,
      ...next,
      status,
      sentAt: log?.status === "sent" ? log.sent_at : null,
      error: log?.status === "failed" ? log.error : null,
    });
  }

  rows.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
  // Customers who can actually be emailed first — they are the actionable ones.
  missing.sort((a, b) => Number(!a.email) - Number(!b.email) || a.name.localeCompare(b.name));

  return {
    ...empty,
    today: rows.filter((r) => r.daysUntil === 0),
    upcoming: rows.filter((r) => r.daysUntil > 0),
    missing: missing.slice(0, 100),
    missingCount: missing.length,
    withBirthdayCount: customers.length - missing.length,
    history: logs.slice(0, 20).map((l) => ({
      id: l.id,
      customerId: l.customer_id,
      name: l.customer_name || "Customer",
      email: l.email,
      status: l.status,
      error: l.error,
      sentAt: l.sent_at,
    })),
    setup,
  };
}

/** Today's birthdays still waiting for a wish. Sidebar badge; never throws. */
export async function countBirthdaysToSend(): Promise<number> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const today = todayYMD();
    const { data, error } = await supabase
      .from("customers")
      .select("id, date_of_birth")
      .not("date_of_birth", "is", null)
      .not("profile_id", "is", null)
      .returns<{ id: string; date_of_birth: string }[]>();
    if (error) return 0;
    const due = (data ?? []).filter((c) => nextBirthday(c.date_of_birth, today)?.daysUntil === 0);
    if (due.length === 0) return 0;
    const { data: sent } = await supabase
      .from("birthday_emails")
      .select("customer_id")
      .eq("birthday_year", today.y)
      .eq("status", "sent")
      .in("customer_id", due.map((c) => c.id))
      .returns<{ customer_id: string }[]>();
    const done = new Set((sent ?? []).map((s) => s.customer_id));
    return due.filter((c) => !done.has(c.id)).length;
  } catch {
    return 0;
  }
}

export async function saveBirthdayTemplate(input: BirthdayTemplate): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const subject = input.subject.replace(/[\r\n]+/g, " ").trim();
  const message = input.message.replace(/\r\n/g, "\n").trim();
  if (!subject) return { ok: false, error: "The subject can't be empty." };
  if (!message) return { ok: false, error: "The message can't be empty." };
  if (subject.length > SUBJECT_MAX)
    return { ok: false, error: `Keep the subject under ${SUBJECT_MAX} characters.` };
  if (message.length > MESSAGE_MAX)
    return { ok: false, error: `Keep the message under ${MESSAGE_MAX} characters.` };

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_settings")
    .upsert(
      {
        id: 1,
        birthday_subject: subject,
        birthday_message: message,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (error) {
    if (isMissingColumn(error)) {
      return {
        ok: false,
        error: "Run migration 0023_birthday_wishes.sql in Supabase to save your own message.",
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type SendOutcome = {
  sent: { name: string; previewUrl: string | null }[];
  skipped: { name: string; reason: string }[];
  failed: { name: string; error: string }[];
};

export async function sendBirthdayWishes(input: {
  customerIds: string[];
}): Promise<{ ok: true; data: SendOutcome } | { ok: false; error: string }> {
  const auth = await requireAdmin().catch(() => null);
  if (!auth) return { ok: false, error: "Unauthorized" };
  const adminId = auth.user.id;

  const ids = Array.from(new Set(input.customerIds)).filter(isUuid);
  if (ids.length === 0) return { ok: false, error: "Choose at least one customer." };
  if (ids.length > MAX_PER_SEND)
    return { ok: false, error: `Send to at most ${MAX_PER_SEND} customers at a time.` };

  const mail = getMailStatus();
  if (mail.mode === "off") {
    return { ok: false, error: "Email isn't set up yet — add the SMTP settings to the server." };
  }

  const supabase = await createClient();
  const today = todayYMD();
  const [{ brand, template }, customersRes] = await Promise.all([
    loadSettings(supabase),
    supabase
      .from("customers")
      .select("id, profile_id, name, date_of_birth")
      .in("id", ids)
      .returns<CustomerRow[]>(),
  ]);
  if (customersRes.error) return { ok: false, error: customersRes.error.message };

  const customers = customersRes.data ?? [];
  const profileIds = customers.map((c) => c.profile_id).filter((id): id is string => !!id);
  const { data: profiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, is_active")
        .in("id", profileIds)
        .returns<ProfileRow[]>()
    : { data: [] as ProfileRow[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const outcome: SendOutcome = { sent: [], skipped: [], failed: [] };

  const jobs = customers.map((c) => async () => {
    const name = c.name?.trim() || "Unnamed customer";
    const profile = c.profile_id ? profileById.get(c.profile_id) : undefined;
    const email = profile?.email?.trim().toLowerCase() || "";
    const next = nextBirthday(c.date_of_birth, today);

    if (!next) return void outcome.skipped.push({ name, reason: "No birthday on file" });
    if (next.daysUntil > WINDOW_DAYS)
      return void outcome.skipped.push({ name, reason: "Birthday isn't coming up" });
    if (!EMAIL_RE.test(email)) return void outcome.skipped.push({ name, reason: "No email address" });
    if (profile?.is_active === false)
      return void outcome.skipped.push({ name, reason: "Account suspended" });

    // Claim the birthday BEFORE sending. The partial unique index rejects a
    // second 'sent' row for the same customer and year, so a double click or
    // two admins at once can never produce two emails.
    const { data: claim, error: claimError } = await supabase
      .from("birthday_emails")
      .insert({
        customer_id: c.id,
        email,
        customer_name: name,
        birthday_year: next.year,
        status: "sent",
        sent_by: adminId,
      })
      .select("id")
      .single<{ id: string }>();

    if (claimError || !claim) {
      if (claimError?.code === "23505")
        return void outcome.skipped.push({ name, reason: "Already wished this year" });
      if (isMissingTable(claimError))
        return void outcome.failed.push({
          name,
          error: "Run migration 0023_birthday_wishes.sql in Supabase first.",
        });
      return void outcome.failed.push({ name, error: claimError?.message ?? "Couldn't log the send." });
    }

    const rendered = renderBirthdayEmail({
      subject: template.subject,
      message: template.message,
      recipient: { fullName: name },
      brand,
    });
    const res = await sendMail({ to: email, ...rendered, replyTo: brand.businessEmail });

    if (res.ok) {
      outcome.sent.push({ name, previewUrl: res.previewUrl });
    } else {
      // Release the claim so the wish can be retried, keeping the failure on record.
      await supabase
        .from("birthday_emails")
        .update({ status: "failed", error: res.error.slice(0, 500) })
        .eq("id", claim.id);
      outcome.failed.push({ name, error: res.error });
    }
  });

  // A few at a time: mailbox providers throttle bursts from one sender.
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: Math.min(3, queue.length) }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) await job();
    })
  );

  for (const id of ids) {
    if (!customers.some((c) => c.id === id))
      outcome.skipped.push({ name: "Unknown customer", reason: "Customer no longer exists" });
  }

  return { ok: true, data: outcome };
}

/** Send the current message to the signed-in admin, as a customer would see it. */
export async function sendBirthdayTest(
  draft?: BirthdayTemplate
): Promise<{ ok: true; to: string; previewUrl: string | null } | { ok: false; error: string }> {
  const auth = await requireAdmin().catch(() => null);
  if (!auth) return { ok: false, error: "Unauthorized" };
  const { user, profile } = auth;
  if (!user.email) return { ok: false, error: "Your account has no email address." };

  const supabase = await createClient();
  const { brand, template } = await loadSettings(supabase);
  const subject = draft?.subject?.trim() || template.subject;
  const message = draft?.message?.trim() || template.message;
  if (subject.length > SUBJECT_MAX || message.length > MESSAGE_MAX)
    return { ok: false, error: "The message is too long." };

  const rendered = renderBirthdayEmail({
    subject: `[Test] ${subject}`,
    message,
    recipient: { fullName: profile?.full_name || "Alex Traveller" },
    brand,
  });
  const res = await sendMail({ to: user.email, ...rendered, replyTo: brand.businessEmail });
  if (!res.ok) return res;
  return { ok: true, to: user.email, previewUrl: res.previewUrl };
}

/** Admin sets or clears a customer's date of birth. */
export async function setCustomerBirthday(input: {
  customerId: string;
  dateOfBirth: string | null;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  if (!isUuid(input.customerId)) return { ok: false, error: "Unknown customer." };
  const dob = input.dateOfBirth?.trim() || null;
  if (dob && !isPlausibleDob(dob)) return { ok: false, error: "Enter a real date of birth." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ date_of_birth: dob })
    .eq("id", input.customerId);
  if (error) {
    if (isMissingColumn(error))
      return { ok: false, error: "Run migration 0022_person_fields.sql in Supabase first." };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
