/**
 * Auth Layout
 * 
 * Layout component for authentication pages (login, etc.).
 * Provides gradient background styling.
 * 
 * @module app/(auth)/layout
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Page content
 * @returns {JSX.Element} Auth layout
 * 
 * @example
 * // Automatically wraps all pages in (auth) route group
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      {children}
    </div>
  );
}