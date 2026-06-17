import { getUserAndProfile } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { InboxTools } from "@/components/admin/inbox-tools";
import { ConversationInbox } from "@/components/portal/conversation-inbox";

export default async function MessagesPage() {
  const { user } = await getUserAndProfile();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Inbox"
        title="Messages"
        subtitle="Full access to every customer conversation — open any chat and reply."
      />

      <InboxTools />

      <ConversationInbox scope="admin" currentUserId={user?.id ?? ""} />
    </div>
  );
}
