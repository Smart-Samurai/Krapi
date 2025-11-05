"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import {
  BreadcrumbItem as UIBreadcrumbItem,
  BreadcrumbLink as UIBreadcrumbLink,
  BreadcrumbList as UIBreadcrumbList,
  BreadcrumbPage as UIBreadcrumbPage,
  BreadcrumbSeparator as UIBreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItemType {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItemType[];
  homeHref?: string;
}

export function Breadcrumb({ items, homeHref = "/dashboard" }: BreadcrumbProps) {
  const pathname = usePathname();

  // If items are provided, use them
  if (items && items.length > 0) {
    return (
      <UIBreadcrumbList className="text-base">
        <UIBreadcrumbItem>
          <UIBreadcrumbLink asChild>
            <Link href={homeHref}>
              <Home className="h-4 w-4" />
            </Link>
          </UIBreadcrumbLink>
        </UIBreadcrumbItem>
        <UIBreadcrumbSeparator>
          <ChevronRight className="h-4 w-4" />
        </UIBreadcrumbSeparator>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={index}>
              <UIBreadcrumbItem>
                {isLast ? (
                  <UIBreadcrumbPage>{item.label}</UIBreadcrumbPage>
                ) : (
                  <UIBreadcrumbLink asChild>
                    <Link href={item.href || "#"}>{item.label}</Link>
                  </UIBreadcrumbLink>
                )}
              </UIBreadcrumbItem>
              {!isLast && (
                <UIBreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </UIBreadcrumbSeparator>
              )}
            </Fragment>
          );
        })}
      </UIBreadcrumbList>
    );
  }

  // Otherwise, auto-generate from pathname
  if (!pathname) {
    return null;
  }
  const pathSegments = pathname.split("/").filter(Boolean);
  
  if (pathSegments.length === 0) {
    return null;
  }

  const breadcrumbItems: BreadcrumbItemType[] = [];
  let currentPath = "";

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    // Convert segment to readable label
    const label = segment
      .replace(/-/g, " ")
      .replace(/\[|\]/g, "")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    breadcrumbItems.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });

  return (
    <UIBreadcrumbList className="text-base">
      <UIBreadcrumbItem>
        <UIBreadcrumbLink asChild>
          <Link href={homeHref}>
            <Home className="h-4 w-4" />
          </Link>
        </UIBreadcrumbLink>
      </UIBreadcrumbItem>
      <UIBreadcrumbSeparator>
        <ChevronRight className="h-4 w-4" />
      </UIBreadcrumbSeparator>
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        return (
          <Fragment key={index}>
            <UIBreadcrumbItem>
              {isLast ? (
                <UIBreadcrumbPage>{item.label}</UIBreadcrumbPage>
              ) : (
                <UIBreadcrumbLink asChild>
                  <Link href={item.href || "#"}>{item.label}</Link>
                </UIBreadcrumbLink>
              )}
            </UIBreadcrumbItem>
            {!isLast && (
              <UIBreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </UIBreadcrumbSeparator>
            )}
          </Fragment>
        );
      })}
    </UIBreadcrumbList>
  );
}
