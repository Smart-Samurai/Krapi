import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SidebarLayout } from "@/components/layouts/SidebarLayout";

const inter = Inter({ subsets: ["latin"] });

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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <SidebarLayout>{children}</SidebarLayout>
        </Providers>
      </body>
    </html>
  );
}
