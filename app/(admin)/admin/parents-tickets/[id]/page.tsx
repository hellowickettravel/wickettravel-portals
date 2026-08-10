import { notFound } from "next/navigation";
import { getParentTicket } from "@/lib/actions/parents-tickets";
import {
  getLeadBridgeState,
  type LeadBridgeState,
} from "@/lib/actions/parents-lead-bridge";
import { ParentTicketDetail } from "@/components/admin/parent-ticket-detail";

export default async function AdminParentsTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const enquiry = await getParentTicket(id);
  if (!enquiry) notFound();

  // Fails soft: the bridge is an addition to a screen that has worked for
  // months, and APPLY_PARENTS_LEAD_BRIDGE.sql may not be applied yet. A
  // missing column must not take the whole lead detail down with it.
  let bridge: LeadBridgeState | null = null;
  const state = await getLeadBridgeState(id).catch(() => null);
  if (state?.ok) bridge = state.data;

  return <ParentTicketDetail enquiry={enquiry} bridge={bridge} />;
}
