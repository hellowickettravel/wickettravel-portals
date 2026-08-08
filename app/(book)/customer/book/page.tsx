import { getUserAndProfile } from "@/lib/auth";
import { getCustomerByProfileId } from "@/lib/db/customers";
import { parseBookPrefill } from "@/lib/orders/book-link";
import { CustomerBook } from "@/components/customer/book-view";

/**
 * The customer booking wizard. Publicly viewable (the (book) layout renders a
 * guest shell when signed out); the homepage search widget can pre-fill Step 1
 * via query params (?from=&to=&tripType=&depart=&return=&cabin=&adults=
 * &children=&airline=), all validated in parseBookPrefill.
 */
export default async function BookFlightPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, { user, profile }] = await Promise.all([
    searchParams,
    getUserAndProfile(),
  ]);

  // Contact defaults — the signed-in customer's account email and any phone
  // number already on their customer record.
  let contactEmail: string | null = null;
  let contactPhone: string | null = null;
  if (user && profile?.role === "customer") {
    contactEmail = user.email ?? null;
    const customer = await getCustomerByProfileId(user.id);
    contactPhone = customer?.wa_phone ?? null;
  }

  return (
    <CustomerBook
      isGuest={!user}
      prefill={parseBookPrefill(sp)}
      contactEmail={contactEmail}
      contactPhone={contactPhone}
    />
  );
}
