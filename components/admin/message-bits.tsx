"use client";

import { cn } from "@/lib/utils";
import { DownloadIcon, ImageIcon } from "@/components/admin/icons";

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
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="border-line-base block w-fit overflow-hidden rounded-[10px] border bg-white no-underline hover:no-underline"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className="block max-h-60 w-full max-w-[260px] object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="border-line-field hover:bg-surface-1 flex min-w-[240px] items-center gap-3 rounded-[10px] border bg-white p-[11px_13px] no-underline hover:no-underline"
    >
      <span className="bg-marine-wash text-marine-600 flex size-[38px] flex-none items-center justify-center rounded-[9px]">
        <ImageIcon size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-ink-800 truncate text-[12.5px] font-medium">
          {label}
        </span>
        {meta ? (
          <span className="text-ink-500 text-[11px] font-normal">{meta}</span>
        ) : null}
      </span>
      <span className="text-ink-500 flex flex-none">
        <DownloadIcon size={16} />
      </span>
    </a>
  );
}
