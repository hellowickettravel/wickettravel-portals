"use client";

import { useQuery } from "@tanstack/react-query";
import { listOrderCustomers } from "@/lib/actions/admin";
import {
  AdminOrderForm,
  type AdminOrderCustomer,
} from "@/components/admin/admin-order-form";

// Its own key: this is the picker list plus the two details the wizard
// pre-fills, not the plain customer records ["admin","customers"] holds.
const ORDER_CUSTOMERS_KEY = ["admin", "order-customers"] as const;

export default function AdminNewOrderPage() {
  const { data } = useQuery({
    queryKey: ORDER_CUSTOMERS_KEY,
    queryFn: listOrderCustomers,
  });

  const customers: AdminOrderCustomer[] = data ?? [];

  return <AdminOrderForm customers={customers} />;
}
