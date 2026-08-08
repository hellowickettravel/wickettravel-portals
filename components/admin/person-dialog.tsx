"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, CloseIcon } from "@/components/admin/icons";
import { focusRing } from "@/components/admin/ui";

/**
 * The design's "Add customer" / "Add employee" modal, built from the design's
 * own markup rather than the shared shadcn <Dialog>: a 780px sheet with a
 * marine glyph in the header, uppercase section headings over a two-column
 * field grid, and a surface-1 footer carrying the note and the ember CTA.
 *
 * The two screens differ only in their field model, so both drive this.
 */

export type PersonField =
  | {
      kind: "text";
      id: string;
      label: string;
      placeholder?: string;
      type?: string;
      required?: boolean;
      full?: boolean;
      value: string;
      onChange: (v: string) => void;
    }
  | {
      kind: "select";
      id: string;
      label: string;
      options: { value: string; label: string }[];
      full?: boolean;
      value: string;
      onChange: (v: string) => void;
    }
  | {
      kind: "area";
      id: string;
      label: string;
      placeholder?: string;
      full?: boolean;
      value: string;
      onChange: (v: string) => void;
    };

export type PersonSection = { title: string; fields: PersonField[] };

/** The design's 42px control — a half-step taller than the page's inputs. */
const controlClass =
  "border-line-field text-ink-800 h-[42px] w-full rounded-[10px] border bg-white px-4 text-[13.5px] font-normal outline-none";

function Field({ field }: { field: PersonField }) {
  const cls = cn(controlClass, focusRing);
  return (
    <label
      className={cn(
        "flex min-w-0 flex-col gap-[7px]",
        field.full && "col-[1/-1]"
      )}
      htmlFor={field.id}
    >
      <span className="text-ink-700 text-[11.5px] font-medium">
        {field.label}
      </span>
      {field.kind === "select" ? (
        <select
          id={field.id}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          className={cn(cls, "cursor-pointer appearance-none")}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.kind === "area" ? (
        <textarea
          id={field.id}
          rows={3}
          value={field.value}
          placeholder={field.placeholder}
          onChange={(e) => field.onChange(e.target.value)}
          className={cn(
            "border-line-field text-ink-800 w-full resize-y rounded-[10px] border bg-white px-4 py-3 text-[13.5px] leading-[1.55] font-normal outline-none",
            focusRing
          )}
        />
      ) : (
        <input
          id={field.id}
          type={field.type ?? "text"}
          value={field.value}
          required={field.required}
          placeholder={field.placeholder}
          onChange={(e) => field.onChange(e.target.value)}
          className={cls}
        />
      )}
    </label>
  );
}

/** One access tile — the design's bordered card with a 19px rounded check. */
export function AccessCard({
  label,
  hint,
  checked,
  onSelect,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-[11px] border p-[13px_16px] text-left outline-none",
        checked
          ? "border-marine-edge bg-marine-soft"
          : "border-line-base hover:bg-surface-1 bg-white"
      )}
    >
      <span
        className={cn(
          /* 6px — admin's --radius makes `rounded-md` almost a circle at
             19px, and the design's mark is a rounded square. */
          "mt-px flex size-[19px] flex-none items-center justify-center rounded-[6px] border-[1.5px]",
          checked
            ? "border-marine-500 bg-marine-500 text-white"
            : "border-ink-300 bg-white text-transparent"
        )}
      >
        <CheckIcon size={12} width={3} />
      </span>
      <span className="flex min-w-0 flex-col gap-[3px]">
        <span className="text-ink-800 text-[13px] font-medium">{label}</span>
        <span className="text-ink-500 text-[11.5px] leading-[1.45] font-normal text-pretty">
          {hint}
        </span>
      </span>
    </button>
  );
}

export function PersonDialog({
  open,
  onClose,
  icon,
  title,
  subtitle,
  sections,
  extra,
  note,
  cta,
  busy,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  sections: PersonSection[];
  /** Rendered under the sections — the design puts Access level here. */
  extra?: React.ReactNode;
  note: string;
  cta: string;
  busy?: boolean;
  onSubmit: () => void;
}) {
  const headingId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Escape closes, and the body underneath must not scroll while the sheet is
  // up — the design's overlay covers the whole viewport.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current
      ?.querySelector<HTMLElement>("input, select, textarea")
      ?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-[oklch(0.205_0.038_258_/_0.42)] p-[clamp(12px,3vw,40px)] backdrop-blur-[3px]">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative flex max-h-[90vh] w-full max-w-[780px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_oklch(0.205_0.038_258_/_0.28)]"
      >
        <div className="border-line-soft flex flex-none items-start gap-4 border-b p-[20px_24px]">
          <span className="bg-marine-tint text-marine-600 flex size-10 flex-none items-center justify-center rounded-[11px]">
            {icon}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2
              id={headingId}
              className="font-poppins text-ink-880 m-0 text-[17px] font-medium tracking-[-0.016em]"
            >
              {title}
            </h2>
            <p className="text-ink-600 m-0 text-[12.5px] leading-[1.5] font-normal text-pretty">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="border-line-base text-ink-600 hover:bg-surface-1 flex size-[34px] flex-none items-center justify-center rounded-full border bg-white outline-none"
          >
            <CloseIcon size={15} />
          </button>
        </div>

        <form
          id={`${headingId}-form`}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="om-scroll min-h-0 flex-1 overflow-y-auto px-6 pt-1 pb-6"
        >
          {sections.map((s) => (
            <div key={s.title} className="flex flex-col gap-[14px] pt-5">
              <span className="text-ink-500 text-[11px] font-semibold tracking-[0.11em] uppercase">
                {s.title}
              </span>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                {s.fields.map((f) => (
                  <Field key={f.id} field={f} />
                ))}
              </div>
            </div>
          ))}
          {extra}
        </form>

        <div className="border-line-soft bg-surface-1 flex flex-none flex-wrap items-center justify-between gap-3 border-t p-[16px_24px]">
          <span className="text-ink-500 text-[11.5px] font-normal text-pretty">
            {note}
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="border-line-field text-ink-800 h-10 rounded-full border bg-white px-5 text-[13px] font-medium outline-none hover:bg-[var(--color-surface-2)] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={`${headingId}-form`}
              disabled={busy}
              className="bg-ember-600 hover:bg-ember-700 h-10 rounded-full border-0 px-6 text-[13px] font-medium whitespace-nowrap text-white outline-none disabled:opacity-60"
            >
              {busy ? "Creating…" : cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
