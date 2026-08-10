import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { ListingForm } from "@/components/customer/listing-form";

/**
 * A customer only ever posts the requester side — asking for help for their
 * parent. Offering the service is what the helper portal is for, and a helper
 * is a different role with a different account.
 *
 * lockKind therefore hides the "which side are you on?" chooser: being here
 * has already answered it.
 */
export default async function NewRequestPage() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  return <ListingForm listing={null} lockKind="requester" />;
}
