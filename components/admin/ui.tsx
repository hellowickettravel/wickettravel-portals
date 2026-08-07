import Link from "next/link";
import { cn } from "@/lib/utils";
import { EyeIcon } from "@/components/admin/icons";

/**
 * Primitives for the Admin Portal, ported 1:1 from the Claude Design
 * "Admin Portal All Pages" file.
 *
 * Every size, colour and radius here is the design's own declared value. Note
 * the explicit `rounded-[10px]` / `rounded-[12px]`: this project sets
 * `--radius: 0.75rem`, so Tailwind's named radii resolve to 12/16.8px and would
 * silently miss the design's 10/12px rectangles.
 *
 * The design's shape language: **buttons are pills, containers are
 * rectangles** — 10px for controls, 12px for cards, 999px for anything
 * actionable.
 */

/* ------------------------------------------------------------ elevation */

/** e1 — resting card. */
export const shadowE1 = "shadow-[0_1px_2px_oklch(0.205_0.038_258_/_0.04)]";
/** e2 — raised / dropdown. */
export const shadowE2 = "shadow-[0_4px_12px_oklch(0.205_0.038_258_/_0.07)]";
/** e3 — modal, popover. */
export const shadowE3 = "shadow-[0_20px_48px_oklch(0.205_0.038_258_/_0.16)]";
/** The one focus ring, on every control in both files. */
export const focusRing =
  "focus:border-marine-500 focus:shadow-[0_0_0_3px_var(--color-marine-200)]";

/* -------------------------------------------------------------- screens */

/** Screen wrapper: the design's 24px section rhythm and content cap. */
export function Screen({
  children,
  width = 1400,
  className,
}: {
  children: React.ReactNode;
  width?: number;
  className?: string;
}) {
  return (
    <div
      style={{ maxWidth: width }}
      className={cn("flex flex-col gap-6", className)}
    >
      {children}
    </div>
  );
}

/** Title + intro on the left, actions on the right, wrapping on narrow. */
export function PageHead({
  title,
  intro,
  actions,
}: {
  title: React.ReactNode;
  intro?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <PageTitle>{title}</PageTitle>
        {intro ? (
          <p className="text-ink-600 mt-1.5 max-w-[68ch] text-[13.5px] font-normal text-pretty">
            {intro}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap gap-3">{actions}</div>
      ) : null}
    </div>
  );
}

export function PageTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "font-poppins text-ink-900 m-0 text-[clamp(20px,1.5vw,24px)] leading-[1.25] font-medium tracking-[-0.02em]",
        className
      )}
    >
      {children}
    </h1>
  );
}

/** The design's "← All orders" breadcrumb on every detail screen. */
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-marine-600 self-start text-[12.5px] font-medium whitespace-nowrap no-underline hover:no-underline"
    >
      ← {children}
    </Link>
  );
}

/** Small uppercase eyebrow above a page title (ember, per the design). */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-ember-700 text-[11px] font-medium tracking-[0.13em] uppercase">
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- cards */

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line-base overflow-hidden rounded-[12px] border bg-white",
        shadowE1,
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHead({
  title,
  hint,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line-soft flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <span className="text-marine-head flex flex-none">{icon}</span>
        ) : null}
        <div className="flex min-w-0 flex-col gap-[3px]">
          <CardTitle>{title}</CardTitle>
          {hint ? (
            <span className="text-ink-600 text-[12px] font-normal text-pretty">
              {hint}
            </span>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex flex-none gap-2">{action}</div> : null}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-ink-800 m-0 text-[13.5px] leading-[1.4] font-semibold tracking-[-0.008em]">
      {children}
    </h2>
  );
}

/* ----------------------------------------------------------------- KPIs */

export type KpiTone = "marine" | "warn" | "ok" | "teal" | "violet" | "ink";

