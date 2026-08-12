import { getUserAndProfile } from "@/lib/auth";
import { normalizeAccess } from "@/lib/access";
import { PageHead, Screen } from "@/components/admin/ui";
import { EmployeeInbox } from "@/components/employee/employee-inbox";

export default async function EmployeeMessagesPage() {
  const { profile } = await getUserAndProfile();
  const access = normalizeAccess(profile?.access_level);

  return (
    <Screen>
      <PageHead
        title="Messages"
        intro="Conversations routed to you. Anything you send reaches the customer in their portal instantly."
      />
      <EmployeeInbox
        currentUserName={profile?.full_name?.trim() || "Support"}
        currentUserAvatar={profile?.avatar_url ?? null}
        accessLevel={access}
      />
    </Screen>
  );
}
