import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import {
  getOrCreateMyIdentity,
  refreshEmailVerified,
} from "@/lib/actions/parents-marketplace";
import { VerificationView } from "@/components/customer/verification-view";
import { Card, EmptyState, PageHead, Screen } from "@/components/admin/ui";

/**
 * Parents Tickets — the traveller's verification screen.
 *
 * Two writes happen on render, both deliberate: the identity record is created
 * on first visit, and email_verified is synced from Supabase Auth. Opening
 * "Get verified" IS the intent to start, and a stale email flag would show the
 * reviewing admin something untrue — so neither belongs behind a button.
 */
export default async function CustomerParentsPage() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  const [identity] = await Promise.all([
    getOrCreateMyIdentity(),
    refreshEmailVerified(),
  ]);

  if (!identity.ok) {
    return (
      <Screen>
        <PageHead
          title="Get verified"
          intro="Parents Tickets checks everyone by hand before they appear on the board."
        />
        <Card>
          <EmptyState
            title="Verification isn't available yet"
            body={`We couldn't open your verification record. ${identity.error}`}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <VerificationView
      identity={identity.data}
      accountEmail={user.email ?? ""}
      emailConfirmed={!!user.email_confirmed_at}
    />
  );
}
