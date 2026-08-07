"use client";

import { PASSWORD_RULES, checkPassword } from "@/lib/security/password";
import { cn } from "@/lib/utils";

/**
 * Live password requirements, shown as an auto-fitting dot grid under the
 * field. Reads the shared policy in lib/security/password.ts so the UI and the
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
              "flex items-center gap-2 text-[12.5px] font-normal whitespace-nowrap transition-colors",
              ok ? "text-pass-ink" : "text-ink-500"
            )}
          >
            <span
              className={cn(
                "block size-[7px] flex-none rounded-full transition-colors",
                ok ? "bg-pass-dot" : "bg-ink-300"
              )}
            />
            {rule.shortLabel}
          </li>
        );
      })}
    </ul>
  );
}
