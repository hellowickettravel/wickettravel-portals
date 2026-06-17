"use server";

import { getUserAndProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmployees } from "@/lib/db/profiles";
import { getOrders } from "@/lib/db/orders";
import type { Profile, OrderWithRelations, AccessLevel } from "@/lib/db/types";

/**
 * Admin-only server actions. Reads run through the RLS-aware helpers (admin
 * policies grant all); privileged writes use the service-role client AFTER an
 * explicit admin check here, since service-role bypasses RLS.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const ACCESS_LEVELS: AccessLevel[] = ["full", "chat_only", "view_only"];

/** Throws if the caller isn't a signed-in admin. */
async function requireAdmin(): Promise<void> {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

// ----- Reads (consumed by TanStack Query on the client) -----

export async function listEmployees(): Promise<Profile[]> {
  await requireAdmin();
  return getEmployees();
}

export async function listOrders(): Promise<OrderWithRelations[]> {
  await requireAdmin();
  return getOrders();
}

// ----- Writes (service-role) -----

export async function createEmployee(input: {
  fullName: string;
  email: string;
  password: string;
  accessLevel: AccessLevel;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (input.password.length < MIN_PASSWORD)
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` };
  if (!ACCESS_LEVELS.includes(input.accessLevel))
    return { ok: false, error: "Invalid access level." };

  const admin = createAdminClient();

  // 1) Create the auth user (confirmed so they can log in immediately).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    return {
      ok: false,
      error: error?.message ?? "Could not create the account.",
    };
  }

  // 2) The signup trigger creates a profile row; force it to an employee with
  //    the chosen access level. upsert covers the case where the trigger is off.
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: data.user.id,
      role: "employee",
      access_level: input.accessLevel,
      full_name: fullName,
      email,
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  return { ok: true };
}

export async function setEmployeeActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setEmployeeAccess(
  id: string,
  accessLevel: AccessLevel
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  if (!ACCESS_LEVELS.includes(accessLevel))
    return { ok: false, error: "Invalid access level." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ access_level: accessLevel })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
