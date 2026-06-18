import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/db/orders";
import { getEmployees } from "@/lib/db/profiles";
import { OrderDetail } from "@/components/admin/order-detail";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [order, employees] = await Promise.all([
    getOrderById(id),
    getEmployees(),
  ]);

  if (!order) notFound();

  return <OrderDetail order={order} employees={employees} />;
}
