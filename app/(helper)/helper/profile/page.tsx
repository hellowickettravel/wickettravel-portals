import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CustomerProfileForm } from "@/components/customer/profile-form";

/**
 * The helper's account settings — the same form the customer portal renders.
 * Name, password and notification preferences are all role-agnostic, so there
 * is nothing to fork here.
 *
 * The phone shown is the one on their verification record rather than a
 * customers row, because a helper has no customers row by design.
 */
export default async function HelperProfilePage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: identity } = await supabase
    .from("parent_ticket_identities")
    .select("phone")
    .eq("profile_id", user.id)
    .maybeSingle<{ phone: string | null }>();

  return (
    <CustomerProfileForm
      initialName={profile?.full_name?.trim() || ""}
      email={user.email ?? ""}
      phone={identity?.phone ?? ""}
    />
  );
}
