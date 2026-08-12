import type { NextConfig } from "next";

/**
 * Security headers, applied to every response. These are the transport-layer
 * hardening for the portal:
 *   - CSP: locks script/style/connect origins to ourselves + Supabase (REST +
 *     realtime websockets). No external script host can run, and framing is
 *     denied, so clickjacking + external-script XSS are blocked. Enforced (not
 *     report-only). Inline script/style are allowed because Next's hydration
 *     bootstrap + Tailwind inject them; there is no user-controlled inline HTML
 *     anywhere (chat is rendered as escaped React text), so this stays safe.
 *   - HSTS, nosniff, frame-deny, referrer + permissions policy round it out.
 *
 * The Supabase origin is derived from NEXT_PUBLIC_SUPABASE_URL so connect-src
 * matches whatever project this deploys against.
 */
/**
 * Path rewrites that must happen BEFORE React renders.
 *
 * /admin/messages/:id is a legacy deep link (notifications, an order's "open
 * chat") into what is now a single two-pane inbox. Doing that with a server
 * `redirect()` inside the page threw "Rendered more hooks than during the
 * previous render" from Next's own Router — redirecting into the SAME layout
 * tree remounts the shell mid-render. A routing-layer redirect never reaches
 * React at all, and is a round trip faster.
 */
async function redirects() {
  return [
    {
      source: "/admin/messages/:id",
      destination: "/admin/messages?c=:id",
      permanent: false,
    },
  ];
}

function supabaseOrigin(): string {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : "https://*.supabase.co";
  } catch {
    return "https://*.supabase.co";
  }
}

function contentSecurityPolicy(): string {
  const supabase = supabaseOrigin();
  const supabaseWs = supabase.replace(/^https:/, "wss:");
  // Dev only: React + Turbopack use eval() for HMR, source maps and callstack
  // reconstruction, which a CSP without 'unsafe-eval' blocks (throws the
  // "eval() is not supported in this environment" console error). This is
  // gated to development so the PRODUCTION CSP stays strict — React never uses
  // eval() in production builds.
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // Next.js injects an inline hydration bootstrap; Supabase JS is bundled.
    scriptSrc,
    // Tailwind + component libraries emit inline styles.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    // Signed attachment URLs + branding logo come from Supabase; OAuth avatars
    // from Google. data:/blob: cover optimistic previews.
    `img-src 'self' data: blob: ${supabase} https://*.googleusercontent.com`,
    // REST + realtime (websocket) to Supabase, plus same-origin.
    `connect-src 'self' ${supabase} ${supabaseWs}`,
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

function supabaseHost(): string {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : "*.supabase.co";
  } catch {
    return "*.supabase.co";
  }
}

const nextConfig: NextConfig = {
  redirects,
  /**
   * The sidebar renders the business logo through `next/image`, and the logo
   * lives in the public Supabase storage bucket. `next/image` THROWS on an
   * external src whose hostname isn't listed here — so the moment an admin
   * uploaded a logo in Settings, every portal shell would have crashed into
   * its error boundary. It has been latent only because no logo is set.
   */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost(), pathname: "/storage/v1/object/public/**" },
    ],
  },
  // Don't advertise the framework — trims a header off every response.
  poweredByHeader: false,
  // Barrel-import optimization: pull ONLY the icons/components actually used
  // out of these packages instead of their full index, so unused exports never
  // reach a client bundle. Behaviour is identical — purely a payload trim.
  experimental: {
    optimizePackageImports: ["lucide-react", "@base-ui/react", "sonner"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
