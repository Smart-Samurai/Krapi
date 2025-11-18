#!/usr/bin/env node
/**
 * Initialize .env file from .env.sample
 * 
 * This script creates a .env file from .env.sample if it doesn't exist.
 * It also updates existing .env files with missing variables from .env.sample.
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envExamplePath = path.join(rootDir, ".env.sample");
const envPath = path.join(rootDir, ".env");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }

  return env;
}

function formatEnvFile(env, comments) {
  let content = "";
  const seenKeys = new Set();

  // Write with comments from example
  // Try .env.sample first, fallback to env.example for backward compatibility
  let exampleContent = "";
  if (fs.existsSync(envExamplePath)) {
    exampleContent = fs.readFileSync(envExamplePath, "utf8");
  } else {
    const fallbackPath = path.join(path.dirname(envExamplePath), "env.example");
    if (fs.existsSync(fallbackPath)) {
      exampleContent = fs.readFileSync(fallbackPath, "utf8");
    }
  }
  const exampleLines = exampleContent ? exampleContent.split("\n") : [];

  for (const line of exampleLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      content += "\n";
      continue;
    }

    if (trimmed.startsWith("#")) {
      content += line + "\n";
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      seenKeys.add(key);
      const value = env[key] !== undefined ? env[key] : match[2].trim();
      content += `${key}=${value}\n`;
    }
  }

  // Add any keys in env that weren't in example
  for (const key in env) {
    if (!seenKeys.has(key)) {
      content += `${key}=${env[key]}\n`;
    }
  }

  return content;
}

function initFrontendEnv() {
  const frontendDir = path.join(rootDir, "frontend-manager");
  const frontendEnvExamplePath = path.join(frontendDir, ".env.sample");
  // Fallback to env.example if .env.sample doesn't exist
  const fallbackPath = path.join(frontendDir, "env.example");
  const actualPath = fs.existsSync(frontendEnvExamplePath) ? frontendEnvExamplePath : fallbackPath;
  const frontendEnvPath = path.join(frontendDir, ".env.local");

  if (!fs.existsSync(actualPath)) {
    console.log(`?? Frontend .env.sample or env.example not found, skipping frontend env initialization...`);
    return;
  }

  const exampleEnv = parseEnvFile(actualPath);
  let existingEnv = {};

  if (fs.existsSync(frontendEnvPath)) {
    console.log(`?? Found existing frontend .env.local file, merging with .env.sample...`);
    existingEnv = parseEnvFile(frontendEnvPath);
  } else {
    console.log(`?? Creating new frontend .env.local file from .env.sample...`);
  }

  // Merge: keep existing values, add missing ones from example
  const mergedEnv = { ...exampleEnv, ...existingEnv };

  // Format and write
  const content = formatEnvFile(mergedEnv, true);

  fs.writeFileSync(frontendEnvPath, content, "utf8");

  console.log(`? Frontend environment configuration initialized: ${frontendEnvPath}\n`);

  // Show what was added/updated
  const added = Object.keys(exampleEnv).filter(
    (key) => !existingEnv.hasOwnProperty(key)
  );
  if (added.length > 0) {
    console.log(`?? Added new frontend variables: ${added.join(", ")}\n`);
  }
}

async function main() {
  console.log("?? Initializing KRAPI environment configuration...\n");

  if (!fs.existsSync(envExamplePath)) {
    console.error(`? Error: ${envExamplePath} not found`);
    process.exit(1);
  }

  const exampleEnv = parseEnvFile(envExamplePath);
  let existingEnv = {};

  if (fs.existsSync(envPath)) {
    console.log(`?? Found existing .env file, merging with .env.sample...`);
    existingEnv = parseEnvFile(envPath);
  } else {
    console.log(`?? Creating new .env file from .env.sample...`);
  }

  // Merge: keep existing values, add missing ones from example
  const mergedEnv = { ...exampleEnv, ...existingEnv };

  // Format and write
  const content = formatEnvFile(mergedEnv, true);

  fs.writeFileSync(envPath, content, "utf8");

  console.log(`? Environment configuration initialized: ${envPath}\n`);

  // Show what was added/updated
  const added = Object.keys(exampleEnv).filter(
    (key) => !existingEnv.hasOwnProperty(key)
  );
  if (added.length > 0) {
    console.log(`?? Added new variables: ${added.join(", ")}\n`);
  }

  console.log(
    `?? Tip: Review and update ${envPath} with your specific configuration values.\n`
  );

  // Initialize frontend env file
  initFrontendEnv();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { main };
