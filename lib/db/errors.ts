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
