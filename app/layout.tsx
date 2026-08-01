import type { Metadata } from "next";
import { Inter, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

// ── Three faces (design system v4 §1) ─────────────────────────────────
// Inter does everything: body, headings, labels, buttons, tables, nav,
// numbers. One family across the whole product is the point — nothing
// here should read as styled. `opsz` lets the same font file open up at
// 13px and tighten at 34px, which is the only "expression" it gets.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

// Source Serif 4 appears on exactly three screens — the login, signup and
// password-reset headlines — and nowhere else. It is a sturdy, even text
// serif, not a display face: the brand gets one warm moment at the front
// door and then gets out of the way.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  axes: ["opsz"],
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
        className={`${inter.variable} ${sourceSerif.variable} ${plexMono.variable} min-h-full font-sans antialiased`}
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
