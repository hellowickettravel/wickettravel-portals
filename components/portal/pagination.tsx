"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Pagination — the footer of a data panel.
 *
 * Sits on `sunk` behind a hairline, exactly like a card footer, so it reads as
 * part of the table rather than as loose page furniture. Counts are tabular so
 * the range stops jittering as you page through.
 *
 * Deliberately just previous/next plus a range: numbered page links buy
 * nothing on a list you're filtering, and they wrap badly on a phone.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
  /** Noun for the range line — "orders", "customers", "messages". */
  unit = "results",
}: {
  /** 1-based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  unit?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const first = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(current * pageSize, total);

  return (
    <nav
      data-slot="pagination"
      aria-label="Pagination"
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-line-faint bg-sunk px-5 py-3.5 sm:flex-row",
        className
      )}
    >
      <p className="text-[13px] text-tx-muted">
        {total === 0 ? (
          <>No {unit}</>
        ) : (
          <>
            Showing <span className="tabular text-tx-head">{first}</span>–
            <span className="tabular text-tx-head">{last}</span> of{" "}
            <span className="tabular text-tx-head">{total}</span> {unit}
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          /* 38px is a fine target for a pointer and a poor one for a thumb;
             paging is the one control here, so it grows on phones. */
          className="h-12 sm:h-[38px]"
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
        >
          <ChevronLeft />
          Previous
        </Button>
        <p className="text-[13px] whitespace-nowrap text-tx-muted">
          Page <span className="tabular text-tx-head">{current}</span> of{" "}
          <span className="tabular text-tx-head">{pageCount}</span>
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          /* 38px is a fine target for a pointer and a poor one for a thumb;
             paging is the one control here, so it grows on phones. */
          className="h-12 sm:h-[38px]"
          onClick={() => onPageChange(current + 1)}
          disabled={current >= pageCount}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
