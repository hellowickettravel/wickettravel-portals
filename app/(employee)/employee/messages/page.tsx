import { getUserAndProfile } from "@/lib/auth";
import { normalizeAccess } from "@/lib/access";
import { MessagesInbox } from "@/components/employee/messages-inbox";

export default async function EmployeeMessagesPage() {
  const { profile } = await getUserAndProfile();
  const access = normalizeAccess(profile?.access_level);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy">
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your assigned conversations with customers.
        </p>
      </div>
      <MessagesInbox accessLevel={access} />
    </div>
  );
}
