import { notFound } from "next/navigation";
import { getVisaEnquiry } from "@/lib/actions/visa";
import { VisaEnquiryDetail } from "@/components/admin/visa-enquiry-detail";

export default async function AdminVisaQueryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getVisaEnquiry(id);
  if (!detail) notFound();

  return <VisaEnquiryDetail detail={detail} />;
}
