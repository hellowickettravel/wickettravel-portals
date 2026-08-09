import { notFound } from "next/navigation";
import { getMatchForAdmin } from "@/lib/actions/parents-matches";
import { MatchReview } from "@/components/admin/match-review";

export default async function AdminMatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getMatchForAdmin(id);
  if (!record) notFound();

  return <MatchReview record={record} />;
}
