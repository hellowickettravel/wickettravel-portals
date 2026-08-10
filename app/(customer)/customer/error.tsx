"use client";

import { useEffect } from "react";
import { PortalError } from "@/components/admin/portal-error";

/**
 * Errors inside this portal are caught HERE rather than by the root boundary,
 * so the sidebar and top bar survive and the person can carry on somewhere
 * else instead of being dropped onto a bare page.
 */
export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side detail is stripped in production; the digest is the only
    // handle that ties this screen to the server log.
    console.error("[customer]", error);
  }, [error]);

  return <PortalError digest={error.digest} reset={reset} homeHref="/customer" />;
}
