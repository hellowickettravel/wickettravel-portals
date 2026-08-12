import { PortalNotFound } from "@/components/admin/portal-not-found";

export default function NotFound() {
  return (
    <PortalNotFound
      homeHref="/helper"
      homeLabel="Back to my trips"
      links={[
        { href: "/helper/new", label: "Post a trip" },
        { href: "/helper/verify", label: "Verification" },
        { href: "/helper/profile", label: "My profile" },
      ]}
    />
  );
}
