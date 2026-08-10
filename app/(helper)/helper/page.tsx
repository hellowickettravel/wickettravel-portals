import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMyListings } from "@/lib/actions/parents-listings";
import { listMyMatches } from "@/lib/actions/parents-matches";
import { getMyPayouts, getReleasedContact } from "@/lib/actions/parents-payments";
import { ListingsView } from "@/components/customer/listings-view";
import type {
  ReleasedContact,
  VerificationStatus,
} from "@/lib/parents-marketplace";

/**
 * The helper's home: their trips, their matches and what they've earned.
 *
 * It renders the same ListingsView the customer portal does — one component,
 * five portals — configured with audience="helper", which changes the
 * vocabulary (a trip, not a request) and adds the earnings card. The records
 * underneath are identical; only the side differs.
 */
export default async function HelperHomePage() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [listings, matches, payouts, { data: identity }] = await Promise.all([
    listMyListings(),
    listMyMatches(),
    getMyPayouts(),
    supabase
      .from("parent_ticket_identities")
      .select("verification_status")
      .eq("profile_id", user.id)
      .maybeSingle<{ verification_status: VerificationStatus }>(),
  ]);

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
      basePath="/helper"
      audience="helper"
      payouts={payouts}
    />
  );
}
