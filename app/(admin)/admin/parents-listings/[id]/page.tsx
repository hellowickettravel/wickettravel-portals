import { notFound } from "next/navigation";
import { getListingForAdmin } from "@/lib/actions/parents-listings";
import { findCandidates, type Candidate } from "@/lib/actions/parents-matches";
import { ListingReview } from "@/components/admin/listing-review";

export default async function AdminListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getListingForAdmin(id);
  if (!record) notFound();

  // Ranking is only meaningful once the listing is approved — and running it
  // on a draft would put strangers' records in front of an admin reviewing
  // something that may never go live.
  let candidates: Candidate[] = [];
  if (record.listing_status === "approved" || record.listing_status === "matched") {
    const found = await findCandidates(record.id);
    if (found.ok) candidates = found.data;
  }

  return <ListingReview record={record} candidates={candidates} />;
}
