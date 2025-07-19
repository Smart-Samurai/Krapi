import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

// Client wrapper component for AuthProvider
function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground min-h-screen">
        <ClientAuthProvider>{children}</ClientAuthProvider>
      </body>
    </html>
  );
}
