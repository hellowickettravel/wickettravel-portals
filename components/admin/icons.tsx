/**
 * The Admin Portal design's icon set.
 *
 * The design draws every glyph inline as a 24-box stroke path — no icon
 * library — so the whole portal shares one geometry, one stroke weight and
 * `currentColor`. Anything that appears verbatim in the design file is copied
 * path-for-path; the nav and chrome glyphs the design generates in its own
 * runtime are drawn here in the same idiom (24 viewBox, round caps/joins,
 * 1.7px stroke unless the design specifies otherwise).
 */

type IconProps = {
  size?: number;
  /** Stroke width override — the design uses 1.7 for chrome, 1.9–2 for emphasis. */
  width?: number;
  className?: string;
};

function Svg({
  size = 18,
  width = 1.7,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: "block" }}
    >
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------- chrome */

export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 1.9}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8L20 20" />
    </Svg>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 2}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 2}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 2}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function EyeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </Svg>
  );
}

export function ExportIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5M5 18h14" />
    </Svg>
  );
}

export function DownloadIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 1.8}>
      <path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 19.5h14" />
    </Svg>
  );
}

export function UploadIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 1.8}>
      <path d="M12 16V4.5M7.5 9L12 4.5 16.5 9" />
      <path d="M5 15.5v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
    </Svg>
  );
}

export function ArrowRightIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 1.8}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </Svg>
  );
}

export function RefreshIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 11a8 8 0 0 0-14-4.5L4.5 7.5" />
      <path d="M4 4.5v3.5h3.5" />
      <path d="M4 13a8 8 0 0 0 14 4.5l1.5-1.5" />
      <path d="M20 19.5V16h-3.5" />
    </Svg>
  );
}

export function SendIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20.5 4L4 10.8l6 2.2 2.2 6L20.5 4z" />
      <path d="M10 13l4-4" />
    </Svg>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 1.9}>
      <path d="M4.5 7h15M9.5 7V5.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" />
      <path d="M6.5 7l.9 12.1a1.4 1.4 0 0 0 1.4 1.3h6.4a1.4 1.4 0 0 0 1.4-1.3L17.5 7" />
    </Svg>
  );
}

export function WarningIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 1.9}>
      <path d="M12 4.2L2.8 19.5h18.4L12 4.2z" />
      <path d="M12 10v4M12 17.2v.1" />
    </Svg>
  );
}

export function AlertIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 2}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5M12 15.6v.1" />
    </Svg>
  );
}

export function PowerIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 1.9}>
      <path d="M12 3.5v8" />
      <path d="M6.8 6.8a7 7 0 1 0 10.4 0" />
    </Svg>
  );
}

export function UserPlusIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c0-3.3 2.9-5.5 6.5-5.5 1.2 0 2.3.2 3.2.6" />
      <path d="M17.5 14v6M14.5 17h6" />
    </Svg>
  );
}

export function RouteIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="6" cy="6.5" r="2" />
      <circle cx="18" cy="17.5" r="2" />
      <path d="M6 8.5v3.5a3 3 0 0 0 3 3h6" />
    </Svg>
  );
}

export function ChatIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4 3.5V15.5H6.5a2 2 0 0 1-2-2v-7z" />
    </Svg>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0v3.2l1.4 2.6H5.1l1.4-2.6V10z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function LifebuoyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M6 6l3.6 3.6M18 6l-3.6 3.6M6 18l3.6-3.6M18 18l-3.6-3.6" />
    </Svg>
  );
}

export function SignOutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h8" />
      <path d="M15 12h6M18 9l3 3-3 3" />
    </Svg>
  );
}

export function FlightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.2c.8 0 1.3.9 1.3 2v4.3l6.7 3.9v1.7l-6.7-2.1v4l2 1.5v1.3L12 19l-3.3.8v-1.3l2-1.5v-4l-6.7 2.1v-1.7l6.7-3.9V5.2c0-1.1.5-2 1.3-2z" />
    </Svg>
  );
}

