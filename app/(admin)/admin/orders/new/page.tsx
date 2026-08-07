"use client";

import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "@/lib/actions/admin";
import {
  AdminOrderForm,
  type AdminOrderCustomer,
} from "@/components/admin/admin-order-form";

const ADMIN_CUSTOMERS_KEY = ["admin", "customers"] as const;

export default function AdminNewOrderPage() {
  const { data } = useQuery({
    queryKey: ADMIN_CUSTOMERS_KEY,
    queryFn: listCustomers,
  });

  const customers: AdminOrderCustomer[] = (data ?? []).map((c) => ({
    id: c.id,
    label: c.name || c.wa_phone || "Unnamed customer",
  }));

  return <AdminOrderForm customers={customers} />;
}
