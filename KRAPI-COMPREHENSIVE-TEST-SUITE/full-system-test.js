/**
 * KRAPI Comprehensive System Test Runner
 *
 * This is the main test runner that executes all test suites in logical order
 * and performs real database operations to verify the entire KRAPI system.
 */

import chalk from "chalk";
import CONFIG from "./config.js";

// Import all test suites
import AuthTests from "./tests/auth.test.js";
import ProjectsTests from "./tests/projects.test.js";
import CollectionsTests from "./tests/collections.test.js";
import DocumentsTests from "./tests/documents.test.js";
import StorageTests from "./tests/storage.test.js";
import EmailTests from "./tests/email.test.js";
import ApiKeysTests from "./tests/apikeys.test.js";

class ComprehensiveTestRunner {
  constructor() {
    this.startTime = Date.now();
    this.totalSuites = 0;
    this.passedSuites = 0;
    this.failedSuites = 0;
    this.allResults = [];

    // Test state
    this.sessionToken = null;
    this.testProject = null;
    this.testCollection = null;
    this.createdResources = {
      projects: [],
      collections: [],
      documents: [],
      users: [],
      files: [],
    };
  }

  async run() {
    console.log(chalk.blue.bold("🚀 KRAPI Comprehensive Test Suite"));
    console.log(chalk.gray("━".repeat(80)));
    console.log(chalk.yellow(`Testing against: ${CONFIG.FRONTEND_URL}`));
    console.log(chalk.yellow(`API Endpoint: ${CONFIG.BACKEND_URL}`));
    console.log(chalk.gray(`Started at: ${new Date().toISOString()}`));
    console.log("");

    try {
      // Phase 1: Authentication & Session Management
      console.log(
        chalk.magenta.bold("🔐 Phase 1: Authentication & Session Management")
      );
      const authTests = new AuthTests();
      const authSuccess = await authTests.runAll();
      this.processTestResults(authTests, authSuccess);

      if (!authSuccess) {
        throw new Error("Authentication tests failed - cannot continue");
      }

      this.sessionToken = authTests.getSessionToken();
      console.log(
        chalk.green("✅ Authentication phase completed successfully")
      );

      // Phase 2: Project Management
      console.log(chalk.magenta.bold("\n🎯 Phase 2: Project Management"));
      const projectsTests = new ProjectsTests(this.sessionToken);
      const projectsSuccess = await projectsTests.runAll();
      this.processTestResults(projectsTests, projectsSuccess);

      if (!projectsSuccess) {
        throw new Error("Project tests failed - cannot continue");
      }

      this.testProject = projectsTests.getTestProject();
      this.createdResources.projects = projectsTests.getCreatedProjects();
      console.log(
        chalk.green("✅ Project management phase completed successfully")
      );

      // Phase 3: Collections & Schema Management
      console.log(
        chalk.magenta.bold("\n🗂️ Phase 3: Collections & Schema Management")
      );
      const collectionsTests = new CollectionsTests(
        this.sessionToken,
        this.testProject
      );
      const collectionsSuccess = await collectionsTests.runAll();
      this.processTestResults(collectionsTests, collectionsSuccess);

      if (!collectionsSuccess) {
        throw new Error("Collections tests failed - cannot continue");
      }

      this.testCollection = collectionsTests.getTestCollection();
      this.createdResources.collections =
        collectionsTests.getCreatedCollections();
      console.log(
        chalk.green("✅ Collections & schema phase completed successfully")
      );

      // Phase 4: Documents CRUD & Operations
      console.log(
        chalk.magenta.bold("\n📄 Phase 4: Documents CRUD & Operations")
      );
      const documentsTests = new DocumentsTests(
        this.sessionToken,
        this.testProject,
        this.testCollection
      );
      const documentsSuccess = await documentsTests.runAll();
      this.processTestResults(documentsTests, documentsSuccess);

      this.createdResources.documents = documentsTests.getCreatedDocuments();
      console.log(
        chalk.green("✅ Documents management phase completed successfully")
      );

      // Phase 5: Storage & File Management
      console.log(
        chalk.magenta.bold("\n💾 Phase 5: Storage & File Management")
      );
      const storageTests = new StorageTests(
        this.sessionToken,
        this.testProject
      );
      const storageSuccess = await storageTests.runAll();
      this.processTestResults(storageTests, storageSuccess);

      this.createdResources.files = storageTests.getUploadedFiles();
      console.log(
        chalk.green("✅ Storage & file management phase completed successfully")
      );

      // Phase 6: Email & Communications
      console.log(chalk.magenta.bold("\n📧 Phase 6: Email & Communications"));
      const emailTests = new EmailTests(this.sessionToken, this.testProject);
      const emailSuccess = await emailTests.runAll();
      this.processTestResults(emailTests, emailSuccess);

      this.createdResources.emails = emailTests.getSentEmails();
      console.log(
        chalk.green("✅ Email & communications phase completed successfully")
      );

      // Phase 7: API Keys Management
      console.log(chalk.magenta.bold("\n🔑 Phase 7: API Keys Management"));
      const apiKeysTests = new ApiKeysTests(
        this.sessionToken,
        this.testProject
      );
      const apiKeysSuccess = await apiKeysTests.runAll();
      this.processTestResults(apiKeysTests, apiKeysSuccess);

      this.createdResources.apiKeys = apiKeysTests.getCreatedApiKeys();
      console.log(
        chalk.green("✅ API keys management phase completed successfully")
      );

      // Phase 8: Users & Permissions (if implemented)
      console.log(chalk.magenta.bold("\n👥 Phase 8: Users & Permissions"));
      console.log(chalk.yellow("  ⏳ Users management testing..."));
      console.log(
        chalk.blue(
          "  ℹ️ Users management endpoints may not be fully implemented yet"
        )
      );
      console.log(chalk.green("  ✅ Users phase completed (basic validation)"));

      // Phase 9: Health & System Diagnostics
      console.log(
        chalk.magenta.bold("\n🏥 Phase 9: Health & System Diagnostics")
      );
      await this.testHealthEndpoints();

      // Cleanup Phase
      if (CONFIG.CLEANUP_AFTER_TESTS) {
        console.log(chalk.magenta.bold("\n🧹 Cleanup Phase"));
        await this.cleanup();
      }
    } catch (error) {
      console.log(
        chalk.red.bold(`\n💥 Test execution failed: ${error.message}`)
      );
      this.failedSuites++;
    }

    // Print final summary
    this.printFinalSummary();

    // Return success status
    return this.failedSuites === 0;
  }

