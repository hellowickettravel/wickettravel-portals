import { notFound, redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getMyListing } from "@/lib/actions/parents-listings";
import { ListingForm } from "@/components/customer/listing-form";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  const { id } = await params;
  const listing = await getMyListing(id);
  if (!listing) notFound();

  // Only a draft or a sent-back listing is editable; anything else is a
  // promise other people are being matched against, so send them to the
  // record where "Withdraw" and "Reopen" live.
  if (!["draft", "rejected"].includes(listing.listing_status)) {
    redirect(`/customer/parents/${listing.id}`);
  }

  return <ListingForm listing={listing} />;
}
