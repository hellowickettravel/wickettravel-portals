import { notFound, redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getMyListing } from "@/lib/actions/parents-listings";
import { ListingForm } from "@/components/customer/listing-form";

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  const { id } = await params;
  const listing = await getMyListing(id);
  if (!listing) notFound();

  // Only a draft or a sent-back trip is editable; anything else is a promise
  // a family may already be acting on.
  if (!["draft", "rejected"].includes(listing.listing_status)) {
    redirect(`/helper/${listing.id}`);
  }

  return (
    <ListingForm listing={listing} basePath="/helper" lockKind="traveller" />
  );
}
