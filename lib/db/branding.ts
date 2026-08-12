import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The business logo URL for portal shells. Read with the service-role client so
 * employees/customers (whose RLS can't see business_settings) still get the
 * logo, WITHOUT exposing the other settings fields (email/phone/commission).
 * The logo lives in a public Storage bucket, so the URL isn't sensitive.
 *
 * Wrapped in React `cache()`: it is request-scoped, so a layout and anything
 * nested under it share one round trip instead of paying ~180ms each.
 */
export const getBrandLogoUrl = cache(async function getBrandLogoUrl(): Promise<
  string | null
> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("business_settings")
      .select("logo_url")
      .eq("id", 1)
      .maybeSingle<{ logo_url: string | null }>();
    return data?.logo_url ?? null;
  } catch {
    return null;
  }
});
