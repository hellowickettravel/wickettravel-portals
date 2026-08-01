import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The foot of the auth form column — design system v5 §16.
 *
 * Legal text belongs with the legal action, so it lives on the form side,
 * pinned to the bottom of the column and sharing the form's 440px measure
 * and left edge, behind a hairline. Sharing that edge is the whole fix:
 * it used to be centred in a column whose form was not, so it read as
 * having come loose from the layout.
 *
 * The padlock is doing real work rather than decoration — it is the only
 * signal on the screen that says the credentials being typed above it go
 * somewhere safe.
 *
 * NOTE: Privacy and Terms links belong here too, and the measure leaves
 * room — but /privacy and /terms do not exist yet, and a footer link that
 * 404s is worse than one that is absent. Add the routes with the real
 * documents, then add the links.
 */
export function AuthFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "mx-auto w-full max-w-[440px] border-t border-line pt-5",
        className
      )}
    >
      <p className="flex items-center gap-2 text-[12.5px] leading-[1.5] text-tx-muted">
        <Lock aria-hidden className="size-[13px] shrink-0" />
        <span>© {year} Wicket Travel Ltd · United Kingdom</span>
      </p>
    </footer>
  );
}
