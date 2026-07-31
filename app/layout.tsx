import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

// Two faces (design system v2 §09). Hanken Grotesk does all the work —
// headings, body, UI. Weights stop at 700. Newsreader is retired from the
// portal; it belongs on the marketing site only, if at all.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        className={`${hanken.variable} ${plexMono.variable} min-h-full font-sans antialiased`}
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
