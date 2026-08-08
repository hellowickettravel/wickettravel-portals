"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/admin/icons";
import { Spinner } from "@/components/admin/ui";

/**
 * The admin design's overlay sheet — the chrome behind every /admin modal.
 * The design draws one dialog (Add customer / Add employee); this is that
 * dialog's shell, so a confirm and a form share the same scrim, radius,
 * elevation and footer rather than each reaching for the shared shadcn
 * <Dialog>, which belongs to the navy/orange portals.
 */
export function Sheet({
  open,
  onClose,
  labelledBy,
  width = 780,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  width?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>(
        "input, select, textarea, button:not([data-sheet-close])"
      )
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
        data-sheet-close
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ maxWidth: width }}
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_oklch(0.205_0.038_258_/_0.28)]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** The sheet's header: tinted glyph tile, Poppins title, subcopy, close. */
export function SheetHead({
  icon,
  title,
  subtitle,
  titleId,
  onClose,
  tone = "marine",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  titleId: string;
  onClose: () => void;
  tone?: "marine" | "danger";
}) {
  return (
    <div className="border-line-soft flex flex-none items-start gap-4 border-b p-[20px_24px]">
      <span
        className={cn(
          "flex size-10 flex-none items-center justify-center rounded-[11px]",
          tone === "danger"
            ? "bg-danger-chip text-danger-ink"
            : "bg-marine-tint text-marine-600"
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2
          id={titleId}
          className="font-poppins text-ink-880 m-0 text-[17px] font-medium tracking-[-0.016em]"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="text-ink-600 m-0 text-[12.5px] leading-[1.5] font-normal text-pretty">
            {subtitle}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        data-sheet-close
        className="border-line-base text-ink-600 hover:bg-surface-1 flex size-[34px] flex-none items-center justify-center rounded-full border bg-white outline-none"
      >
        <CloseIcon size={15} />
      </button>
    </div>
  );
}

/** The sheet's footer bar: an optional note on the left, actions on the right. */
export function SheetFoot({
  note,
  children,
}: {
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-line-soft bg-surface-1 flex flex-none flex-wrap items-center justify-between gap-3 border-t p-[16px_24px]">
      {note ? (
        <span className="text-ink-500 text-[11.5px] font-normal text-pretty">
          {note}
        </span>
      ) : (
        <span />
      )}
      <div className="flex gap-2.5">{children}</div>
    </div>
  );
}

/**
 * A yes/no sheet. Replaces the shared `ConfirmDialog` inside /admin so a
 * destructive confirm carries the design's danger palette rather than the
 * portals' navy/orange one.
 */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  icon,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
}) {
  const id = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={id} width={460}>
      <SheetHead
        icon={icon}
        title={title}
        titleId={id}
        onClose={onClose}
        tone={destructive ? "danger" : "marine"}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <p className="text-ink-600 m-0 text-[13px] leading-[1.6] font-normal text-pretty">
          {body}
        </p>
      </div>
      <SheetFoot>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="border-line-field text-ink-800 h-10 rounded-full border bg-white px-5 text-[13px] font-medium outline-none hover:bg-[var(--color-surface-2)] disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border-0 px-6 text-[13px] font-medium whitespace-nowrap text-white outline-none disabled:opacity-60",
            destructive
              ? "bg-danger-strong hover:bg-danger-ink"
              : "bg-ember-600 hover:bg-ember-700"
          )}
        >
          {busy ? <Spinner /> : null}
          {confirmLabel}
        </button>
      </SheetFoot>
    </Sheet>
  );
}
