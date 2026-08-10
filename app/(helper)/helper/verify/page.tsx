import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import {
  getOrCreateMyIdentity,
  refreshEmailVerified,
} from "@/lib/actions/parents-marketplace";
import { VerificationView } from "@/components/customer/verification-view";
import { Card, EmptyState, PageHead, Screen } from "@/components/admin/ui";

/**
 * A helper's identity check — the same screen and the same server actions a
 * customer uses. Verification is about the person, not the portal they came
 * in through, so there is deliberately nothing role-specific here.
 */
export default async function HelperVerifyPage() {
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
          intro="Every helper is checked by hand before their trips reach a family."
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
