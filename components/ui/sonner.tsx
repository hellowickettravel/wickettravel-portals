"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Light only, like the rest of the product — never "system", which would flip
// toasts to dark under an OS dark-mode preference.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-[18px]" />
        ),
        info: (
          <InfoIcon className="size-[18px]" />
        ),
        warning: (
          <TriangleAlertIcon className="size-[18px]" />
        ),
        error: (
          <OctagonXIcon className="size-[18px]" />
        ),
        loading: (
          <Loader2Icon className="size-[18px] animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--tx-body)",
          "--normal-border": "var(--line)",
          "--border-radius": "var(--r-control)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
