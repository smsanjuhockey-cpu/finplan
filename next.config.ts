import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static page caching so deployments always serve fresh builds
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'no-store, must-revalidate' },
      ],
    },
  ],
};

export default nextConfig;
