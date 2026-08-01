"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";

/**
 * Filter bar — the row that sits between a page header and its data.
 *
 * From `sm` up everything in it is 38px, the system's compact control height
 * (`<Input size="sm">`, `<NativeSelect size="sm">`, `<Button size="sm">`), so
 * the row lines up without anyone nudging a margin.
 *
 * Below `sm` those same controls grow to 48px. 38px is a comfortable target
 * for a pointer and a poor one for a thumb — under the 44px minimum — and a
 * filter bar is the densest row on any screen. Density is a desktop luxury.
 *
 * The bar wraps rather than scrolls: on a phone the search takes the full
 * width and the filters fall underneath it, still aligned to each other.
 */
const compactControl = "h-12 sm:h-[38px]";

function FilterBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="filter-bar"
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  );
}

/** Pushes whatever follows to the right edge of the bar. */
function FilterBarSpacer() {
  return <div aria-hidden className="hidden flex-1 sm:block" />;
}

/**
 * Search field with a leading magnifier and a clear button once there's
 * something to clear. Full width on mobile, a fixed column from `sm` up.
 */
function FilterSearch({
  value,
  onValueChange,
  placeholder = "Search…",
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "size" | "leadingIcon"
> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Input
        type="search"
        size="sm"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        leadingIcon={<Search />}
        className={cn(
          compactControl,
          value && "pr-11 sm:pr-9",
          "[&::-webkit-search-cancel-button]:hidden"
        )}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-chip text-tx-faint outline-none transition-colors duration-150 ease-brand hover:bg-sunk hover:text-tx-body focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-coral sm:size-7"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export type FilterOption = {
  value: string;
  label: string;
  /** Shown as a tabular count on the right of the chip. */
  count?: number;
};

/**
 * Segmented filter chips on a sunk track. The selected chip is a white
 * surface with marine text — sky tint would vanish against the track.
 * Chips wrap inside the track rather than scrolling out of reach.
 */
function FilterChips({
  value,
  onValueChange,
  options,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
}) {
  return (
    <div
      data-slot="filter-chips"
      role="group"
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-control border border-line bg-sunk p-1",
        className
      )}
      {...props}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-chip px-3 text-[13px] font-semibold tracking-ui whitespace-nowrap outline-none transition-colors duration-150 ease-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-coral sm:h-[30px]",
              active
                ? "bg-surface text-marine-deep shadow-card"
                : "text-tx-muted hover:text-tx-head"
            )}
          >
            {option.label}
            {option.count != null ? (
              <span
                className={cn(
                  "tabular text-[12px] font-semibold",
                  active ? "text-marine" : "text-tx-muted"
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A labelled compact select. The label is a Plex Mono micro-label sitting
 * inline, so the control still reads as one 38px unit.
 */
function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  className,
  ...props
}: Omit<React.ComponentProps<typeof NativeSelect>, "value" | "onChange"> & {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
}) {
  const id = React.useId();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label ? (
        <label htmlFor={id} className="font-micro text-tx-muted">
          {label}
        </label>
      ) : null}
      <NativeSelect
        id={id}
        size="sm"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={compactControl}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

/**
 * A labelled compact date field, for "created from / to" style ranges.
 * Same anatomy as <FilterSelect> so a bar mixing the two still lines up.
 */
function FilterDate({
  label,
  value,
  onValueChange,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "size" | "type"> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const id = React.useId();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor={id} className="font-micro whitespace-nowrap text-tx-muted">
        {label}
      </label>
      <Input
        id={id}
        type="date"
        size="sm"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(compactControl, "w-auto")}
        {...props}
      />
    </div>
  );
}

export {
  FilterBar,
  FilterBarSpacer,
  FilterSearch,
  FilterChips,
  FilterSelect,
  FilterDate,
};
