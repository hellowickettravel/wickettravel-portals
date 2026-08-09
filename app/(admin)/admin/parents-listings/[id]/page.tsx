import { notFound } from "next/navigation";
import { getListingForAdmin } from "@/lib/actions/parents-listings";
import { ListingReview } from "@/components/admin/listing-review";

export default async function AdminListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getListingForAdmin(id);
  if (!record) notFound();

  return <ListingReview record={record} />;
}
