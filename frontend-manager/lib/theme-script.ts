/**
 * Theme Script
 * 
 * Client-side script for applying theme on page load.
 * Prevents flash of incorrect theme by applying theme before React hydration.
 * 
 * @module lib/theme-script
 * @constant {string} themeScript - Inline script for theme application
 * 
 * @example
 * // Used in app/layout.tsx
 * <script dangerouslySetInnerHTML={{ __html: themeScript }} />
 */
export const themeScript = `
  (function() {
    try {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = savedTheme || (prefersDark ? 'dark' : 'light');
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      // Fail silently
    }
  })();
`;