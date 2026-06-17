// Employee access levels. Sourced from profiles.access_level.

export type AccessLevel = "full" | "chat_only" | "view_only";

/**
 * Normalize a raw access_level value to a known level.
 *
 * NOTE (dev): defaults to "full" when missing/unknown so we can see every
 * screen during development. To test the other levels, set the employee's
 * profiles.access_level to 'chat_only' or 'view_only' in Supabase.
 */
export function normalizeAccess(level: string | null | undefined): AccessLevel {
  if (level === "chat_only" || level === "view_only" || level === "full") {
    return level;
  }
  return "full";
}

/** view_only employees can read but not create/edit/send. */
export function isReadOnly(level: AccessLevel): boolean {
  return level === "view_only";
}
