import type { NextConfig } from "next";

/**
 * Browser cache for files in public/ and the app favicon.
 * Fresh for a day, then usable while revalidating for a week.
 * These paths are not content-hashed, so they are not immutable.
 */
export const STATIC_ASSET_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

/**
 * Image and icon URLs only. Skips pages, /api, the image optimizer, and
 * Next's already-hashed /_next/static files (including next/font).
 */
export const STATIC_ASSET_HEADER_SOURCE =
  "/((?!_next/static|_next/image|api/).*)\\.(png|jpe?g|gif|webp|avif|svg|ico)";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async headers() {
    return [
      {
        source: STATIC_ASSET_HEADER_SOURCE,
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE_CONTROL }],
      },
    ];
  },
};

export default nextConfig;
