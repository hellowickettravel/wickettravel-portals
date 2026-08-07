import { ForgotPasswordForm } from "./forgot-password-form";

/**
 * Server shell so ?sent=1 — the hero switcher's "Sent" screen — is rendered
 * server-side. Reading it on the client instead would flash the request form
 * for a frame before swapping to the confirmation.
 */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  return <ForgotPasswordForm initialSent={sent === "1"} />;
}
