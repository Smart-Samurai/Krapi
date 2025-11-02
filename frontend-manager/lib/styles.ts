/**
 * Centralized style constants for consistent UI
 * All elements use the same font size: 14px
 */

export const styles = {
  // Single font size for everything
  fontSize: "text-base",
  fontSizeValue: "14px",
  
  // Button styles for different actions
  buttons: {
    add: "btn-add px-4 py-2",
    edit: "btn-edit px-4 py-2", 
    confirm: "btn-confirm px-4 py-2",
    delete: "btn-delete px-4 py-2",
  },
  
  // Consistent spacing
  spacing: {
    section: "space-y-4",
    card: "p-4",
  },
  
  // Consistent colors (dark theme)
  colors: {
    text: "text-foreground",
    textMuted: "text-muted-foreground",
    bg: "bg-background",
    card: "bg-card",
    border: "border-border",
  },
} as const;
