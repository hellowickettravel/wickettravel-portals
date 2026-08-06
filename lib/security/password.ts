/**
 * Password policy — the single source of truth for what counts as an acceptable
 * account password. Pure (no imports), so both the client signup form (live
 * feedback) and any server-side check can share it.
 *
 * Policy: at least 8 characters, with a lowercase letter, an uppercase letter,
 * and a digit. This blocks the weakest credential-stuffing targets without
 * frustrating real users. We deliberately keep it simple + transparent (the UI
 * shows every rule) rather than an opaque score.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72; // bcrypt/GoTrue hard limit — reject longer

export type PasswordRule = {
  id: string;
  /** Full sentence — used for the single-message fallback (toast, server error). */
  label: string;
  /** Terse form for the inline checklist, which lays rules out two per row. */
  shortLabel: string;
  test: (pw: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    shortLabel: `${MIN_PASSWORD_LENGTH}+ characters`,
    test: (pw) => pw.length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: "lower",
    label: "A lowercase letter (a–z)",
    shortLabel: "One lowercase letter",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    id: "upper",
    label: "An uppercase letter (A–Z)",
    shortLabel: "One capital letter",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: "number",
    label: "A number (0–9)",
    shortLabel: "One number",
    test: (pw) => /\d/.test(pw),
  },
];

export type PasswordCheck = {
  ok: boolean;
  /** Which rules currently pass — drives the live checklist UI. */
  passed: Record<string, boolean>;
  /** 0–4: how many rules pass, for a strength meter. */
  score: number;
  /** First failing rule's message (for a single toast fallback). */
  firstError: string | null;
};

/** Evaluate a password against the policy. Never throws. */
export function checkPassword(pw: string): PasswordCheck {
  const passed: Record<string, boolean> = {};
  let score = 0;
  let firstError: string | null = null;

  for (const rule of PASSWORD_RULES) {
    const ok = rule.test(pw);
    passed[rule.id] = ok;
    if (ok) score += 1;
    else if (!firstError) firstError = rule.label;
  }

  const withinMax = pw.length <= MAX_PASSWORD_LENGTH;
  const ok = score === PASSWORD_RULES.length && withinMax;

  if (!withinMax && !firstError) {
    firstError = `Keep it under ${MAX_PASSWORD_LENGTH} characters`;
  }

  return { ok, passed, score, firstError };
}
