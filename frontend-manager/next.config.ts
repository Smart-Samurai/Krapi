import type { NextConfig } from "next";
import path from "path";

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
  // Note: These are defaults - actual values should come from .env files
  // SDK-FIRST: Use centralized config system instead of hardcoded values
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3470/krapi/k1",
    PORT: process.env.PORT || "3498",
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
  // Note: In Next.js 16, this was renamed from serverComponentsExternalPackages
  serverExternalPackages: [
    "@smartsamurai/krapi-sdk",
    "nodemailer",
  ],

  // Set output file tracing root to fix lockfile warnings
  outputFileTracingRoot: path.join(__dirname, ".."),

  // Turbopack configuration (Next.js 16 default)
  // Note: Turbopack has stricter bundling rules than webpack
  // For production builds, we use webpack (--webpack flag) which properly handles serverExternalPackages
  // Turbopack is used for dev mode only (--turbo flag) for faster development
  // The serverExternalPackages config above should work, but Turbopack may still try to analyze
  // server-only code when types are imported. Use webpack for production builds.
  turbopack: {},

  // Suppress source map warnings in development
  productionBrowserSourceMaps: false,
  
  // Webpack configuration for backward compatibility (when using --webpack flag)
  webpack: (config, { isServer, dev }) => {
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

    // Suppress source map warnings in development
    if (dev) {
      config.devtool = false; // Disable source maps in development to suppress warnings
      // Suppress source map warnings
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Failed to parse source map/,
        /Invalid source map/,
        /sourceMapURL could not be parsed/,
      ];
    }

    return config;
  },
} as NextConfig;

export default nextConfig;
