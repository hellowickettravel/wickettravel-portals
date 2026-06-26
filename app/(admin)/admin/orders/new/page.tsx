"use client";

import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "@/lib/actions/admin";
import { OrderForm, type OrderFormCustomer } from "@/components/orders/order-form";

const ADMIN_CUSTOMERS_KEY = ["admin", "customers"] as const;

export default function AdminNewOrderPage() {
  const { data } = useQuery({
    queryKey: ADMIN_CUSTOMERS_KEY,
    queryFn: listCustomers,
  });

  const customers: OrderFormCustomer[] = (data ?? []).map((c) => ({
    id: c.id,
    label: c.name || c.wa_phone || "Unnamed customer",
  }));

  return <OrderForm role="admin" customers={customers} />;
}
