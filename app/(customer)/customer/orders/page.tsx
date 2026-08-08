import { CustomerOrders } from "@/components/customer/orders-view";

export default async function CustomerOrdersPage() {
  // Server Component render: reading the request time once is intentional. The
  // list sorts "departs next" against it, and the client render stays pure.
  const todayIso = new Date().toISOString();

  return <CustomerOrders todayIso={todayIso} />;
}
