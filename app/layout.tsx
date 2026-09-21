import type { Metadata } from "next";
import { Instrument_Sans, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

// Single brand typeface — Plus Jakarta Sans (variable, full weight axis).
// Headings, body and labels all use it; hierarchy comes from font weights.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

// Auth screens follow the "Auth Pages" design's own pairing: Instrument Sans
// carries body, labels and inputs; Poppins carries the display headings and the
// brand wordmark. Scoped to /login, /signup, /forgot-password, /reset-password
// via .auth-root — the portals stay on Plus Jakarta Sans.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const PORTAL_ORIGIN = "https://portal.wickettravel.com";

export const metadata: Metadata = {
  metadataBase: new URL(PORTAL_ORIGIN),
  title: {
    default: "Wicket Travel — Portal",
    template: "%s — Wicket Travel",
  },
  description: "Shared team inbox, orders CRM and admin panel for Wicket Travel.",
  /**
   * DEFAULT-DENY INDEXING for the whole portal.
   *
   * This is an application, not a publication: sign-in screens, dashboards
   * and order forms have nothing to offer a searcher, and a /login page
   * ranking for the brand name competes with wickettravel.com for the same
   * query while sending the visitor somewhere they can't use.
   *
   * robots.ts blocks the CRAWL of the app areas; this blocks the INDEX of
   * everything that is still crawlable. Both are needed — a URL blocked in
   * robots.txt can still be indexed from an external link, because Google
   * never reads the page to discover the noindex.
   *
   * One page opts back in: /join-as-helper exports its own `robots`, since
   * Next replaces this object wholesale rather than merging into it.
   */
  robots: { index: false, follow: false },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseOrigin = supabasePreconnect();
  return (
    // en-GB so native date inputs render dd/mm/yyyy for a UK business.
    <html lang="en-GB" className="h-full">
      <body
        className={`${jakarta.variable} ${instrumentSans.variable} ${poppins.variable} min-h-full font-sans antialiased`}
      >
        {/* Hoisted to <head> by React 19 — warms the Supabase TLS connection. */}
        {supabaseOrigin ? (
          <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
        ) : null}
        <Providers>{children}</Providers>
        {/* Styling lives in components/ui/sonner.tsx — the product's own,
            not the library's defaults. */}
        <Toaster />
      </body>
    </html>
  );
}
