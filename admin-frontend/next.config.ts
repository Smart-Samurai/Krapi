import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Port configuration
  serverRuntimeConfig: {
    port: 3469,
  },
  publicRuntimeConfig: {
    port: 3469,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3470/api/:path*",
      },
    ];
  },
  // Enable proper error checking during builds (but allow for development)
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === "development",
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "development",
  },
  // Enable experimental features for better type safety
  experimental: {
    typedRoutes: false,
  },
  // Increase timeout for development
  staticPageGenerationTimeout: 120,
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:3470/api",
    PORT: "3469",
  },
};

export default nextConfig;
