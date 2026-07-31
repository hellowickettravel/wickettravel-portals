import type { Metadata } from "next";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

// ── Three faces (design system v3 §09) ────────────────────────────────
// Fraunces is the brand voice: a warm optical serif used ONLY at display
// sizes — page titles, stat metrics, auth headlines, empty states. It is
// what stops this reading like a generic dashboard. `opsz` is pinned high
// so the cut stays the display cut rather than the text cut, and SOFT
// rounds the terminals a little so it feels warm rather than severe.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

// Manrope does every piece of interface work: body, labels, buttons, table
// text, nav. Warm, semi-geometric, and unusually even at 13–15px, which is
// where a portal actually lives.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

// Airport codes, booking references, timestamps, uppercase micro-labels.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseOrigin = supabasePreconnect();
  return (
    <html lang="en" className="h-full">
      <body
        className={`${manrope.variable} ${fraunces.variable} ${plexMono.variable} min-h-full font-sans antialiased`}
      >
        {/* Hoisted to <head> by React 19 — warms the Supabase TLS connection. */}
        {supabaseOrigin ? (
          <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
        ) : null}
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
