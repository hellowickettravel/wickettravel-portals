import { getUserAndProfile } from "@/lib/auth";
import { getCustomerByProfileId } from "@/lib/db/customers";
import { CustomerProfileForm } from "@/components/customer/profile-form";

export default async function CustomerProfilePage() {
  const { user, profile } = await getUserAndProfile();
  const customer = user ? await getCustomerByProfileId(user.id) : null;

  return (
    <CustomerProfileForm
      initialName={profile?.full_name?.trim() || ""}
      email={user?.email ?? ""}
      phone={customer?.wa_phone ?? ""}
    />
  );
}
