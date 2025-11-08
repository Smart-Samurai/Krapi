/**
 * Collapsible Components
 * 
 * Collapsible components built on Radix UI Collapsible primitives.
 * Provides content that can be expanded and collapsed.
 * Includes Collapsible, CollapsibleTrigger, and CollapsibleContent.
 * 
 * @module components/ui/collapsible
 * @example
 * <Collapsible open={isOpen} onOpenChange={setIsOpen}>
 *   <CollapsibleTrigger>Toggle</CollapsibleTrigger>
 *   <CollapsibleContent>Collapsible content</CollapsibleContent>
 * </Collapsible>
 */
"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
