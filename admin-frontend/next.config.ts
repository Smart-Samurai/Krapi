import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
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
    typedRoutes: true,
  },
  // Increase timeout for development
  staticPageGenerationTimeout: 120,
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:3001/api",
  },
};

export default nextConfig;
