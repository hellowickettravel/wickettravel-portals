/**
 * Shared PostgREST error predicates.
 *
 * These used to be private helpers inside `lib/actions/admin.ts`. A `"use
 * server"` module may only export async functions, so a second action file
 * that needed the same check had to copy it — and a copy of "is this database
 * missing that column?" is exactly the kind of thing that drifts and then
 * silently swallows a real error.
 */

type PgError = { code?: string; message?: string } | null | undefined;

/**
 * "That column doesn't exist here" — a database that hasn't had an additive
 * migration applied yet, not a fault. Callers step their payload down and
 * save what the database does understand.
 */
export function isMissingColumn(error: PgError): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .* does not exist|Could not find the .* column/i.test(
      error.message ?? ""
    )
  );
}

/**
 * "That table doesn't exist here." Same contract as `isMissingColumn`, for
 * features whose whole table arrives with a migration — the screen renders
 * empty rather than throwing.
 */
export function isMissingTable(error: PgError): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /Could not find the table|relation .* does not exist/i.test(
      error.message ?? ""
    )
  );
}

/**
 * True for a canonical UUID.
 *
 * Needed because a portal's dynamic segment matches ANY single path segment:
 * `/helper/definitely-not-a-page` matches `/helper/[id]` (a dynamic segment
 * beats a catch-all), so a mistyped URL reached the record query with a value
 * Postgres cannot cast. That surfaced as `22P02 invalid input syntax for type
 * uuid`, which an RSC turns into a 500 error page — instead of the portal's
 * own "not found", which is what a bad URL should give you.
 *
 * Guard the id BEFORE the query, then `notFound()`.
 */
export function isUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}
