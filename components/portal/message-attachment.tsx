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
            className="max-h-60 w-full max-w-[260px] rounded-chip object-cover"
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
          className="absolute bottom-2 right-2 inline-flex size-11 items-center justify-center rounded-chip bg-ocean-ink/60 text-tx-invert shadow-lift outline-none transition-colors duration-150 ease-brand hover:bg-ocean-ink/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
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
        "mb-1 flex w-full max-w-[260px] items-center gap-2.5 rounded-chip border px-3 py-2 text-left text-[14.5px] outline-none transition-colors duration-150 ease-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame",
        mine
          ? "border-white/25 bg-white/10 hover:bg-white/20"
          : "border-line bg-sunk hover:bg-sky-tint"
      )}
    >
      <FileText className={cn("size-5 shrink-0", mine ? "text-tx-invert" : "text-ocean")} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <Download className={cn("size-4 shrink-0", mine ? "text-tx-invert-2" : "text-tx-muted")} />
    </button>
  );
}
