import { getUserAndProfile } from "@/lib/auth";
import { normalizeAccess } from "@/lib/access";
import { ConversationInbox } from "@/components/portal/conversation-inbox";

export default async function EmployeeMessagesPage() {
  const { user, profile } = await getUserAndProfile();
  const access = normalizeAccess(profile?.access_level);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-navy sm:text-2xl">
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your assigned conversations with customers.
        </p>
      </div>
      <ConversationInbox
        scope="employee"
        accessLevel={access}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}
