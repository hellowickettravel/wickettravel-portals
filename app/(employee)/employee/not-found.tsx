import { PortalNotFound } from "@/components/admin/portal-not-found";

export default function NotFound() {
  return (
    <PortalNotFound
      homeHref="/employee"
      homeLabel="Back to my dashboard"
      links={[
        { href: "/employee/orders", label: "My orders" },
        { href: "/employee/messages", label: "Messages" },
        { href: "/employee/support", label: "Support" },
      ]}
    />
  );
}