export function AttachIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M16.5 11.5l-5.6 5.6a3.4 3.4 0 0 1-4.8-4.8l6.8-6.8a2.4 2.4 0 0 1 3.4 3.4l-6.8 6.8a1.4 1.4 0 0 1-2-2l5.9-5.9" />
    </Svg>
  );
}

export function ImageIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.5 16.5l4.2-4a1.6 1.6 0 0 1 2.2 0l4.8 4.6M14.8 14l1.6-1.5a1.6 1.6 0 0 1 2.2 0l1 1" />
    </Svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Svg>
  );
}

export function PoundIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.4 8.6a2.6 2.6 0 0 0-4.6 1.7V16m-1.3-4h4.1M8.5 16h6.4" />
    </Svg>
  );
}

export function PercentIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 18L18 6" />
      <circle cx="7.8" cy="7.8" r="2.3" />
      <circle cx="16.2" cy="16.2" r="2.3" />
    </Svg>
  );
}

export function DocumentIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 4.5h7l5 5v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z" />
      <path d="M13 4.5v5h5" />
    </Svg>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <Svg {...p} width={p.width ?? 1.9}>
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />
    </Svg>
  );
}

/* ------------------------------------------------------------------- nav */

export function DashboardIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="4.5" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="10.5" width="7" height="9.5" rx="1.6" />
    </Svg>
  );
}

export function OrdersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 7h12l-1 12.5a1.4 1.4 0 0 1-1.4 1.3H8.4A1.4 1.4 0 0 1 7 19.5L6 7z" />
      <path d="M9 9.5V6.6a3 3 0 0 1 6 0v2.9" />
    </Svg>
  );
}

export function LedgerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 9.5h16M8 13.5h5M8 16.5h8" />
    </Svg>
  );
}

export function VisaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="3.8" width="14" height="16.4" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8.4 16.6c.6-1.7 2-2.6 3.6-2.6s3 .9 3.6 2.6" />
    </Svg>
  );
}

export function FamilyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="8" r="2.6" />
      <circle cx="16.4" cy="9.4" r="2" />
      <path d="M3.6 19.5c0-2.9 2-4.6 4.4-4.6s4.4 1.7 4.4 4.6" />
      <path d="M14.2 19.5c0-2.3 1.2-3.7 3.1-3.7 1.6 0 2.9 1 3.1 3" />
    </Svg>
  );
}

export function StaffIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9.5" cy="8.4" r="3.1" />
      <path d="M3.5 19.5c0-3.3 2.6-5.4 6-5.4s6 2.1 6 5.4" />
      <path d="M16.6 6.2a3 3 0 0 1 0 5.8M18 19.5c0-2-.5-3.5-1.5-4.6" />
    </Svg>
  );
}

export function CustomersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="4.5" width="16" height="15" rx="2" />
      <circle cx="11" cy="10.4" r="2.3" />
      <path d="M7.5 16.4c.5-1.7 1.9-2.6 3.5-2.6s3 .9 3.5 2.6" />
      <path d="M16 8.6h1.6M16 11.6h1.6" />
    </Svg>
  );
}

export function AnalyticsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 19.5h15" />
      <path d="M7.5 19.5v-5M12 19.5V7.5M16.5 19.5v-8" />
    </Svg>
  );
}

export function SettingsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.6l1.3 2.2 2.5-.4.6 2.5 2.3 1-1 2.3 1 2.3-2.3 1-.6 2.5-2.5-.4L12 20.4l-1.3-2.2-2.5.4-.6-2.5-2.3-1 1-2.3-1-2.3 2.3-1 .6-2.5 2.5.4L12 3.6z" />
    </Svg>
  );
}

export const NAV_ICONS = {
  dashboard: DashboardIcon,
  orders: OrdersIcon,
  transactions: LedgerIcon,
  messages: ChatIcon,
  visa: VisaIcon,
  parents: FamilyIcon,
  employees: StaffIcon,
  customers: CustomersIcon,
  analytics: AnalyticsIcon,
  support: LifebuoyIcon,
  settings: SettingsIcon,
  notifications: BellIcon,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;
