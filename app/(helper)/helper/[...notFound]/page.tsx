import { notFound } from "next/navigation";

/**
 * Catch-all for URLs under this portal that match no route.
 *
 * Without it, Next falls straight through to the ROOT `app/not-found.tsx` for
 * an unmatched path, which drops a signed-in person out of the product
 * entirely. Calling `notFound()` from inside the segment hands the render to
 * the segment's own `not-found.tsx`, which renders inside the portal shell.
 *
 * Static and dynamic segments both take precedence over a catch-all, so this
 * never shadows a real page.
 */
export default function CatchAllNotFound() {
  notFound();
}
