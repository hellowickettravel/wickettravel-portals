"use client";

import type { ReactNode } from "react";

import { DataTable, type DataColumn } from "@/components/portal/data-table";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { gbp, fmtDate, routeLabel } from "@/lib/format";
import type { OrderStatus } from "@/lib/db/types";

/**
 * The orders table, defined once.
 *
 * Server screens (the dashboard, a customer's record, an employee's record)
 * can't hand `<DataTable>` its column functions across the RSC boundary, so
 * they pass plain rows to this instead. It also stops five screens quietly
 * disagreeing about what an order row looks like.
 */

export type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  routeFrom: string | null;
  routeTo: string | null;
  status: OrderStatus;
  sellingPrice: number | null;
  createdAt: string;
};

export function OrdersTable({
  rows,
  showCustomer = true,
  empty,
  footer,
  caption = "Orders",
}: {
  rows: OrderRow[];
  /** Off on a customer's own record, where every row is that customer. */
  showCustomer?: boolean;
  empty?: { title: ReactNode; description?: ReactNode; action?: ReactNode };
  footer?: ReactNode;
  caption?: string;
}) {
  const columns: DataColumn<OrderRow>[] = [
    {
      key: "order",
      header: "Order",
      mobile: "title",
      // The order number is a reference, not prose — Plex Mono, like every
      // other code in the system.
      cell: (row) => (
        <span className="font-mono text-[13.5px] font-medium text-tx-head">
          {row.orderNumber}
        </span>
      ),
    },
    ...(showCustomer
      ? [
          {
            key: "customer",
            header: "Customer",
            mobile: "subtitle" as const,
            cell: (row: OrderRow) => row.customerName ?? "—",
          },
        ]
      : []),
    {
      key: "route",
      header: "Route",
      wide: true,
      cell: (row) => (
        <span className="text-tx-muted">{routeLabel(row.routeFrom, row.routeTo)}</span>
      ),
    },
    {
      key: "created",
      header: "Created",
      numeric: true,
      cell: (row) => fmtDate(row.createdAt),
    },
    {
      key: "value",
      header: "Value",
      numeric: true,
      cell: (row) => (
        <span className="font-semibold text-tx-head">
          {row.sellingPrice != null ? gbp(row.sellingPrice) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      mobile: "badge",
      cell: (row) => <OrderStatusBadge status={row.status} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      rowHref={(row) => `/admin/orders/${row.id}`}
      caption={caption}
      unit="orders"
      footer={footer}
      empty={
        empty ?? {
          title: "No orders yet",
          description: "Orders appear here as your team creates them.",
        }
      }
    />
  );
}
