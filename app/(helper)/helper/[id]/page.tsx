import { notFound, redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyListing } from "@/lib/actions/parents-listings";
import { ListingDetail } from "@/components/customer/listing-detail";
import type { VerificationStatus } from "@/lib/parents-marketplace";

export default async function HelperTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  const { id } = await params;
  const listing = await getMyListing(id);
  if (!listing) notFound();

  const supabase = await createClient();
  const { data: identity } = await supabase
    .from("parent_ticket_identities")
    .select("verification_status")
    .eq("profile_id", user.id)
    .maybeSingle<{ verification_status: VerificationStatus }>();

  return (
    <ListingDetail
      listing={listing}
      verificationStatus={identity?.verification_status ?? "unverified"}
      basePath="/helper"
      audience="helper"
    />
  );
}
