#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("\x1b[34m%s\x1b[0m", "🔍 Checking SDK type alignment...");

try {
  // Check if SDK is already built (from build:packages step)
  const sdkDistPath = path.join(__dirname, "../../packages/krapi-sdk/dist");
  const sdkIndexPath = path.join(sdkDistPath, "index.js");
  const sdkIndexDtsPath = path.join(sdkDistPath, "index.d.ts");
  
  // Check if SDK dist files exist and are recent (built within last 5 minutes)
  const sdkAlreadyBuilt = fs.existsSync(sdkIndexPath) && fs.existsSync(sdkIndexDtsPath);
  
  if (sdkAlreadyBuilt) {
    const stats = fs.statSync(sdkIndexPath);
    const ageMinutes = (Date.now() - stats.mtimeMs) / 1000 / 60;
    
    if (ageMinutes < 5) {
      console.log("\x1b[90m%s\x1b[0m", "✅ SDK already built (from build:packages), skipping rebuild...");
    } else {
      console.log("\x1b[90m%s\x1b[0m", "Building SDK (dist files are older than 5 minutes)...");
      try {
        execSync("cd ../packages/krapi-sdk && npm run build", { stdio: "inherit" });
      } catch (sdkBuildError) {
        console.log("\x1b[90m%s\x1b[0m", "SDK build failed, but dist exists - continuing with existing build...");
      }
    }
  } else {
    // SDK not built, build it now
    console.log("\x1b[90m%s\x1b[0m", "Building SDK...");
    execSync("cd ../packages/krapi-sdk && npm run build", { stdio: "inherit" });
  }

  // Run type checks
  console.log(
    "\x1b[34m%s\x1b[0m",
    "Running type checks..."
  );
  try {
    execSync("npm run type-check", { stdio: "inherit" });
    console.log(
      "\x1b[32m%s\x1b[0m",
      "✅ Type checks passed! Frontend build will proceed."
    );
  } catch (typeError) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "❌ Type checks failed! Please fix type errors before building."
    );
    throw typeError;
  }
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
