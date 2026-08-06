import { cn } from "@/lib/utils";

/**
 * Display heading for an auth screen. The orange dot marks the screens that
 * start a flow (sign in, sign up, reset request); terminal screens — the ones
 * that report an outcome — drop it.
 */
export function AuthHeading({
  title,
  description,
  dot = true,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-8", className)}>
      <h2 className="font-display text-[clamp(26px,3.6vw,33px)] leading-[1.18] font-semibold tracking-[-0.022em] text-navy">
        {title}
        {dot ? (
          <span className="ml-2 inline-block size-2.5 rounded-full bg-primary align-middle" />
        ) : null}
      </h2>
      {description ? (
        <p className="mt-3 text-[15px] leading-[1.55] text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}
