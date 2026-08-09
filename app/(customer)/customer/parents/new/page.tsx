import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { ListingForm } from "@/components/customer/listing-form";
import { LISTING_KINDS, type ListingKind } from "@/lib/parents-marketplace";

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  const { kind } = await searchParams;
  const initialKind: ListingKind = LISTING_KINDS.includes(kind as ListingKind)
    ? (kind as ListingKind)
    : "traveller";

  return <ListingForm listing={null} initialKind={initialKind} />;
}