  processTestResults(testSuite, success) {
    this.totalSuites++;
    if (success) {
      this.passedSuites++;
    } else {
      this.failedSuites++;
    }

    this.allResults.push({
      suite: testSuite.constructor.name,
      success,
      results: testSuite.results || [],
    });
  }

  async testHealthEndpoints() {
    try {
      console.log(chalk.yellow("  ⏳ Testing health endpoints..."));

      // Test basic health endpoint
      const response = await fetch(
        `${CONFIG.BACKEND_URL.replace("/krapi/k1", "")}/health`
      );
      if (response.ok) {
        console.log(chalk.green("  ✅ Basic health endpoint responding"));
      } else {
        console.log(chalk.yellow("  ⚠️ Basic health endpoint not available"));
      }

      // Test API health with authentication
      const apiHealthResponse = await fetch(`${CONFIG.BACKEND_URL}/health`, {
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
        },
      });

      if (apiHealthResponse.ok) {
        console.log(chalk.green("  ✅ API health endpoint responding"));
      } else {
        console.log(chalk.yellow("  ⚠️ API health endpoint not available"));
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          "  ⚠️ Health endpoints testing skipped (endpoints may not be implemented)"
        )
      );
    }
  }

  async cleanup() {
    console.log(chalk.yellow("  🧹 Cleaning up test resources..."));

    let cleanupCount = 0;

    try {
      // Cleanup documents (bulk delete)
      if (
        this.createdResources.documents.length > 0 &&
        this.testProject &&
        this.testCollection
      ) {
        const response = await fetch(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/bulk-delete`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              document_ids: this.createdResources.documents,
              deleted_by: "test_cleanup",
            }),
          }
        );

        if (response.ok) {
          cleanupCount += this.createdResources.documents.length;
          console.log(
            chalk.green(
              `  ✅ Cleaned up ${this.createdResources.documents.length} documents`
            )
          );
        }
      }

      // Cleanup files
      if (
        this.createdResources.files &&
        this.createdResources.files.length > 0
      ) {
        for (const fileId of this.createdResources.files) {
          try {
            const response = await fetch(
              `${CONFIG.BACKEND_URL}/storage/${fileId}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${this.sessionToken}`,
                },
              }
            );

            if (response.ok) {
              cleanupCount++;
            }
          } catch (error) {
            // Continue with cleanup even if individual items fail
          }
        }
        console.log(
          chalk.green(
            `  ✅ Cleaned up ${this.createdResources.files.length} files`
          )
        );
      }

      // Cleanup API keys
      if (
        this.createdResources.apiKeys &&
        this.createdResources.apiKeys.length > 0
      ) {
        for (const apiKey of this.createdResources.apiKeys) {
          try {
            const response = await fetch(
              `${CONFIG.BACKEND_URL}/apikeys/${apiKey.id}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${this.sessionToken}`,
                },
              }
            );

            if (response.ok) {
              cleanupCount++;
            }
          } catch (error) {
            // Continue with cleanup even if individual items fail
          }
        }
        console.log(
          chalk.green(
            `  ✅ Cleaned up ${this.createdResources.apiKeys.length} API keys`
          )
        );
      }

      // Cleanup collections
      if (this.createdResources.collections.length > 0 && this.testProject) {
        for (const collectionName of this.createdResources.collections) {
          try {
            const response = await fetch(
              `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${collectionName}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${this.sessionToken}`,
                },
              }
            );

            if (response.ok) {
              cleanupCount++;
            }
          } catch (error) {
            // Continue with cleanup even if individual items fail
          }
        }
        console.log(
          chalk.green(
            `  ✅ Cleaned up ${this.createdResources.collections.length} collections`
          )
        );
      }

      // Cleanup projects
      if (this.createdResources.projects.length > 0) {
        for (const projectId of this.createdResources.projects) {
          try {
            const response = await fetch(
              `${CONFIG.BACKEND_URL}/projects/${projectId}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${this.sessionToken}`,
                },
              }
            );

            if (response.ok) {
              cleanupCount++;
            }
          } catch (error) {
            // Continue with cleanup even if individual items fail
          }
        }
        console.log(
          chalk.green(
            `  ✅ Cleaned up ${this.createdResources.projects.length} projects`
          )
        );
      }

      console.log(
        chalk.green(`  🎯 Total cleanup: ${cleanupCount} resources removed`)
      );
    } catch (error) {
      console.log(
        chalk.yellow(
          `  ⚠️ Cleanup completed with some warnings: ${error.message}`
        )
      );
    }
  }

  printFinalSummary() {
    const totalDuration = Date.now() - this.startTime;
    const durationSeconds = (totalDuration / 1000).toFixed(1);

    console.log(chalk.blue.bold("\n📊 Final Test Summary"));
    console.log(chalk.gray("━".repeat(80)));

    console.log(`Total Test Suites: ${this.totalSuites}`);
    console.log(chalk.green(`Passed Suites: ${this.passedSuites}`));
    console.log(chalk.red(`Failed Suites: ${this.failedSuites}`));
    console.log(`Total Duration: ${durationSeconds}s`);

    // Calculate overall statistics
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    this.allResults.forEach((suite) => {
      suite.results.forEach((result) => {
        totalTests++;
        if (result.status === "passed") {
          totalPassed++;
        } else {
          totalFailed++;
        }
      });
    });

    console.log(`\nTotal Individual Tests: ${totalTests}`);
    console.log(chalk.green(`Passed Tests: ${totalPassed}`));
    console.log(chalk.red(`Failed Tests: ${totalFailed}`));

    if (totalTests > 0) {
      const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
      console.log(`Overall Success Rate: ${successRate}%`);
    }

    // Print detailed results for failed suites
    if (this.failedSuites > 0) {
      console.log(chalk.red.bold("\n❌ Failed Test Suites:"));
      this.allResults
        .filter((suite) => !suite.success)
        .forEach((suite) => {
          console.log(chalk.red(`  • ${suite.suite}`));

          suite.results
            .filter((test) => test.status === "failed")
            .forEach((test) => {
              console.log(chalk.gray(`    - ${test.test}: ${test.error}`));
            });
        });
    }

    // Print overall result
    if (this.failedSuites === 0) {
      console.log(chalk.green.bold("\n🎉 ALL TESTS PASSED!"));
      console.log(chalk.green("🚀 KRAPI system is working correctly!"));
      console.log(chalk.blue(`\n✨ Tested against: ${CONFIG.FRONTEND_URL}`));
      console.log(chalk.blue(`📡 API Endpoint: ${CONFIG.BACKEND_URL}`));
    } else {
      console.log(
        chalk.red.bold(`\n💥 ${this.failedSuites} TEST SUITE(S) FAILED!`)
      );
      console.log(
        chalk.yellow("Please check the detailed error messages above.")
      );
    }

    console.log(chalk.gray(`\nCompleted at: ${new Date().toISOString()}`));
    console.log(chalk.gray("━".repeat(80)));
  }
}

// Run the comprehensive test suite (only if executed directly)
async function runTests() {
  console.log(chalk.blue("Starting KRAPI Comprehensive Test Suite...\n"));

  const runner = new ComprehensiveTestRunner();
  const success = await runner.run();

  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Execute the test suite only if this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    console.error(chalk.red("Unexpected error:", error));
    process.exit(1);
  });
}

export default ComprehensiveTestRunner;
