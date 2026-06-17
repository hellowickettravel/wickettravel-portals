// Employee access levels. Sourced from profiles.access_level.
//
// THIS FILE IS THE SINGLE SOURCE OF TRUTH for what each access level may do.
// The sidebar nav, the mobile sheet, the route guards, the Add-Employee dialog
// copy, and the Support FAQ all read from the matrix/descriptions below.
//
// Matrix:
//   full       Dashboard · Messages (read+reply) · Orders (read+create+edit) · Support · Settings
//   chat_only  Dashboard · Messages (read+reply) · Support · Settings · NO Orders
//   view_only  Dashboard · Messages (read-only)  · Orders (read-only)         · Support · Settings

export type AccessLevel = "full" | "chat_only" | "view_only";

export const ACCESS_LEVELS: AccessLevel[] = ["full", "chat_only", "view_only"];

/** Employee portal sections that access levels gate. */
export type EmployeeSection =
  | "dashboard"
  | "messages"
  | "orders"
  | "support"
  | "settings";

/**
 * Which access levels may OPEN each section. This drives both the nav filter
 * and the server-side route guards — keep them reading from here so they can
 * never drift apart.
 */
export const SECTION_ACCESS: Record<EmployeeSection, AccessLevel[]> = {
  dashboard: ["full", "chat_only", "view_only"],
  messages: ["full", "chat_only", "view_only"],
  orders: ["full", "view_only"], // chat_only has NO orders at all
  support: ["full", "chat_only", "view_only"],
  settings: ["full", "chat_only", "view_only"],
};

/** Can this access level open the given section? Used by nav + route guards. */
export function canAccessSection(
  section: EmployeeSection,
  level: AccessLevel
): boolean {
  return SECTION_ACCESS[section].includes(level);
}

/** Short human label for an access level (badges, dialogs). */
export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  full: "Full",
  chat_only: "Chat-only",
  view_only: "View-only",
};

/** One-line description of each level — used in the Add-Employee dialog + FAQ. */
export const ACCESS_LEVEL_DESCRIPTIONS: Record<AccessLevel, string> = {
  full: "Manage everything — chats, orders and settings.",
  chat_only: "Conversations only — no access to orders.",
  view_only: "Read-only — view chats and orders but can't reply or edit.",
};

/**
 * Normalize a raw access_level value to a known level.
 *
 * SECURITY: defaults to the LEAST privileged level ("view_only") when the value
 * is missing or unrecognised. An employee row with a null/unknown access_level
 * must never be granted elevated access. To grant more, set the employee's
 * profiles.access_level explicitly to 'chat_only' or 'full' in Supabase.
 */
export function normalizeAccess(level: string | null | undefined): AccessLevel {
  if (level === "chat_only" || level === "view_only" || level === "full") {
    return level;
  }
  return "view_only";
}

/** view_only employees can read but not create/edit/send. */
export function isReadOnly(level: AccessLevel): boolean {
  return level === "view_only";
}
