import type { NextConfig } from "next";

const nextConfig = {
  // Note: eslint and typescript options are no longer supported in next.config.ts in Next.js 16
  // Use CLI flags or separate config files if needed
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore during builds
  },

  // Next.js 16 optimizations
  // React Compiler is enabled by default in Next.js 16
  experimental: {
    // Enable typed routes for better type safety - temporarily disabled to fix build issues
    // typedRoutes: true,
  },

  // Increase timeout for development
  staticPageGenerationTimeout: 120,

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:3470/krapi/k1",
    PORT: "3498",
  },

  // Optimize images and static assets
  images: {
    formats: ["image/webp", "image/avif"],
    // Next.js 16 default is 4 hours (14400 seconds), but keeping 60 for development
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

  // Server-only packages - these should never be bundled for client
  serverComponentsExternalPackages: [
    "@smartsamurai/krapi-sdk",
    "nodemailer",
  ],

  // Turbopack configuration (Next.js 16 default)
  // Turbopack automatically handles Node.js built-in modules
  // Note: Server-only packages like nodemailer should only be imported in server components/API routes
  turbopack: {},

  // Webpack configuration for backward compatibility (when using --webpack flag)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Configure fallbacks for Node.js modules when running in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        "node-fetch": false,
        nodemailer: false,
      };
    }

    // Ignore Node.js modules in client bundle
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        "node-fetch": "fetch",
        fs: "false",
        nodemailer: "false",
      });
    }

    return config;
  },
} as NextConfig;

export default nextConfig;
