import { PortalNotFound } from "@/components/admin/portal-not-found";

export default function NotFound() {
  return (
    <PortalNotFound
      homeHref="/customer"
      homeLabel="Back to my dashboard"
      links={[
        { href: "/customer/orders", label: "My orders" },
        { href: "/customer/messages", label: "Messages" },
        { href: "/customer/support", label: "Get help" },
      ]}
    />
  );
}
