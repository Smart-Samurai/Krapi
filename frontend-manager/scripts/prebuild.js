#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require("child_process");

// eslint-disable-next-line no-console
console.log("\x1b[34m%s\x1b[0m", "🔍 Running type checks...");

try {
  execSync("npm run type-check", { stdio: "inherit" });
  // eslint-disable-next-line no-console
  console.log(
    "\x1b[32m%s\x1b[0m",
    "✅ Type checks passed! Frontend build will proceed."
  );
} catch (_typeError) {
  // eslint-disable-next-line no-console
  console.error(
    "\x1b[31m%s\x1b[0m",
    "❌ Type checks failed! Please fix type errors before building."
  );
  throw _typeError;
}
