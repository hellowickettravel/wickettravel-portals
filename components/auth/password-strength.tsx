"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PASSWORD_RULES,
  checkPassword,
  passwordStrengthLabel,
} from "@/lib/security/password";

/**
 * Live password requirement checklist + strength meter.
 *
 * Renders nothing until the user starts typing, and reads the shared policy in
 * lib/security/password.ts so the UI and the validation gate can never drift.
 *
 * The meter uses the data hues by meaning rather than a red-to-green ramp:
 * ruby is attention, gold is partway, ocean is fine, jade is confirmed.
 */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const { passed, score } = checkPassword(password);
  const { label, tone } = passwordStrengthLabel(score);

  const barTone =
    tone === "weak"
      ? "bg-ruby"
      : tone === "fair"
        ? "bg-gold"
        : tone === "good"
          ? "bg-ocean"
          : "bg-jade";

  const labelTone =
    tone === "weak"
      ? "text-ruby"
      : tone === "fair"
        ? "text-gold"
        : tone === "good"
          ? "text-ocean"
          : "text-jade";

  return (
    <div className="mt-3 space-y-3">
      {/* Strength meter */}
      <div className="flex items-center gap-3">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-full flex-1 rounded-chip transition-colors duration-150 ease-brand",
                i < score ? barTone : "bg-line-strong"
              )}
            />
          ))}
        </div>
        <span className={cn("font-micro", labelTone)}>{label}</span>
      </div>

      {/* Requirement checklist */}
      <ul className="space-y-1.5">
        {PASSWORD_RULES.map((rule) => {
          const ok = passed[rule.id];
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-2 text-[13px] leading-[1.5] transition-colors duration-150 ease-brand",
                ok ? "text-jade" : "text-tx-muted"
              )}
            >
              {ok ? (
                <Check className="size-4 shrink-0" />
              ) : (
                <X className="size-4 shrink-0 text-tx-faint" />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
