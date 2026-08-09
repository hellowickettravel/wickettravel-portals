import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMyListings } from "@/lib/actions/parents-listings";
import { listMyMatches } from "@/lib/actions/parents-matches";
import { getReleasedContact } from "@/lib/actions/parents-payments";
import { ListingsView } from "@/components/customer/listings-view";
import type {
  ReleasedContact,
  VerificationStatus,
} from "@/lib/parents-marketplace";

/**
 * The customer's Parents Tickets dashboard.
 *
 * The verification state is read directly rather than through
 * getOrCreateMyIdentity — this page only needs to KNOW the status, and a
 * dashboard should not create a record as a side effect of being looked at.
 * Starting verification happens on /customer/parents/verify.
 */
export default async function CustomerParentsPage() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [listings, matches, { data: identity }] = await Promise.all([
    listMyListings(),
    listMyMatches(),
    supabase
      .from("parent_ticket_identities")
      .select("verification_status")
      .eq("profile_id", user.id)
      .maybeSingle<{ verification_status: VerificationStatus }>(),
  ]);

  // Contact details are fetched ONLY for matches already flagged released. The
  // RPC would refuse the rest anyway, but asking only for what is unlocked
  // keeps every other match's details out of the page's payload entirely.
  const released = matches.filter((m) => m.match.contact_released);
  const contacts: Record<string, ReleasedContact[]> = {};
  await Promise.all(
    released.map(async ({ match }) => {
      const res = await getReleasedContact(match.id);
      if (res.ok) contacts[match.id] = res.data;
    })
  );

  return (
    <ListingsView
      listings={listings}
      matches={matches}
      contacts={contacts}
      verificationStatus={identity?.verification_status ?? "unverified"}
    />
  );
}
