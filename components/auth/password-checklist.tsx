"use client";

import { PASSWORD_RULES, checkPassword } from "@/lib/security/password";
import { cn } from "@/lib/utils";

/**
 * Live password requirements, shown as a two-column dot grid under the field.
 * Reads the shared policy in lib/security/password.ts so the UI and the
 * validation gate can never drift.
 */
export function PasswordChecklist({ password }: { password: string }) {
  const { passed } = checkPassword(password);

  return (
    <ul className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] gap-x-4 gap-y-2">
      {PASSWORD_RULES.map((rule) => {
        const ok = passed[rule.id];
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-2 text-[12.5px] whitespace-nowrap transition-colors",
              ok ? "text-emerald-700" : "text-slate-500"
            )}
          >
            <span
              className={cn(
                "size-[7px] shrink-0 rounded-full transition-colors",
                ok ? "bg-emerald-600" : "bg-slate-300"
              )}
            />
            {rule.shortLabel}
          </li>
        );
      })}
    </ul>
  );
}
