/**
 * KRAPI Comprehensive Test Suite Entry Point
 *
 * This is the main entry point for running the comprehensive KRAPI test suite.
 * It can run all tests or individual test suites based on command line arguments.
 */

import chalk from "chalk";
import CONFIG from "./config.js";

// Import test suites
import AuthTests from "./tests/auth.test.js";
import ProjectsTests from "./tests/projects.test.js";
import CollectionsTests from "./tests/collections.test.js";
import DocumentsTests from "./tests/documents.test.js";
import CompleteCMSTests from "./tests/complete-cms.test.js";
import ComprehensiveTestRunner from "./full-system-test.js";

// Command line argument parsing
const args = process.argv.slice(2);
const command = args[0] || "help";

async function runIndividualTest(testName) {
  console.log(chalk.blue.bold(`🧪 Running ${testName} Tests`));
  console.log(chalk.gray("━".repeat(50)));
  console.log(chalk.yellow(`Testing against: ${CONFIG.BACKEND_URL}\n`));

  let testClass;
  let sessionToken = null;
  let testProject = null;
  let testCollection = null;

  try {
    switch (testName) {
      case "auth":
        testClass = new AuthTests();
        break;

      case "projects":
        // Need to authenticate first
        const authTests = new AuthTests();
        await authTests.runAll();
        sessionToken = authTests.getSessionToken();
        testClass = new ProjectsTests(sessionToken);
        break;

      case "collections":
        // Need auth + project
        const authTestsCol = new AuthTests();
        await authTestsCol.runAll();
        sessionToken = authTestsCol.getSessionToken();

        const projectsTestsCol = new ProjectsTests(sessionToken);
        await projectsTestsCol.runAll();
        testProject = projectsTestsCol.getTestProject();

        testClass = new CollectionsTests(sessionToken, testProject);
        break;

      case "documents":
        // Need auth + project + collection
        const authTestsDoc = new AuthTests();
        await authTestsDoc.runAll();
        sessionToken = authTestsDoc.getSessionToken();

        const projectsTestsDoc = new ProjectsTests(sessionToken);
        await projectsTestsDoc.runAll();
        testProject = projectsTestsDoc.getTestProject();

        const collectionsTestsDoc = new CollectionsTests(
          sessionToken,
          testProject
        );
        await collectionsTestsDoc.runAll();
        testCollection = collectionsTestsDoc.getTestCollection();

        testClass = new DocumentsTests(
          sessionToken,
          testProject,
          testCollection
        );
        break;

      case "cms":
      case "complete":
        testClass = new CompleteCMSTests();
        break;

      default:
        throw new Error(`Unknown test suite: ${testName}`);
    }

    const success = await testClass.runAll();

    if (success) {
      console.log(chalk.green.bold("\n✅ All tests in this suite passed!"));
    } else {
      console.log(chalk.red.bold("\n❌ Some tests in this suite failed!"));
    }

    return success;
  } catch (error) {
    console.log(chalk.red.bold(`\n💥 Test suite failed: ${error.message}`));
    return false;
  }
}

function showHelp() {
  console.log(chalk.blue.bold("🧪 KRAPI Comprehensive Test Suite"));
  console.log(chalk.gray("━".repeat(50)));
  console.log("");
  console.log(chalk.yellow("Usage:"));
  console.log("  node index.js [command]");
  console.log("");
  console.log(chalk.yellow("Commands:"));
  console.log("  full          Run complete system test (default)");
  console.log("  cms           Run comprehensive CMS functionality test");
  console.log("  auth          Run authentication tests only");
  console.log("  projects      Run project management tests only");
  console.log("  collections   Run collections & schema tests only");
  console.log("  documents     Run documents CRUD tests only");
  console.log("  help          Show this help message");
  console.log("");
  console.log(chalk.yellow("Examples:"));
  console.log("  node index.js full         # Run all tests");
  console.log("  node index.js auth         # Test authentication only");
  console.log("  node index.js projects     # Test projects only");
  console.log("");
  console.log(chalk.yellow("Configuration:"));
  console.log(`  Frontend URL: ${CONFIG.FRONTEND_URL}`);
  console.log(`  Backend URL: ${CONFIG.BACKEND_URL}`);
  console.log(`  Admin User: ${CONFIG.ADMIN_CREDENTIALS.username}`);
  console.log(
    `  Cleanup: ${CONFIG.CLEANUP_AFTER_TESTS ? "Enabled" : "Disabled"}`
  );
  console.log("");
  console.log(
    chalk.blue("The test suite will create real data in the database to verify")
  );
  console.log(
    chalk.blue("all functionality works correctly. Make sure the KRAPI system")
  );
  console.log(chalk.blue("is running before executing tests."));
}

function showTestInfo() {
  console.log(chalk.blue.bold("📋 Test Suite Information"));
  console.log(chalk.gray("━".repeat(50)));
  console.log("");
  console.log(chalk.yellow("What this test suite does:"));
  console.log("• Creates real projects, collections, and documents");
  console.log("• Tests all CRUD operations thoroughly");
  console.log("• Validates data integrity and relationships");
  console.log("• Tests bulk operations and aggregations");
  console.log("• Verifies error handling and edge cases");
  console.log("• Performs comprehensive cleanup after testing");
  console.log("");
  console.log(chalk.yellow("Test Phases:"));
  console.log("1. 🔐 Authentication & Session Management");
  console.log("2. 🎯 Project Management & CRUD");
  console.log("3. 🗂️ Collections & Dynamic Schema");
  console.log("4. 📄 Documents & Data Operations");
  console.log("5. 👥 Users & Permissions (if available)");
  console.log("6. 💾 Storage & File Management (if available)");
  console.log("7. 📧 Email & Communications (if available)");
  console.log("8. 🔑 API Keys Management (if available)");
  console.log("9. 🏥 Health & System Diagnostics");
  console.log("");
  console.log(chalk.green("The test suite assumes:"));
  console.log("• KRAPI backend is running and accessible");
  console.log("• Database is initialized with basic admin user");
  console.log("• Default admin credentials are: admin/admin123");
  console.log("• All endpoints are accessible via the configured URLs");
}

async function main() {
  console.clear();

  switch (command) {
    case "full":
    case "all":
      const runner = new ComprehensiveTestRunner();
      const success = await runner.run();
      process.exit(success ? 0 : 1);
      break;

    case "cms":
    case "complete":
    case "auth":
    case "projects":
    case "collections":
    case "documents":
      const testSuccess = await runIndividualTest(command);
      process.exit(testSuccess ? 0 : 1);
      break;

    case "info":
      showTestInfo();
      break;

    case "help":
    default:
      showHelp();
      break;
  }
}

// Handle uncaught errors
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    chalk.red("Unhandled Rejection at:"),
    promise,
    chalk.red("reason:"),
    reason
  );
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error(chalk.red("Uncaught Exception:"), error);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  console.error(chalk.red("Unexpected error:"), error);
  process.exit(1);
});
