/**
 * Not Found Page
 * 
 * 404 error page displayed when a route is not found.
 * 
 * @module app/not-found
 * @example
 * // Automatically rendered by Next.js for 404 errors
 */
import { Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Not Found Page Component
 * 
 * Displays 404 error page with navigation options.
 * 
 * @returns {JSX.Element} 404 page
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center  bg-muted">
            <span className="text-base font-bold text-muted-foreground">
              404
            </span>
          </div>
          <CardTitle className="text-base">Page Not Found</CardTitle>
          <CardDescription>
            We couldn&apos;t find the page you&apos;re looking for.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
