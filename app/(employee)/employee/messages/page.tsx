import { getUserAndProfile } from "@/lib/auth";
import { normalizeAccess } from "@/lib/access";
import { PageHead, Screen } from "@/components/admin/ui";
import { ConversationInbox } from "@/components/portal/conversation-inbox";

export default async function EmployeeMessagesPage() {
  const { user, profile } = await getUserAndProfile();
  const access = normalizeAccess(profile?.access_level);

  return (
    <Screen>
      <PageHead
        title="Messages"
        intro="Conversations routed to you. Anything you send reaches the customer in their portal instantly."
      />
      {/* The two-pane inbox itself is still the shared navy/orange component —
          it is driven by the employee's own server actions, whose shapes differ
          from the admin inbox's, so moving it onto the design needs the data
          source parameterised rather than a restyle. */}
      <ConversationInbox
        scope="employee"
        accessLevel={access}
        currentUserId={user?.id ?? ""}
      />
    </Screen>
  );
}
