import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * The auth control layer. Auth uses a deliberately larger control size than
 * the portal interior (48px vs 40px) because these screens are one column of
 * a handful of fields — the extra height reads as calm, not loose.
 */

/** Shared field styling for every text input on the auth screens. */
export const authFieldClass =
  "h-12 w-full rounded-[10px] border border-border bg-white px-4 text-[15px] text-navy caret-primary placeholder:text-slate-400 hover:border-slate-400 md:text-[15px]";

export function AuthLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-[13px] font-medium text-slate-700"
    >
      {children}
    </Label>
  );
}

/** Label + control pair with the design's 8px gap. */
export function AuthField({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

/** Primary pill CTA. Presses down rather than lifting, as the design specifies. */
export function AuthSubmit({
  loading = false,
  loadingLabel,
  children,
  className,
}: {
  loading?: boolean;
  loadingLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className={cn(
        "mt-2 h-12 w-full rounded-full text-[15px] font-semibold tracking-[-0.008em] hover:translate-y-0 hover:shadow-none",
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/** Outline pill — the secondary action on the terminal screens. */
export function AuthSecondaryButton({
  onClick,
  href,
  children,
  className,
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = cn(
    "h-12 w-full rounded-full border-border bg-white text-[15px] font-semibold tracking-[-0.008em] text-navy hover:bg-neutral-soft",
    className
  );

  if (href) {
    return (
      <Button variant="outline" className={classes} render={<Link href={href} />}>
        {children}
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" onClick={onClick} className={classes}>
      {children}
    </Button>
  );
}

/**
 * Inline text link. Navy rather than the design's blue: on a white panel the
 * accent orange fails AA at this size, and navy is the palette's link colour.
 */
export const authLinkClass =
  "font-medium text-brand underline-offset-2 transition-colors hover:text-brand-dark hover:underline";
