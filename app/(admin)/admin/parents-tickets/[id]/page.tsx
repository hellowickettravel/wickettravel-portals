import { notFound } from "next/navigation";
import { getParentTicket } from "@/lib/actions/parents-tickets";
import { ParentTicketDetail } from "@/components/admin/parent-ticket-detail";

export default async function AdminParentsTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const enquiry = await getParentTicket(id);
  if (!enquiry) notFound();

  return <ParentTicketDetail enquiry={enquiry} />;
}
