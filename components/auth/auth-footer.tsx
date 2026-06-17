import { cn } from "@/lib/utils";

/**
 * Brand credit line, pinned to the bottom of the auth form panel. The parent
 * <section> must be `relative` for the absolute positioning to anchor correctly.
 */
export function AuthFooter({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "absolute inset-x-0 bottom-6 px-6 text-center text-xs text-slate-500",
        className
      )}
    >
      © 2026 Wicket Travel — Powered by{" "}
      <a
        href="https://www.getgrowthnexus.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand transition-colors hover:text-brand-dark"
      >
        Growth Nexus
      </a>
    </p>
  );
}
