import { notFound } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getMatchForAdmin } from "@/lib/actions/parents-matches";
import {
  getMatchPayment,
  getReleasedContact,
} from "@/lib/actions/parents-payments";
import { MatchReview } from "@/components/admin/match-review";
import type { ReleasedContact } from "@/lib/parents-marketplace";

export default async function AdminMatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getMatchForAdmin(id);
  if (!record) notFound();

  const { user } = await getUserAndProfile();

  const payment = await getMatchPayment(id);

  // Only ask for contacts once the flag is set. The RPC would answer with
  // nothing anyway, but not fetching is the honest expression of the rule —
  // and keeps the details out of the payload of every unreleased match.
  let contacts: ReleasedContact[] = [];
  if (record.contact_released) {
    const found = await getReleasedContact(id);
    if (found.ok) contacts = found.data;
  }

  return (
    <MatchReview
      record={record}
      payment={payment}
      contacts={contacts}
      viewerId={user?.id ?? ""}
    />
  );
}
