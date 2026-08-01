import type { Metadata } from "next";
import { Figtree, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

// ── Two faces (design system v5 §1) ───────────────────────────────────
// Figtree does everything: body, headings, labels, buttons, tables, nav,
// numbers. One family across the whole product is the point.
//
// It is a geometric-humanist sans with slightly canted terminals, so it
// reads warm and confident at 800 without reading decorative — which is
// exactly the register the front door needs and the register a serif
// could not hold. The variable file covers 300–900, so the 40px headline
// and the 11px micro-label come from the same download.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

// Codes only: order numbers, PNRs, airport codes. Not labels, not headings.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wicket Travel — Portal",
  description: "Shared team inbox, orders CRM and admin panel for Wicket Travel.",
};

// Warm the TLS connection to Supabase before the first data/auth call. Every
// portal fetches from here immediately on load, so preconnecting shaves the
// DNS+TLS handshake off that first request (better LCP/TTFB). Anonymous CORS
// matches how supabase-js issues requests (apikey header, no cookies).
function supabasePreconnect() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

// Resolve the theme before first paint. Without this the page renders light,
// then snaps to dark on hydration — a white flash on every single navigation
// for anyone using dark mode. It reads the same key the topbar toggle writes,
// and falls back to the OS preference when the user has never chosen.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("wt-theme");var d=s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseOrigin = supabasePreconnect();
  return (
    // `suppressHydrationWarning` is required, not incidental: THEME_SCRIPT
    // mutates <html>'s class and style before React hydrates, so the server
    // markup and the live DOM legitimately differ on this one element.
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body
        className={`${figtree.variable} ${plexMono.variable} min-h-full font-sans antialiased`}
      >
        {/* Hoisted to <head> by React 19 — warms the Supabase TLS connection. */}
        {supabaseOrigin ? (
          <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
        ) : null}
        <Providers>{children}</Providers>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
