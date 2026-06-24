import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone/server.js) for a slim Docker
  // image — copies only the files needed to run, not the whole node_modules.
  output: "standalone",
  // Allow dev requests from these origins (LAN IP + alternate hosts) so the
  // Next dev server doesn't block cross-origin asset/HMR requests. Ignored in
  // production builds.
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.196"],
  // Redirect the index route at the routing layer (not via a Server Component).
  // The old app/page.tsx `Home` did redirect('/login') during render, which trips a
  // Next 16 dev-mode RSC performance-tracing bug ("'Home' cannot have a negative time
  // stamp"). Redirecting here means the Home component never renders, so the bug can't fire.
  async redirects() {
    return [
      { source: "/", destination: "/login", permanent: false },
    ];
  },
  // Security headers. The CSP keeps the restrictive bits that don't break the app
  // (no framing, no plugins, locked base-uri/form-action) while allowing the inline
  // styles + Google Fonts + Next's inline bootstrap the app relies on. Tighten
  // script-src to nonces/hashes later if you add a CSP nonce middleware.
  async headers() {
    const api = process.env.NEXT_PUBLIC_API_URL || "";
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' ${api}`.trim(),
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
