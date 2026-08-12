import { PortalNotFound } from "@/components/admin/portal-not-found";

export default function NotFound() {
  return (
    <PortalNotFound
      homeHref="/admin"
      homeLabel="Back to the dashboard"
      links={[
        { href: "/admin/orders", label: "Orders" },
        { href: "/admin/messages", label: "Messages" },
        { href: "/admin/customers", label: "Customers" },
      ]}
    />
  );
}
