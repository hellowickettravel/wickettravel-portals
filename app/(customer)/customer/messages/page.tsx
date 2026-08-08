import { getUserAndProfile } from "@/lib/auth";
import { CustomerMessages } from "@/components/customer/messages-view";

export default async function CustomerMessagesPage() {
  const { user, profile } = await getUserAndProfile();
  const name = profile?.full_name?.trim() || user?.email || "You";

  return <CustomerMessages customerName={name} />;
}
