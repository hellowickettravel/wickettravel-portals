import { redirect } from "next/navigation";

/**
 * The design has one Messages screen: a two-pane inbox that opens a thread
 * in place. This legacy per-conversation route now just deep-links into it,
 * so older links (notifications, an order's "open chat") still land correctly.
 */
export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/messages?c=${id}`);
}
