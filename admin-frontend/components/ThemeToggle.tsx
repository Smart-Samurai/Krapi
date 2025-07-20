'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-background-100 hover:bg-background-200 dark:bg-background-800 dark:hover:bg-background-700 transition-colors duration-200"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-text-700 dark:text-text-300" />
      ) : (
        <Sun className="h-5 w-5 text-text-700 dark:text-text-300" />
      )}
    </button>
  );
}