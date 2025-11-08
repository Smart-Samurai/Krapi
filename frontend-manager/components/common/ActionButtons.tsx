/**
 * Action Buttons Components
 * 
 * Reusable action button components for consistent UI actions.
 * Provides ActionButtons container and ActionButton with variants.
 * 
 * @module components/common/ActionButtons
 * @example
 * <ActionButtons>
 *   <ActionButton variant="add" icon={Plus}>Create</ActionButton>
 *   <ActionButton variant="edit" icon={Edit}>Edit</ActionButton>
 * </ActionButtons>
 */
"use client";

import React, { ReactNode, cloneElement, isValidElement } from "react";

import { Button } from "@/components/ui/button";

/**
 * Action Buttons Props
 * 
 * @interface ActionButtonsProps
 * @property {ReactNode} children - Action button children
 * @property {string} [className] - Additional CSS classes
 */
interface ActionButtonsProps {
  children: ReactNode;
  className?: string;
}

/**
 * Action Buttons Container Component
 * 
 * Container component for grouping action buttons.
 * 
 * @param {ActionButtonsProps} props - Component props
 * @returns {JSX.Element} Action buttons container
 * 
 * @example
 * <ActionButtons>
 *   <ActionButton variant="add">Create</ActionButton>
 * </ActionButtons>
 */
export function ActionButtons({ 
  children, 
  className = "" 
}: ActionButtonsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Action Button Props
 * 
 * @interface ActionButtonProps
 * @property {ReactNode} children - Button content
 * @property {"add" | "edit" | "delete" | "default" | "outline"} [variant="default"] - Button variant
 * @property {React.ComponentType} [icon] - Optional icon component
 * @property {Function} [onClick] - Click handler
 * @property {boolean} [disabled=false] - Whether button is disabled
 * @property {boolean} [asChild=false] - Render as child element
 * @property {string} [className] - Additional CSS classes
 * @property {"default" | "sm" | "lg" | "icon"} [size="default"] - Button size
 */
interface ActionButtonProps {
  children: ReactNode;
  variant?: "add" | "edit" | "delete" | "default" | "outline";
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
  asChild?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Action Button Component
 * 
 * Styled action button with variants for add, edit, delete actions.
 * 
 * @param {ActionButtonProps} props - Component props
 * @returns {JSX.Element} Action button
 * 
 * @example
 * <ActionButton variant="add" icon={Plus} onClick={handleCreate}>
 *   Create Project
 * </ActionButton>
 */
export function ActionButton({
  children,
  variant = "default",
  icon: Icon,
  onClick,
  disabled = false,
  asChild = false,
  className = "",
  size = "default",
}: ActionButtonProps) {
  const variantClasses = {
    add: "btn-add",
    edit: "btn-edit",
    delete: "btn-delete",
    default: "",
    outline: "",
  };

  const buttonVariant = variant === "outline" ? "outline" : 
    variant === "delete" ? "destructive" : 
    variant === "edit" ? "secondary" : "default";

  // When asChild is true, Slot requires exactly one child
  // If we have an icon, we need to add it to the children element
  let buttonContent: ReactNode;
  
  if (asChild && Icon && isValidElement(children)) {
    // Clone the children and prepend the icon to its children
    const childElement = children as React.ReactElement<Record<string, unknown>>;
    const existingChildren = childElement.props?.children ?? null;
    buttonContent = cloneElement(childElement, {
      children: (
        <>
          <Icon className="h-4 w-4" />
          {existingChildren}
        </>
      ),
    });
  } else if (asChild) {
    // No icon, just pass children as-is
    buttonContent = children;
  } else {
    // Normal mode: icon and children as siblings
    buttonContent = (
      <>
        {Icon && <Icon className="h-4 w-4" />}
        {children}
      </>
    );
  }

  return (
    <Button
      variant={buttonVariant}
      size={size}
      className={`${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      asChild={asChild}
    >
      {buttonContent}
    </Button>
  );
}
