import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Improve dev server stability
  experimental: {
    // Keep server connections alive longer
    serverMinification: false,
  },
  // Reduce file watching sensitivity
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
      };
    }
    return config;
  },
};

export default nextConfig;
