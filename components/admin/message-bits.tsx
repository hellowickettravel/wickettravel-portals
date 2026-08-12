"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/admin/ui";
import {
  DownloadIcon,
  EyeIcon,
  ImageIcon,
} from "@/components/admin/icons";

/**
 * Message body + attachment for the admin threads. The shared
 * `components/portal/*` versions paint links in the navy `brand` token and the
 * attachment chrome in navy, which is the other portals' skin — inside
 * `.admin-root` a link is marine and an attachment is the design's own white
 * card with a 38px marine tile.
 */

const URL_SPLIT = /(https?:\/\/[^\s]+)/g;

export function AdminMessageText({
  text,
  mine,
}: {
  text: string;
  mine?: boolean;
}) {
  return (
    <p className="m-0 leading-[1.55] break-words whitespace-pre-wrap">
      {text.split(URL_SPLIT).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "font-medium underline underline-offset-2",
              mine ? "text-white hover:text-white" : "text-marine-600"
            )}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url);
}

function fileNameFromUrl(url: string): string {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    return path.slice(path.lastIndexOf("/") + 1) || "attachment";
  } catch {
    return "attachment";
  }
}

/**
 * Save an attachment to disk.
 *
 * `<a download>` is ignored for cross-origin URLs, and every attachment here is
 * a signed URL on the Supabase storage host — so the "download" affordance the
 * design draws did nothing but open the file in a new tab, and an image opened
 * full-size with no way to keep it at all. Fetching to a blob and revoking the
 * object URL afterwards is the only way to get a real save from another origin,
 * and Supabase is already in the CSP's `connect-src`.
 */
async function saveFile(url: string, filename: string) {
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // A revoke on the same tick can beat the download in Safari.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}

/** The download control shared by the image and the file layouts. */
function DownloadButton({
  url,
  filename,
  className,
  label = "Download",
}: {
  url: string;
  filename: string;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      title={label}
      aria-label={`${label} ${filename}`}
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        try {
          await saveFile(url, filename);
        } catch {
          toast.error("Couldn't download that file", {
            description: "The link may have expired — reopen the page and retry.",
          });
        } finally {
          setBusy(false);
        }
      }}
      className={className}
    >
      {busy ? <Spinner size={14} /> : <DownloadIcon size={16} />}
    </button>
  );
}

/** The design's attachment row: 38px tinted tile, name, meta, download. */
export function AdminMessageAttachment({
  url,
  name,
  meta,
}: {
  url: string;
  name?: string | null;
  meta?: string | null;
}) {
  const label = name?.trim() || fileNameFromUrl(url);

  if (isImageUrl(url)) {
    return (
      <span className="border-line-base group relative block w-fit overflow-hidden rounded-[10px] border bg-white">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block no-underline hover:no-underline"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="block max-h-60 w-full max-w-[260px] object-cover"
          />
        </a>
        {/* Always visible on touch, revealed on hover with a pointer — an
            action you cannot discover is the same as one that isn't there. */}
        <span className="absolute top-2 right-2 flex gap-1.5 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <DownloadButton
            url={url}
            filename={label}
            className="text-ink-700 hover:text-ink-900 flex size-8 items-center justify-center rounded-full border-0 bg-white/95 shadow-[0_4px_12px_oklch(0.205_0.038_258_/_0.18)] outline-none backdrop-blur-[2px]"
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open full size"
            aria-label={`Open ${label} full size`}
            className="text-ink-700 hover:text-ink-900 flex size-8 items-center justify-center rounded-full bg-white/95 no-underline shadow-[0_4px_12px_oklch(0.205_0.038_258_/_0.18)] backdrop-blur-[2px] hover:no-underline"
          >
            <EyeIcon size={15} />
          </a>
        </span>
      </span>
    );
  }

  return (
    <span className="border-line-field hover:bg-surface-1 flex min-w-[240px] items-center gap-3 rounded-[10px] border bg-white p-[11px_13px] transition-colors">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-3 no-underline hover:no-underline"
      >
        <span className="bg-marine-wash text-marine-600 flex size-[38px] flex-none items-center justify-center rounded-[9px]">
          <ImageIcon size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-ink-800 truncate text-[12.5px] font-medium">
            {label}
          </span>
          <span className="text-ink-500 text-[11px] font-normal">
            {meta || "Open to preview, or download to keep a copy"}
          </span>
        </span>
      </a>
      <DownloadButton
        url={url}
        filename={label}
        className="border-line-field text-ink-600 hover:border-marine-edge hover:text-marine-600 flex size-8 flex-none items-center justify-center rounded-full border bg-white outline-none"
      />
    </span>
  );
}
