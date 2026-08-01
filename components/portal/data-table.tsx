"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Panel } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MobileRecordCard, type MobileField } from "@/components/portal/mobile-record-card";
import { EmptyState, ErrorState } from "@/components/portal/states";

/**
 * Where a column goes once the table becomes a stack of cards:
 * the card's heading, its second line, the badge slot, the trailing action,
 * a labelled field in the grid (the default), or nowhere.
 */
type MobileRole = "title" | "subtitle" | "badge" | "action" | "field" | "hidden";

export type DataColumn<T> = {
  /** Stable identity for the column. */
  key: string;
  /** Column label. Rendered as a Plex Mono micro-label. */
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Tabular numerals, right-aligned — fares, counts, dates. */
  numeric?: boolean;
  /** Extra classes applied to both the header cell and every body cell. */
  className?: string;
  /** Header-only classes (column widths, a hidden label). */
  headClassName?: string;
  /** Body-only classes. */
  cellClassName?: string;
  /** Placement in the mobile card. Defaults to a labelled field. */
  mobile?: MobileRole;
  /** As a mobile field, span both grid columns. */
  wide?: boolean;
  /** Plain-text label for the mobile field, when `header` isn't a string. */
  mobileLabel?: string;
};

type DataTableProps<T> = {
  columns: DataColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Makes each row a link. Takes precedence over `onRowClick`. */
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** Placeholder rows while loading. */
  loadingRows?: number;
  error?: boolean;
  /** Rendered inside the error state — usually a "Try again" button. */
  errorAction?: ReactNode;
  empty?: {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
  };
  /** Usually <Pagination>. Sits on the panel footer. */
  footer?: ReactNode;
  /** Screen-reader description of what the table holds. */
  caption?: string;
  /** Noun used when announcing the row count — "orders", "customers". */
  unit?: string;
  className?: string;
};

function headerLabel<T>(column: DataColumn<T>): string {
  if (column.mobileLabel) return column.mobileLabel;
  return typeof column.header === "string" ? column.header : column.key;
}

/**
 * Data table — one definition of the columns, two renderings.
 *
 * Above `md` it is a real table on a panel: a `sunk` header row of Plex Mono
 * micro-labels, hairline dividers, 14px of vertical air, tabular numerals
 * wherever a column says `numeric`, and a marine-tint row hover. Below `md` the
 * same columns stack into cards, because a table on a phone is either a
 * sideways scroll or an unreadable squeeze.
 *
 * Loading, empty and error are states of this component rather than three
 * branches every screen has to write itself — which is how they drifted apart
 * in the first place.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  rowHref,
  onRowClick,
  loading = false,
  loadingRows = 6,
  error = false,
  errorAction,
  empty,
  footer,
  caption,
  unit = "results",
  className,
}: DataTableProps<T>) {
  const router = useRouter();
  const interactive = Boolean(rowHref || onRowClick);

  /**
   * Filtering happens above this component and changes the table silently —
   * a sighted user watches rows disappear, a screen-reader user gets nothing.
   * This says how many are left, and only speaks when the number changes.
   */
  const rowCount = (
    <span role="status" aria-live="polite" className="sr-only">
      {rows.length} {unit}
    </span>
  );

  /* ---------- Loading: keep the header, pulse the body ---------- */
  if (loading) {
    return (
      <div data-slot="data-table" aria-busy className={className}>
        {/* The skeleton is decorative; this is what a screen reader hears. */}
        <span role="status" aria-live="polite" className="sr-only">
          Loading…
        </span>
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-card border border-line bg-surface p-[18px] shadow-card"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-3 w-24" />
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-faint pt-4">
                {Array.from({ length: 4 }).map((__, j) => (
                  <Skeleton key={j} className="h-3.5 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <Panel className="hidden overflow-hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    numeric={column.numeric}
                    className={cn(column.className, column.headClassName)}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: loadingRows }).map((_, r) => (
                <TableRow key={r} className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
      <Panel className={cn("overflow-hidden", className)}>
        <ErrorState action={errorAction} />
      </Panel>
    );
  }

  /* ---------- Empty ---------- */
  if (rows.length === 0) {
    return (
      <Panel className={cn("overflow-hidden", className)}>
        {rowCount}
        <EmptyState
          icon={empty?.icon}
          title={empty?.title ?? "Nothing here yet"}
          description={empty?.description}
          action={empty?.action}
        />
      </Panel>
    );
  }

  const titleColumn = columns.find((c) => c.mobile === "title") ?? columns[0];
  const subtitleColumn = columns.find((c) => c.mobile === "subtitle");
  const badgeColumn = columns.find((c) => c.mobile === "badge");
  const actionColumn = columns.find((c) => c.mobile === "action");
  const fieldColumns = columns.filter(
    (c) =>
      c !== titleColumn &&
      c !== subtitleColumn &&
      c !== badgeColumn &&
      c !== actionColumn &&
      c.mobile !== "hidden"
  );

  return (
    <div data-slot="data-table" className={className}>
      {rowCount}

      {/* ---------- Mobile: one card per record ---------- */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const fields: MobileField[] = fieldColumns.map((column) => ({
            label: headerLabel(column),
            value: column.cell(row),
            wide: column.wide,
            numeric: column.numeric,
          }));

          const card = (
            <MobileRecordCard
              title={titleColumn.cell(row)}
              subtitle={subtitleColumn?.cell(row)}
              badge={badgeColumn?.cell(row)}
              action={actionColumn?.cell(row)}
              fields={fields}
            />
          );

          if (rowHref) {
            return (
              <Link
                key={getRowKey(row)}
                href={rowHref(row)}
                className="block rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
              >
                {card}
              </Link>
            );
          }
          if (onRowClick) {
            return (
              <button
                key={getRowKey(row)}
                type="button"
                onClick={() => onRowClick(row)}
                className="block w-full rounded-card text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
              >
                {card}
              </button>
            );
          }
          return <div key={getRowKey(row)}>{card}</div>;
        })}
      </div>

      {/* ---------- Desktop: the table itself ---------- */}
      <Panel className="hidden overflow-hidden md:block">
        <Table>
          {caption ? (
            <caption className="sr-only">{caption}</caption>
          ) : null}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  numeric={column.numeric}
                  className={cn(column.className, column.headClassName)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={getRowKey(row)}
                onClick={
                  rowHref
                    ? () => router.push(rowHref(row))
                    : onRowClick
                      ? () => onRowClick(row)
                      : undefined
                }
                className={cn(interactive && "cursor-pointer")}
              >
                {columns.map((column, i) => {
                  const content = column.cell(row);
                  return (
                    <TableCell
                      key={column.key}
                      numeric={column.numeric}
                      className={cn(column.className, column.cellClassName)}
                    >
                      {/* The whole row is clickable, but a click target is not
                          a keyboard target — the first cell carries a real
                          anchor so the row is reachable by Tab and Enter. */}
                      {i === 0 && rowHref ? (
                        <Link
                          href={rowHref(row)}
                          className="rounded-chip outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {footer}
      </Panel>

      {/* Pagination keeps its own surface once the table has become cards. */}
      {footer ? (
        <div className="mt-3 overflow-hidden rounded-card border border-line shadow-card md:hidden">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
