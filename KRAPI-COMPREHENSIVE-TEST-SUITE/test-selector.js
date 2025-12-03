/**
 * Test Selector
 * 
 * Handles command-line arguments and test selection logic.
 * Supports:
 * - --only <test1,test2,...> - Run only specified test chunks
 * - --skip <test1,test2,...> - Skip specified test chunks
 * - --only-failing - Run only tests that failed in the last run
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { TEST_REGISTRY, getAllTestNames, resolveTestDependencies } from "./test-registry.js";

/**
 * Parse command-line arguments
 */
export function parseArguments() {
  const args = process.argv.slice(2);
  const config = {
    only: null,
    skip: null,
    onlyFailing: false,
    stopOnFirstFailure: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--only" && i + 1 < args.length) {
      config.only = args[i + 1].split(",").map(t => t.trim());
      i++;
    } else if (arg === "--skip" && i + 1 < args.length) {
      config.skip = args[i + 1].split(",").map(t => t.trim());
      i++;
    } else if (arg === "--only-failing") {
      config.onlyFailing = true;
    } else if (arg === "--stop-on-first-failure") {
      config.stopOnFirstFailure = true;
    }
  }

  return config;
}

/**
 * Read the latest error log and extract failing test names
 */
export function getFailingTestNames(testLogsDir) {
  if (!existsSync(testLogsDir)) {
    return [];
  }

  try {
    // Find the latest error log file
    const files = readdirSync(testLogsDir);
    const errorLogs = files
      .filter(f => f.startsWith("test-errors-") && f.endsWith(".txt"))
      .sort()
      .reverse();

    if (errorLogs.length === 0) {
      return [];
    }

    const latestErrorLog = join(testLogsDir, errorLogs[0]);
    const content = readFileSync(latestErrorLog, "utf-8");

    // Extract test names from error log
    // Format: "❌ Test Name via SDK (duration)"
    const testNamePattern = /❌\s+([^\(]+)\s+via\s+SDK/gi;
    const failingTests = new Set();
    
    let match;
    while ((match = testNamePattern.exec(content)) !== null) {
      const testName = match[1].trim();
      
      // Map test names to test chunk names
      // e.g., "Update email configuration" -> "email"
      // e.g., "Get activity logs" -> "activity"
      const chunkName = mapTestNameToChunk(testName);
      if (chunkName) {
        failingTests.add(chunkName);
      }
    }

    // Also try to read from JSON results file for more accurate mapping
    const jsonFiles = files
      .filter(f => f.startsWith("test-results-") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (jsonFiles.length > 0) {
      try {
        const latestJsonFile = join(testLogsDir, jsonFiles[0]);
        const jsonContent = readFileSync(latestJsonFile, "utf-8");
        const results = JSON.parse(jsonContent);
        
        const failedTests = (results.testResults || []).filter(t => t.status === "FAILED");
        for (const test of failedTests) {
          const chunkName = mapTestNameToChunk(test.test || "");
          if (chunkName) {
            failingTests.add(chunkName);
          }
        }
      } catch (error) {
        // Ignore JSON parsing errors
      }
    }

    return Array.from(failingTests);
  } catch (error) {
    console.error("Error reading error log:", error.message);
    return [];
  }
}

/**
 * Map test name to test chunk name
 */
function mapTestNameToChunk(testName) {
  const name = testName.toLowerCase();
  
  // Map common test name patterns to chunk names
  const mappings = {
    "email": ["email", "smtp", "template"],
    "activity": ["activity", "log", "timeline", "recent"],
    "backup": ["backup", "restic"],
    "auth": ["auth", "login", "logout", "session", "refresh", "register"],
    "project": ["project", "statistics", "settings", "changelog"],
    "collection": ["collection"],
    "document": ["document"],
    "storage": ["storage", "file", "upload"],
    "user": ["user", "users"],
    "health": ["health", "diagnostics", "migrate", "repair", "validate"],
    "performance": ["performance", "metrics"],
    "queue": ["queue"],
    "metadata": ["metadata"],
    "api-keys": ["api key", "apikey"],
    "sdk-client": ["sdk client"],
    "sdk-integration": ["sdk integration"],
    "sdk-api": ["sdk api", "sdk status"],
    "admin": ["admin"],
    "changelog": ["changelog"],
    "mcp": ["mcp"],
    "cms-integration": ["cms"],
  };

  for (const [chunk, patterns] of Object.entries(mappings)) {
    if (patterns.some(pattern => name.includes(pattern))) {
      return chunk;
    }
  }

  return null;
}

/**
 * Determine which tests to run based on configuration
 */
export function selectTestsToRun(config, testLogsDir) {
  let selectedTests = getAllTestNames();

  // If --only-failing is specified, get failing test names
  if (config.onlyFailing) {
    const failingTests = getFailingTestNames(testLogsDir);
    if (failingTests.length === 0) {
      console.log("⚠️  No failing tests found in latest error log. Running all tests.");
      return selectedTests;
    }
    console.log(`📋 Running only failing tests: ${failingTests.join(", ")}`);
    selectedTests = failingTests;
  }

  // If --only is specified, use only those tests
  if (config.only && config.only.length > 0) {
    // Validate test names
    const invalidTests = config.only.filter(t => !TEST_REGISTRY[t]);
    if (invalidTests.length > 0) {
      console.error(`❌ Invalid test names: ${invalidTests.join(", ")}`);
      console.log(`Available tests: ${getAllTestNames().join(", ")}`);
      process.exit(1);
    }
    selectedTests = config.only;
    console.log(`📋 Running only specified tests: ${selectedTests.join(", ")}`);
  }

  // If --skip is specified, remove those tests
  if (config.skip && config.skip.length > 0) {
    // Validate test names
    const invalidTests = config.skip.filter(t => !TEST_REGISTRY[t]);
    if (invalidTests.length > 0) {
      console.error(`❌ Invalid test names to skip: ${invalidTests.join(", ")}`);
      console.log(`Available tests: ${getAllTestNames().join(", ")}`);
      process.exit(1);
    }
    selectedTests = selectedTests.filter(t => !config.skip.includes(t));
    console.log(`📋 Skipping tests: ${config.skip.join(", ")}`);
  }

  // Resolve dependencies (e.g., if running "email", also run "auth" and "projects")
  const testsWithDependencies = resolveTestDependencies(selectedTests);
  
  if (testsWithDependencies.length > selectedTests.length) {
    const addedDeps = testsWithDependencies.filter(t => !selectedTests.includes(t));
    console.log(`📋 Added required dependencies: ${addedDeps.join(", ")}`);
  }

  return testsWithDependencies;
}

/**
 * Print usage information
 */
export function printUsage() {
  console.log(`
Usage: npm run test:comprehensive [options]

Options:
  --only <test1,test2,...>    Run only specified test chunks
  --skip <test1,test2,...>    Skip specified test chunks
  --only-failing              Run only tests that failed in the last run
  --stop-on-first-failure     Stop immediately on first failure

Available test chunks:
  ${getAllTestNames().join(", ")}

Examples:
  npm run test:comprehensive --only email
  npm run test:comprehensive --only email,activity
  npm run test:comprehensive --skip backup,performance
  npm run test:comprehensive --only-failing
  npm run test:comprehensive --only email --stop-on-first-failure
`);
}


