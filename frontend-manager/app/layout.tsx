/**
 * Root Layout Component
 * 
 * Root layout for the KRAPI frontend manager application.
 * Provides global styles, theme support, and provider setup.
 * 
 * @module app/layout
 */
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/Providers";
import { themeScript } from "@/lib/theme-script";

/* eslint-disable react/no-danger */

const inter = Inter({ subsets: ["latin"] });

/**
 * Application metadata
 * 
 * @constant {Metadata}
 */
export const metadata: Metadata = {
  title: "KRAPI - Backend as a Service",
  description:
    "A powerful backend-as-a-service platform for modern applications",
  keywords: ["backend", "api", "database", "authentication", "storage"],
  authors: [{ name: "KRAPI Team" }],
  creator: "KRAPI",
  publisher: "KRAPI",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://krapi.com",
    title: "KRAPI - Backend as a Service",
    description:
      "A powerful backend-as-a-service platform for modern applications",
    siteName: "KRAPI",
  },
  twitter: {
    card: "summary_large_image",
    title: "KRAPI - Backend as a Service",
    description:
      "A powerful backend-as-a-service platform for modern applications",
  },
};

/**
 * Viewport configuration
 * 
 * @constant
 */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

/**
 * Root Layout Component
 * 
 * Root layout component that wraps all pages with providers and theme support.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Root layout with providers
 * 
 * @example
 * // Used automatically by Next.js
 * // Wraps all pages with Providers and theme support
 */
/**
 * Root Layout Component
 * 
 * Root layout component that wraps all pages.
 * Provides theme script, global styles, and providers.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Root layout JSX
 * 
 * @example
 * // Used automatically by Next.js for all pages
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.className} bg-background text-foreground`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
