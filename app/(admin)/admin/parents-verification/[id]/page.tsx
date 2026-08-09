import { notFound } from "next/navigation";
import { getVerification } from "@/lib/actions/parents-marketplace";
import { VerificationReview } from "@/components/admin/verification-review";

export default async function AdminVerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getVerification(id);
  if (!record) notFound();

  return <VerificationReview record={record} />;
}
