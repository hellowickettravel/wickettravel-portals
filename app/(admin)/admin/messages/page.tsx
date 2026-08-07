import { getUserAndProfile } from "@/lib/auth";
import { PageHead, Screen } from "@/components/admin/ui";
import { InboxTools } from "@/components/admin/inbox-tools";
import { AdminInbox } from "@/components/admin/admin-inbox";

export default async function MessagesPage() {
  const { user } = await getUserAndProfile();

  return (
    <Screen>
      <PageHead
        title="Messages"
        intro="One thread per customer. Employees see the same history you do."
      />

      <InboxTools />

      <AdminInbox currentUserId={user?.id ?? ""} />
    </Screen>
  );
}
