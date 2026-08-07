import { cn } from "@/lib/utils";

/**
 * Display heading for an auth screen. The ember dot marks the screens that
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
    <>
      <h2
        className={cn(
          "font-poppins text-ink-900 m-0 mb-3 text-[clamp(26px,3.6vw,33px)] leading-[1.18] font-medium tracking-[-0.022em]",
          className
        )}
      >
        {title}
        {dot ? (
          <span className="bg-ember-600 ml-2 inline-block size-2.5 rounded-full" />
        ) : null}
      </h2>
      {description ? (
        <p className="text-ink-600 mb-8 text-[15px] leading-[1.55]">
          {description}
        </p>
      ) : null}
    </>
  );
}
