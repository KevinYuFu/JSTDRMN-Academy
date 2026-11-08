import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    // Browser-only router cache. A full prefetch (Link prefetch={true}) uses
    // `static`; a revisit uses `dynamic`. Logout deletes the session cookie,
    // which clears this cache, so one account's payload is not reused after
    // sign-out. Pages stay force-dynamic, so this is never a shared CDN cache.
    staleTimes: {
      dynamic: 30,
      static: 30,
    },
  },
};

export default nextConfig;
