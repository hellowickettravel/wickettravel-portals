import { cn } from "@/lib/utils";

/**
 * The foot of the auth form column — design system v4 §16.
 *
 * Legal text belongs with the legal action, so this lives on the white side
 * rather than on the artwork, pinned to the bottom of the column and sharing
 * the form card's left edge and width. Sharing that edge is the whole fix:
 * previously it was centred in a column whose card was not, so it read as
 * having come loose from the layout.
 *
 * A hairline above it separates it from the form without drawing a box.
 *
 * NOTE: Privacy and Terms links belong here too, and the layout leaves room
 * for them — but /privacy and /terms do not exist yet, and a footer link
 * that 404s is worse than one that is absent. Add the routes with the real
 * documents, then add the links.
 */
export function AuthFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "mx-auto w-full max-w-[420px] border-t border-line pt-5",
        className
      )}
    >
      <p className="text-[12.5px] leading-[1.5] text-tx-muted">
        © {year} Wicket Travel. All rights reserved.
      </p>
    </footer>
  );
}
