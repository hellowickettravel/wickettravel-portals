import { FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders a message attachment from its media_url. Images show as an inline
 * thumbnail (click → open full); PDFs/other files show as a download chip.
 * Works inside both incoming (light) and outgoing (dark) bubbles via `mine`.
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

export function MessageAttachment({
  url,
  mine,
}: {
  url: string;
  mine: boolean;
}) {
  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="attachment"
          className="mb-1 max-h-60 w-full max-w-[260px] rounded-lg object-cover"
        />
      </a>
    );
  }

  const name = fileNameFromUrl(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mb-1 flex max-w-[260px] items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
        mine
          ? "border-white/25 bg-white/10 hover:bg-white/20"
          : "border-border bg-neutral-soft hover:bg-muted"
      )}
    >
      <FileText className={cn("size-5 shrink-0", mine ? "text-white" : "text-brand")} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <Download className={cn("size-4 shrink-0", mine ? "text-white/80" : "text-muted-foreground")} />
    </a>
  );
}
