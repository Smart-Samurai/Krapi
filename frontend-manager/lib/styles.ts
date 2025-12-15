/**
 * Centralized Style Constants
 * 
 * Centralized style constants for consistent UI across the application.
 * All elements use the same font size: 14px (text-base).
 * 
 * @module lib/styles
 * @example
 * import { styles } from '@/lib/styles';
 * <Button className={styles.buttons.add}>Add</Button>
 */
/**
 * Style Constants Object
 * 
 * @constant {Object} styles
 * @property {string} styles.fontSize - Font size class (text-base)
 * @property {string} styles.fontSizeValue - Font size value (14px)
 * @property {Object} styles.buttons - Button style classes
 * @property {string} styles.buttons.add - Add button styles
 * @property {string} styles.buttons.edit - Edit button styles
 * @property {string} styles.buttons.confirm - Confirm button styles
 * @property {string} styles.buttons.delete - Delete button styles
 * @property {Object} styles.spacing - Spacing classes
 * @property {string} styles.spacing.section - Section spacing
 * @property {string} styles.spacing.card - Card padding
 * @property {Object} styles.colors - Color classes
 * @property {string} styles.colors.text - Text color class
 * @property {string} styles.colors.textMuted - Muted text color class
 * @property {string} styles.colors.bg - Background color class
 * @property {string} styles.colors.card - Card background color class
 * @property {string} styles.colors.border - Border color class
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
