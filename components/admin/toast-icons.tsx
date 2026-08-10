/**
 * The five toast glyphs, drawn to the same contract as the rest of the icon
 * set (24-box, 1.9px stroke, currentColor, round caps) so a toast doesn't
 * introduce a second icon language at the one moment the user is looking
 * hardest.
 *
 * Each carries its own tint chip rather than colouring the whole toast — the
 * same rule the status pills follow: tint fill, dark ink, never a flood.
 */

function Chip({
  tint,
  children,
}: {
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex size-[22px] items-center justify-center rounded-full ${tint}`}
    >
      {children}
    </span>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={13}
      height={13}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CheckCircleIcon() {
  return (
    <Chip tint="bg-ok-bg text-ok-ink">
      <Svg>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </Svg>
    </Chip>
  );
}

export function CloseIcon() {
  return (
    <Chip tint="bg-danger-bg text-danger-ink">
      <Svg>
        <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
      </Svg>
    </Chip>
  );
}

export function WarningIcon() {
  return (
    <Chip tint="bg-warn-bg text-warn-ink">
      <Svg>
        <path d="M12 4.5l8.5 15h-17l8.5-15z" />
        <path d="M12 10v4M12 16.8h.01" />
      </Svg>
    </Chip>
  );
}

export function InfoIcon() {
  return (
    <Chip tint="bg-marine-tint text-marine-600">
      <Svg>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 11v5.5M12 7.8h.01" />
      </Svg>
    </Chip>
  );
}

export function Spinner() {
  return (
    <Chip tint="bg-neutral-bg text-ink-600">
      <span className="border-ink-400 border-t-ink-700 block size-[13px] animate-spin rounded-full border-[1.8px]" />
    </Chip>
  );
}
