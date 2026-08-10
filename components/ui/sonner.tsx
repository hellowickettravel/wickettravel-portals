"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CheckCircleIcon,
  CloseIcon,
  InfoIcon,
  Spinner,
  WarningIcon,
} from "@/components/admin/toast-icons";

/**
 * The product's own toast, not the library's.
 *
 * Sonner ships a rounded grey box in the system font with its own green and
 * red. Everything else in this portal is Instrument Sans on the Marine / Ink /
 * Ember ramp with 12px cards and one shadow — a default-looking toast is the
 * one moment the whole product stops feeling like itself, and it appears at
 * exactly the moment someone has just done something and is looking for
 * reassurance.
 *
 * So: our type, our tokens, our radius, our elevation, and the design's own
 * 24-box glyphs rather than a second icon set. The status colour is carried by
 * a tinted icon chip and a hairline, never by flooding the whole surface —
 * same rule the status pills follow.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      // Sonner's own colour scheme is off; ours comes from classNames below.
      richColors={false}
      position="top-right"
      // Clears the 64px sticky top bar. At 20 it sat on top of the account
      // menu and the bell — covering the chrome at the exact moment someone
      // might want to click it.
      offset={78}
      mobileOffset={16}
      gap={10}
      visibleToasts={4}
      // 4.5s is long enough to read two lines without stalling a fast worker
      // clearing a queue.
      duration={4500}
      icons={{
        success: <CheckCircleIcon />,
        error: <CloseIcon />,
        warning: <WarningIcon />,
        info: <InfoIcon />,
        loading: <Spinner />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: [
            "wt-toast group pointer-events-auto flex w-full items-start gap-3",
            "rounded-[12px] border border-line-base bg-white p-4",
            "shadow-[0_20px_48px_oklch(0.205_0.038_258_/_0.16)]",
            "font-[family-name:var(--font-instrument-sans)]",
          ].join(" "),
          title: "text-ink-900 text-[13.5px] font-medium leading-[1.4]",
          description:
            "text-ink-600 mt-1 text-[12.5px] font-normal leading-[1.5] text-pretty",
          icon: "mt-px flex size-[22px] flex-none items-center justify-center rounded-full",
          content: "flex min-w-0 flex-1 flex-col",
          actionButton:
            "ml-3 inline-flex h-8 flex-none items-center rounded-full bg-ember-600 px-3.5 text-[12px] font-medium text-white hover:bg-ember-700",
          cancelButton:
            "ml-2 inline-flex h-8 flex-none items-center rounded-full border border-line-field bg-white px-3.5 text-[12px] font-medium text-ink-700 hover:bg-surface-1",
          closeButton:
            "border-line-field bg-white text-ink-600 hover:bg-surface-1",
        },
      }}
      {...props}
    />
  );
}
