import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { ListingForm } from "@/components/customer/listing-form";

/**
 * A helper only ever posts the traveller side, so lockKind hides the "which
 * side are you on?" chooser entirely — being in this portal has already
 * answered it.
 */
export default async function NewTripPage() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  return <ListingForm listing={null} basePath="/helper" lockKind="traveller" />;
}
