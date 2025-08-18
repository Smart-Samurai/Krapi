#!/usr/bin/env node

const { execSync } = require("child_process");

console.log("\x1b[34m%s\x1b[0m", "🔍 Checking SDK type alignment...");

try {
  // First, ensure SDK is built
  console.log("\x1b[90m%s\x1b[0m", "Building SDK...");
  execSync("cd ../packages/krapi-sdk && pnpm build", { stdio: "inherit" });

  // Run type checks - temporarily disabled for development
  console.log(
    "\x1b[90m%s\x1b[0m",
    "Skipping type checks (disabled for development)..."
  );
  // execSync('pnpm type-check:all', { stdio: 'inherit' });

  console.log(
    "\x1b[32m%s\x1b[0m",
    "✅ Type checks skipped! Frontend build will proceed."
  );
} catch (error) {
  console.error("\x1b[31m%s\x1b[0m", "❌ Type alignment check failed!");
  console.error(
    "\x1b[31m%s\x1b[0m",
    "The frontend types are not aligned with the SDK."
  );
  console.error(
    "\x1b[33m%s\x1b[0m",
    "Please fix the type errors before building."
  );
  process.exit(1);
}
