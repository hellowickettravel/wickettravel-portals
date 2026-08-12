"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/admin/icons";
import { Btn } from "@/components/admin/ui";

/**
 * Render a modal as a direct child of <body>.
 *
 * `position: fixed` is only relative to the VIEWPORT while no ancestor has a
 * transform, filter, backdrop-filter, `will-change` or `contain: paint`. Any
 * one of those makes that ancestor the containing block instead, and traps the
 * element in its stacking context.
 *
 * This project hit exactly that. The page-entrance wrapper in `template.tsx`
 * used `animation-fill-mode: both`, which pins the final keyframe forever —
 * and that keyframe's `transform: none` computes to `matrix(1,0,0,1,0,0)`, a
 * real transform rather than the keyword. So every dialog was measured against
 * the content column instead of the window: on a 1440x900 screen the scrim came
 * out 1105x560 at (288, 98), leaving the sticky header and the sidebar OUTSIDE
 * it — undimmed, and painting over the dialog because their z-30/z-50 sat in
 * the root stacking context while the dialog's z-90 was trapped below.
 *
 * Fixing the animation removes today's cause. Portalling removes the whole
 * CLASS of cause: there are no ancestors between this overlay and <body>, so
 * nothing anyone adds to a layout later can reach it.
 */
function DialogPortal({ children }: { children: React.ReactNode }) {
  /* No mounted-state dance: every caller already returns null while closed,
     and a dialog only ever opens from a client interaction, so this never runs
     during SSR and there is nothing for hydration to mismatch. The guard is
     belt-and-braces for a future caller that opens one by default. */
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export { DialogPortal };

/**
 * Lock the page behind a modal WITHOUT moving it.
 *
 * `body { overflow: hidden }` on its own removes the vertical scrollbar, the
 * viewport gets ~15px wider, and every fixed/sticky/centred thing on the page
 * — sidebar, top bar, cards — jumps sideways behind the scrim. Under a
 * blurred overlay that lurch is what reads as the dialog "breaking the
 * screen". `scrollbar-gutter: stable` on <html> (globals.css) reserves the
 * space permanently; this is the belt-and-braces for browsers that ignore it
 * and for the case where a scrollbar was actually present.
 *
 * Returns the undo function so the caller's effect cleanup stays a one-liner.
 */
function lockScroll(): () => void {
  const gap = window.innerWidth - document.documentElement.clientWidth;
  const prevOverflow = document.body.style.overflow;
  const prevPad = document.body.style.paddingRight;
  document.body.style.overflow = "hidden";
  if (gap > 0) {
    const current = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.paddingRight = `${current + gap}px`;
  }
  return () => {
    document.body.style.overflow = prevOverflow;
    document.body.style.paddingRight = prevPad;
  };
}

export { lockScroll };

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
      /* Focus trap. Without it, tabbing past the last control walks out of the
         dialog and into the page behind the scrim — which the user can see
         highlighting but cannot reach, another reason the sheets felt broken. */
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const unlock = lockScroll();
    ref.current
      ?.querySelector<HTMLElement>(
        "input, select, textarea, button:not([data-sheet-close])"
      )
      ?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    /* `admin-root` is repeated on the overlay: it now hangs off <body>, so it
       no longer inherits the design system's base layer from the portal shell. */
    <DialogPortal>
      <div className="admin-root wt-scrim fixed inset-0 z-90 flex items-center justify-center bg-[oklch(0.205_0.038_258_/_0.42)] p-[clamp(12px,3vw,40px)] backdrop-blur-[3px]">
        <button
          type="button"
          aria-label="Close"
          tabIndex={-1}
          data-sheet-close
          data-scrim
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
            "wt-sheet relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_oklch(0.205_0.038_258_/_0.28)]",
            className
          )}
        >
          {children}
        </div>
      </div>
    </DialogPortal>
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
        <Btn onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Btn>
        <Btn
          onClick={onConfirm}
          pending={busy}
          pendingLabel="Working…"
          variant={destructive ? "danger" : "ember"}
          className={cn(
            "px-6",
            destructive &&
              "bg-danger-strong hover:bg-danger-ink border-0 text-white"
          )}
        >
          {confirmLabel}
        </Btn>
      </SheetFoot>
    </Sheet>
  );
}
