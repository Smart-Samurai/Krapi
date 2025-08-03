import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Port configuration
  serverRuntimeConfig: {
    port: 3469,
  },
  publicRuntimeConfig: {
    port: 3469,
  },

  // Enable proper error checking during builds (but allow for development)
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === "development",
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "development",
  },

  // Next.js 15 optimizations
  experimental: {
    // Enable React 19 features - temporarily disabled to fix hydration issues
    // reactCompiler: true,
    // Enable typed routes for better type safety
    typedRoutes: true,
  },

  // Increase timeout for development
  staticPageGenerationTimeout: 120,

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:3470/krapi/k1",
    PORT: "3469",
  },

  // Optimize images and static assets
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
  },

  // Enable compression
  compress: true,

  // Suppress hydration warnings completely
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Suppress all hydration warnings
  reactStrictMode: false,

  // Optimize bundle size (swcMinify is enabled by default in Next.js 15)
};

export default nextConfig;
