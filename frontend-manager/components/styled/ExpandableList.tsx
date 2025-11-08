/**
 * Expandable List Component
 * 
 * Collapsible list component with expand/collapse functionality.
 * 
 * @module components/styled/ExpandableList
 * @example
 * <ExpandableList title="Settings" defaultExpanded={false}>
 *   <SettingsContent />
 * </ExpandableList>
 */
"use client";

import React, { useState } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

import { cn } from "@/lib/utils";

/**
 * Expandable List Props
 * 
 * @interface ExpandableListProps
 * @property {string} title - List title/header
 * @property {ReactNode} children - List content
 * @property {boolean} [defaultExpanded=false] - Whether list is expanded by default
 * @property {string} [className] - Additional CSS classes for container
 * @property {string} [titleClassName] - Additional CSS classes for title
 * @property {string} [contentClassName] - Additional CSS classes for content
 */
interface ExpandableListProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

/**
 * Expandable List Component
 * 
 * Collapsible list with expand/collapse toggle.
 * 
 * @param {ExpandableListProps} props - Component props
 * @returns {JSX.Element} Expandable list component
 * 
 * @example
 * <ExpandableList title="Advanced Settings">
 *   <SettingsForm />
 * </ExpandableList>
 */
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
    <div className={cn("border border-primary ", className)}>
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
