import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
