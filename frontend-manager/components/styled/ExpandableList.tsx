"use client";

import React, { useState } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

import { cn } from "@/lib/utils";

interface ExpandableListProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

export const ExpandableList: React.FC<ExpandableListProps> = ({
  title,
  children,
  defaultExpanded = false,
  className,
  titleClassName,
  contentClassName,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("border border-primary rounded-lg", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left hover:bg-secondary/20 transition-colors duration-200",
          titleClassName
        )}
      >
        <span className="font-medium">{title}</span>
        {isExpanded ? (
          <FiChevronDown className="h-4 w-4" />
        ) : (
          <FiChevronRight className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className={cn("p-4 border-t border-primary", contentClassName)}>
          {children}
        </div>
      )}
    </div>
  );
};
