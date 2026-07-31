"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PASSWORD_RULES,
  checkPassword,
  passwordStrengthLabel,
} from "@/lib/security/password";

/**
 * Live password requirement checklist + strength meter for the signup form.
 * Renders nothing until the user starts typing. Reads the shared policy in
 * lib/security/password.ts so the UI and the validation gate can never drift.
 */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const { passed, score } = checkPassword(password);
  const { label, tone } = passwordStrengthLabel(score);

  const barTone =
    tone === "weak"
      ? "bg-red-500"
      : tone === "fair"
        ? "bg-amber-500"
        : tone === "good"
          ? "bg-ocean"
          : "bg-emerald-500";

  return (
    <div className="mt-2.5 space-y-2.5">
      {/* Strength meter */}
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-full flex-1 rounded-full transition-colors",
                i < score ? barTone : "bg-line-strong"
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wider",
            tone === "weak"
              ? "text-red-600"
              : tone === "fair"
                ? "text-amber-600"
                : tone === "good"
                  ? "text-ocean"
                  : "text-emerald-600"
          )}
        >
          {label}
        </span>
      </div>

      {/* Requirement checklist */}
      <ul className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = passed[rule.id];
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                ok ? "text-emerald-600" : "text-slate-500"
              )}
            >
              {ok ? (
                <Check className="size-3.5 shrink-0" />
              ) : (
                <X className="size-3.5 shrink-0 text-slate-400" />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
