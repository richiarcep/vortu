import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev requests from these origins (LAN IP + alternate hosts) so the
  // Next dev server doesn't block cross-origin asset/HMR requests.
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
};

export default nextConfig;
