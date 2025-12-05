/**
 * Package Manager Detection
 * Detects which package manager is available (pnpm or npm)
 */

export async function detectPackageManager() {
  try {
    const { execSync } = await import("child_process");
    execSync("pnpm --version", { stdio: "ignore" });
    return "pnpm";
  } catch {
    return "npm";
  }
}