const KPI_CHIP: Record<KpiTone, string> = {
  marine: "bg-marine-50 text-marine-600",
  warn: "bg-warn-wash text-warn-ink",
  ok: "bg-ok-wash text-ok-ink",
  teal: "bg-teal-bg/60 text-teal-ink",
  violet: "bg-violet-bg/60 text-violet-ink",
  ink: "bg-neutral-wash text-ink-700",
};

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-4">
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  meta,
  icon,
  tone = "marine",
  valueClass,
  metaClass,
}: {
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: KpiTone;
  /** Money is ink; commission is the one figure allowed a success tint. */
  valueClass?: string;
  metaClass?: string;
}) {
  return (
    <div
      className={cn(
        "border-line-base flex flex-col gap-3 rounded-[12px] border bg-white p-5",
        shadowE1
      )}
    >
      {icon ? (
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-[10px]",
            KPI_CHIP[tone]
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="text-ink-600 text-[11px] font-medium tracking-[0.11em] uppercase">
        {label}
      </span>
      <span
        className={cn(
          "font-poppins text-ink-880 text-[24px] leading-none font-medium tracking-[-0.022em] tabular-nums",
          valueClass
        )}
      >
        {value}
      </span>
      {meta ? (
        <span
          className={cn(
            "text-ink-600 text-[11.5px] font-normal text-pretty",
            metaClass
          )}
        >
          {meta}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- buttons */

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap outline-none transition-[background-color,border-color,color] duration-[130ms] disabled:cursor-not-allowed disabled:opacity-60";

/** md — the design's default control: 40px tall, 13px/500 label. */
export const btnMd = `${BTN_BASE} h-10 px-5 text-[13px]`;
/** sm — filter chips and in-table actions: 34px, 12–12.5px label. */
export const btnSm = `${BTN_BASE} h-[34px] px-4 text-[12.5px]`;

/** Primary CTA — Ember 600 fill. One spark per view. */
export const btnEmber =
  "bg-ember-600 hover:bg-ember-700 border-0 px-6 text-white focus:shadow-[0_0_0_3px_#fff,0_0_0_6px_oklch(0.565_0.172_47_/_0.42)]";
/** Marine fill — "the one next action" inside a record. */
export const btnMarine =
  "bg-marine-500 hover:bg-marine-600 border-0 px-6 text-white";
/** Secondary — white + border-field. */
export const btnGhost =
  "border-line-field text-ink-800 hover:bg-surface-1 hover:border-ink-300 border bg-white";
/** Destructive — white + danger border/ink; solid only inside a confirm. */
export const btnDanger =
  "border-danger-line text-danger-ink hover:bg-danger-bg border bg-white";

export function Btn({
  as,
  href,
  variant = "ghost",
  size = "md",
  className,
  children,
  ...rest
}: {
  as?: "link";
  href?: string;
  variant?: "ember" | "marine" | "ghost" | "danger";
  size?: "md" | "sm";
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const look = cn(
    size === "sm" ? btnSm : btnMd,
    variant === "ember"
      ? btnEmber
      : variant === "marine"
        ? btnMarine
        : variant === "danger"
          ? btnDanger
          : btnGhost,
    className
  );
  if (as === "link" && href) {
    return (
      <Link href={href} className={cn(look, "no-underline hover:no-underline")}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={look} {...rest}>
      {children}
    </button>
  );
}

/** The in-table "View" action — 30px pill with the design's eye glyph. */
export function ViewButton({
  href,
  label = "View",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="border-line-field text-marine-600 hover:bg-surface-1 hover:border-ink-300 inline-flex h-[30px] items-center gap-1.5 rounded-full border bg-white px-3.5 text-[12px] font-medium whitespace-nowrap no-underline hover:no-underline"
    >
      <EyeIcon size={14} />
      {label}
    </Link>
  );
}

/* ---------------------------------------------------------- status pills */

export type PillTone =
  | "marine"
  | "warn"
  | "ok"
  | "ink"
  | "danger"
  | "teal"
  | "violet";

const PILL_TONE: Record<PillTone, string> = {
  marine: "bg-marine-tint text-marine-600",
  warn: "bg-warn-bg text-warn-ink",
  ok: "bg-ok-bg text-ok-ink",
  ink: "bg-neutral-bg text-ink-700",
  danger: "bg-danger-bg text-danger-ink",
  teal: "bg-teal-bg text-teal-ink",
  violet: "bg-violet-bg text-violet-ink",
};

/**
 * The design's status vocabulary, matched on the label the same way its
 * `kindOf()` does: tint fill + dark ink, never a saturated block.
 */
export function toneOf(status: string): PillTone {
  const s = status.toLowerCase();
  if (/deactiv|cancel|closed|unpublish|archiv|inactive/.test(s)) return "ink";
  if (/new|received|unactioned|awaiting|open/.test(s)) return "marine";
  if (/progress|review|pending|quoted|processing/.test(s)) return "warn";
  if (/complete|resolved|matched|published|active|approved|answered|paid/.test(s))
    return "ok";
  return "ink";
}

export function Pill({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
}) {
  const t = tone ?? toneOf(String(children));
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap",
        PILL_TONE[t],
        className
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------- filter chips */

/**
 * Status filter with a live count. The design fills the selected chip with
 * solid ink and white type — deliberately not marine, so the filter row never
 * competes with the primary action.
 */
export function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-[34px] items-center gap-2 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap no-underline hover:no-underline",
        active
          ? "border-ink-800 bg-ink-800 text-white"
          : "border-line-field text-ink-800 hover:bg-surface-1 bg-white"
      )}
    >
      {label}
      {count !== undefined ? (
        <span className="text-[11px] font-medium tabular-nums opacity-[0.66]">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

/* --------------------------------------------------------------- tables */

export function TableScroll({ children }: { children: React.ReactNode }) {
  return <div className="om-scroll overflow-x-auto">{children}</div>;
}

export function Table({
  children,
  min = 900,
}: {
  children: React.ReactNode;
  min?: number;
}) {
  return (
    <table
      style={{ minWidth: min }}
      className="w-full border-collapse text-left"
    >
      {children}
    </table>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="bg-surface-2 border-line-strong border-b">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  className,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "text-ink-600 h-10 px-5 text-[11px] font-medium tracking-[0.09em] whitespace-nowrap uppercase",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      {children}
    </th>
  );
}

/** Row height is the design's 52px comfortable density. */
export function Td({
  children,
  align = "left",
  className,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-line-soft h-[52px] border-t px-5 text-[13px] font-normal whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("hover:bg-marine-row transition-colors", className)}>
      {children}
    </tr>
  );
}

/** "Showing 8 of 412 orders" + an optional trailing action. */
export function TableFoot({
  shown,
  total,
  noun,
  action,
}: {
  shown: number;
  total: number;
  noun: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-line-soft flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
      <span className="text-ink-600 text-[12.5px] font-normal">
        Showing {shown} of {total} {noun}
      </span>
      {action}
    </div>
  );
}

/**
 * Every list gets an explanatory empty state — the design applies §3.11's rule
 * platform-wide, so a filtered-to-nothing table never renders as a blank box.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-line-soft flex flex-col items-center border-t px-6 pt-14 pb-15 text-center">
      <span className="bg-marine-50 mb-4 flex size-11 items-center justify-center rounded-full">
        <span className="border-marine-500 block size-3.5 rounded-full border-2" />
      </span>
      <h2 className="text-ink-800 m-0 mb-2 text-[15px] font-semibold tracking-[-0.008em]">
        {title}
      </h2>
      <p className="text-ink-600 m-0 mb-5 max-w-[384px] text-[13px] leading-[1.55] font-normal text-pretty">
        {body}
      </p>
      {action}
    </div>
  );
}

/** The design's loading skeleton for a table body. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 90}ms` }}
          className="border-line-soft flex h-[54px] animate-[wt-pulse_1.5s_ease-in-out_infinite] items-center gap-6 border-t px-5"
        >
          <span className="bg-line-field block h-[9px] w-[72px] flex-none rounded-full" />
          <span className="bg-neutral-bg block h-[9px] w-[124px] flex-none rounded-full" />
          <span className="bg-neutral-bg block h-[9px] w-[92px] flex-none rounded-full" />
          <span className="bg-neutral-bg block h-[9px] min-w-0 flex-1 rounded-full" />
          <span className="bg-neutral-bg block h-5 w-[68px] flex-none rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- forms */

export const inputClass =
  "border-line-field text-ink-800 h-10 w-full rounded-[10px] border bg-white px-4 text-[13.5px] font-normal outline-none transition-[border-color,box-shadow] duration-[130ms]";
export const inputInsetClass =
  "border-line-field bg-surface-1 text-ink-800 h-10 w-full rounded-[10px] border px-4 text-[13px] font-normal outline-none transition-[border-color,box-shadow,background-color] duration-[130ms] focus:bg-white";
export const textareaClass =
  "border-line-field text-ink-800 w-full resize-y rounded-[10px] border bg-white px-3.5 py-3 text-[13.5px] leading-[1.55] font-normal outline-none transition-[border-color,box-shadow] duration-[130ms]";

export function FieldLabel({
  htmlFor,
  icon,
  optional,
  children,
}: {
  htmlFor?: string;
  icon?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-ink-700 flex flex-wrap items-center gap-x-[7px] gap-y-1 text-[11.5px] leading-[1.35] font-medium"
    >
      {icon ? (
        <span className="text-marine-icon flex flex-none">{icon}</span>
      ) : null}
      <span>{children}</span>
      {optional ? (
        <span className="text-ink-450 font-normal">Optional</span>
      ) : null}
    </label>
  );
}

export function Field({
  children,
  span,
  className,
}: {
  children: React.ReactNode;
  /** grid-column, e.g. "1 / -1" for a full-width row. */
  span?: string;
  className?: string;
}) {
  return (
    <div
      style={span ? { gridColumn: span } : undefined}
      className={cn("flex min-w-0 flex-col gap-2", className)}
    >
      {children}
    </div>
  );
}

/** Label + value stack used on every detail card. */
export function DataRow({
  label,
  value,
  icon,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="border-line-soft flex flex-col gap-1 border-b py-2">
      <span className="flex items-center gap-[7px]">
        {icon ? (
          <span className="text-marine-icon flex flex-none">{icon}</span>
        ) : null}
        <span className="text-ink-500 text-[11px] font-medium tracking-[0.09em] uppercase">
          {label}
        </span>
      </span>
      <span className="text-[13px] font-normal break-words">{value}</span>
    </div>
  );
}

/** The boxed field tile used by Flight details and the enquiry columns. */
export function FieldTile({
  label,
  value,
  icon,
  chip,
  span,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  chip?: string;
  span?: string;
}) {
  return (
    <div
      style={span ? { gridColumn: span } : undefined}
      className="border-line-hair bg-surface-4 hover:border-line-strong flex min-w-0 items-start gap-3 rounded-[11px] border p-3.5 transition-colors hover:bg-white"
    >
      {icon ? (
        <span
          className={cn(
            "flex size-[34px] flex-none items-center justify-center rounded-[10px]",
            chip ?? "bg-marine-tint text-marine-600"
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-ink-tertiary text-[10.5px] font-semibold tracking-[0.08em] uppercase">
          {label}
        </span>
        <span className="text-ink-850 text-[14px] leading-[1.4] font-medium break-words text-pretty">
          {value}
        </span>
      </span>
    </div>
  );
}

/** Money: ink, 600, tabular — never coloured, per the design's rule. */
export function Money({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("text-ink-800 font-medium tabular-nums", className)}>
      {children}
    </span>
  );
}

/** Deterministic avatar tint — the design hashes the name over 8 pairs. */
const AVATAR_PALETTE: [string, string][] = [
  ["oklch(0.930 0.048 252)", "oklch(0.420 0.150 257)"],
  ["oklch(0.938 0.058 82)", "oklch(0.450 0.110 72)"],
  ["oklch(0.932 0.058 158)", "oklch(0.400 0.105 158)"],
  ["oklch(0.932 0.050 205)", "oklch(0.430 0.100 220)"],
  ["oklch(0.932 0.048 292)", "oklch(0.440 0.140 292)"],
  ["oklch(0.938 0.040 25)", "oklch(0.455 0.160 25)"],
  ["oklch(0.932 0.052 330)", "oklch(0.440 0.150 330)"],
  ["oklch(0.932 0.052 135)", "oklch(0.410 0.110 145)"],
];

export function avatarFor(name: string) {
  let h = 0;
  const s = String(name ?? "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const [bg, ink] = AVATAR_PALETTE[h % AVATAR_PALETTE.length];
  return { bg, ink };
}

export function initialsOf(name: string) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = 30,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const { bg, ink } = avatarFor(name);
  return (
    <span
      style={{
        width: size,
        height: size,
        background: bg,
        color: ink,
        fontSize: Math.max(10, Math.round(size * 0.37)),
      }}
      className={cn(
        "flex flex-none items-center justify-center rounded-full font-semibold",
        className
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Horizontal progress rail used by the Analytics side panels. */
export function Meter({
  label,
  value,
  pct,
  fill = "var(--color-marine-500)",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  pct: number;
  fill?: string;
}) {
  return (
    <div className="border-line-soft flex flex-col gap-2 border-b py-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] font-normal">{label}</span>
        <span className="text-[13px] font-medium tabular-nums">{value}</span>
      </div>
      <span className="bg-neutral-bg block h-1.5 overflow-hidden rounded-full">
        <span
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: fill }}
          className="block h-full rounded-full"
        />
      </span>
    </div>
  );
}
