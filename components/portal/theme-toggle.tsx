"use client";

import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Light/dark toggle — design system v4 §3.
 *
 * Writes the same `wt-theme` key the inline script in app/layout.tsx reads
 * before first paint, so the choice survives a reload without a flash.
 *
 * The two icons are both rendered and swapped by the `dark:` variant rather
 * than by React state. That matters: the server cannot know the visitor's
 * theme, so any state-driven icon would either mismatch on hydration or
 * need a mount-effect flicker. CSS has the answer at paint time.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    root.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem("wt-theme", next ? "dark" : "light");
    } catch {
      // Private mode or blocked storage — the toggle still works for this
      // session, it just will not be remembered. Not worth failing over.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={cn(
        "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-icon text-tx-muted outline-none transition-colors duration-150 ease-brand hover:bg-sunk hover:text-tx-head focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      <Sun className="size-[18px] dark:hidden" />
      <Moon className="hidden size-[18px] dark:block" />
    </button>
  );
}
