/**
 * Package Manager Detection
 * Detects which package manager is available (pnpm or npm)
 */

export function detectPackageManager() {
  // Force npm usage as requested by user
  return "npm";
}
