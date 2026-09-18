import { getUserAndProfile } from "@/lib/auth";
import { getCustomerByProfileId } from "@/lib/db/customers";
import { createClient } from "@/lib/supabase/server";
import { CustomerProfileForm } from "@/components/customer/profile-form";

export default async function CustomerProfilePage() {
  const { user, profile } = await getUserAndProfile();
  const customer = user ? await getCustomerByProfileId(user.id) : null;

  // Read on its own so a database without 0022 still renders the page.
  let dateOfBirth = "";
  if (customer) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("customers")
      .select("date_of_birth")
      .eq("id", customer.id)
      .maybeSingle<{ date_of_birth: string | null }>();
    dateOfBirth = data?.date_of_birth ?? "";
  }

  return (
    <CustomerProfileForm
      initialName={profile?.full_name?.trim() || ""}
      initialBirthday={dateOfBirth}
      email={user?.email ?? ""}
      phone={customer?.wa_phone ?? ""}
    />
  );
}
