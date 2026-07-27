"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Notification, NotificationPrefs } from "@/lib/db/types";

/**
 * Notification actions for ANY signed-in user (admin or employee). All reads /
 * writes run through the RLS-aware client — notifications_select_own /
 * notifications_update_own and notification_prefs_rw_own scope everything to the
 * caller's own rows, so no explicit role check is needed here.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

const NOTIFICATION_COLUMNS =
  "id, recipient_id, type, title, body, link, is_read, is_starred, created_at, actor_id, actor_name";

const NOTIFICATIONS_LIMIT = 20;
// The dedicated Notifications page shows the full recent history (still RLS-scoped
// to the caller), not just the bell's short preview list.
const NOTIFICATIONS_PAGE_LIMIT = 200;

export type NotificationFeed = {
  items: Notification[];
  unreadCount: number;
};

/** Latest notifications + a total unread count for the bell badge. */
export async function listMyNotifications(): Promise<NotificationFeed> {
  const { user } = await getUserAndProfile();
  if (!user) return { items: [], unreadCount: 0 };

  const supabase = await createClient();

  const [{ data: items }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATIONS_LIMIT)
      .returns<Notification[]>(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
  ]);

  return { items: items ?? [], unreadCount: count ?? 0 };
}

/** Full recent notification history for the dedicated Notifications page. */
export async function listAllMyNotifications(): Promise<NotificationFeed> {
  const { user } = await getUserAndProfile();
  if (!user) return { items: [], unreadCount: 0 };

  const supabase = await createClient();

  const [{ data: items }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATIONS_PAGE_LIMIT)
      .returns<Notification[]>(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
  ]);

  return { items: items ?? [], unreadCount: count ?? 0 };
}

/** Star / unstar one of my notifications (RLS scopes the update to my rows). */
export async function setNotificationStarred(input: {
  id: string;
  starred: boolean;
}): Promise<ActionResult> {
  const { user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_starred: input.starred })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const { user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const { user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ----- Preferences -----

const DEFAULT_PREFS: Omit<NotificationPrefs, "user_id" | "updated_at"> = {
  new_message: true,
  new_order: true,
  status_change: true,
  daily_summary: false,
};

export async function getMyNotificationPrefs(): Promise<
  Omit<NotificationPrefs, "user_id" | "updated_at">
> {
  const { user } = await getUserAndProfile();
  if (!user) return DEFAULT_PREFS;

  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_prefs")
    .select("new_message, new_order, status_change, daily_summary")
    .eq("user_id", user.id)
    .maybeSingle<Omit<NotificationPrefs, "user_id" | "updated_at">>();

  return data ?? DEFAULT_PREFS;
}

export async function saveMyNotificationPrefs(input: {
  newMessage: boolean;
  newOrder: boolean;
  statusChange: boolean;
  dailySummary: boolean;
}): Promise<ActionResult> {
  const { user } = await getUserAndProfile();
  if (!user) return { ok: false, error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase.from("notification_prefs").upsert(
    {
      user_id: user.id,
      new_message: input.newMessage,
      new_order: input.newOrder,
      status_change: input.statusChange,
      daily_summary: input.dailySummary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
