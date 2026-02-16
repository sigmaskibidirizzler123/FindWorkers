import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure all API routes are dynamic (no static caching)
  // This is critical for Vercel deployment with database queries
  experimental: {
    // Enable server actions if needed
  },

  // Image optimization for production
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Disable powered-by header for security
  poweredByHeader: false,
};

export default nextConfig;
