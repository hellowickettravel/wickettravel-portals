"use client";

import { FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders a message attachment from its (signed) media_url. Images show as an
 * inline thumbnail with a download icon in the bottom-right corner; PDFs/other
 * files show as a download chip. Works inside both incoming (light) and outgoing
 * (dark) bubbles via `mine`. Shared by every chat surface.
 */
function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url);
}

function fileNameFromUrl(url: string): string {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const last = path.split("/").pop() ?? "attachment";
    // Strip our "<ts>-<rand>-" upload prefix for display.
    return last.replace(/^\d+-\d+-/, "") || "attachment";
  } catch {
    return "attachment";
  }
}

/**
 * Trigger a REAL file download (not just open-in-tab) from a cross-origin signed
 * URL: fetch the bytes, hand the browser a blob with a download filename. Falls
 * back to opening the URL if the fetch is blocked.
 */
async function downloadFile(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function MessageAttachment({
  url,
  mine,
}: {
  url: string;
  mine: boolean;
}) {
  const name = fileNameFromUrl(url);

  if (isImageUrl(url)) {
    return (
      <div className="group relative mb-1 w-fit">
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="attachment"
            className="max-h-60 w-full max-w-[260px] rounded-lg object-cover"
          />
        </a>
        <button
          type="button"
          aria-label="Download image"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void downloadFile(url, name);
          }}
          className="absolute bottom-2 right-2 inline-flex size-11 items-center justify-center rounded-full bg-navy/55 text-white shadow-sm backdrop-blur-sm transition hover:bg-navy/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:size-9 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <Download className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void downloadFile(url, name)}
      className={cn(
        "mb-1 flex w-full max-w-[260px] items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
        mine
          ? "border-white/25 bg-white/10 hover:bg-white/20"
          : "border-border bg-neutral-soft hover:bg-muted"
      )}
    >
      <FileText className={cn("size-5 shrink-0", mine ? "text-white" : "text-brand")} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <Download className={cn("size-4 shrink-0", mine ? "text-white/80" : "text-muted-foreground")} />
    </button>
  );
}
