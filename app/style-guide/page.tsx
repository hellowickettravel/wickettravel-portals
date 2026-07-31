import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getUserAndProfile } from "@/lib/auth";
import { StyleGuide } from "./style-guide";

export const metadata: Metadata = {
  title: "Design system — Wicket Travel",
  description: "Every primitive in every state. Locked tokens, verified visually.",
};

// Never prerendered: the guard below reads the session on every request.
export const dynamic = "force-dynamic";

/**
 * /style-guide — the visual proof of the foundation.
 *
 * Open to anyone in development; admin-only in production so the token sheet
 * is not a public page.
 */
export default async function StyleGuidePage() {
  if (process.env.NODE_ENV === "production") {
    const { profile } = await getUserAndProfile();
    if (profile?.role !== "admin") notFound();
  }

  return <StyleGuide />;
}
