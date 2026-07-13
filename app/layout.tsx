import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
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
        className={`${jakarta.variable} min-h-full font-sans antialiased`}
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
