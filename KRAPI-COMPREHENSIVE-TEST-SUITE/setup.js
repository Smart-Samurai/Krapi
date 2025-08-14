/**
 * KRAPI Test Suite Setup Script
 *
 * This script helps set up and validate the test environment before running tests
 */

import chalk from "chalk";
import CONFIG from "./config.js";

class TestSetup {
  constructor() {
    this.checks = [];
  }

  async validateEnvironment() {
    console.log(chalk.blue.bold("🔍 KRAPI Test Environment Validation"));
    console.log(chalk.gray("━".repeat(60)));
    console.log("");

    // Check 1: Frontend URL accessibility
    await this.checkEndpoint("Frontend URL", CONFIG.FRONTEND_URL);

    // Check 2: Backend API accessibility
    await this.checkEndpoint(
      "Backend API",
      CONFIG.BACKEND_URL.replace("/krapi/k1", "")
    );

    // Check 3: KRAPI API endpoint
    await this.checkEndpoint("KRAPI API Endpoint", CONFIG.BACKEND_URL);

    // Check 4: Admin authentication
    await this.checkAuthentication();

    // Print summary
    this.printSummary();

    return this.checks.every((check) => check.success);
  }

  async checkEndpoint(name, url) {
    console.log(chalk.yellow(`⏳ Checking ${name}...`));

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "KRAPI-Test-Suite/1.0",
        },
      });

      if (response.ok) {
        console.log(
          chalk.green(`✅ ${name} is accessible (${response.status})`)
        );
        this.checks.push({
          name,
          success: true,
          details: `Status: ${response.status}`,
        });
      } else {
        console.log(chalk.yellow(`⚠️ ${name} returned ${response.status}`));
        this.checks.push({
          name,
          success: false,
          details: `Status: ${response.status}`,
        });
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${name} is not accessible`));
      console.log(chalk.gray(`   Error: ${error.message}`));
      this.checks.push({ name, success: false, details: error.message });
    }
  }

  async checkAuthentication() {
    console.log(chalk.yellow("⏳ Checking admin authentication..."));

    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "KRAPI-Test-Suite/1.0",
        },
        body: JSON.stringify({
          username: CONFIG.ADMIN_CREDENTIALS.username,
          password: CONFIG.ADMIN_CREDENTIALS.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          console.log(chalk.green("✅ Admin authentication successful"));
          this.checks.push({
            name: "Admin Authentication",
            success: true,
            details: "Login successful, token received",
          });
        } else {
          console.log(
            chalk.red("❌ Admin authentication failed - no token received")
          );
          this.checks.push({
            name: "Admin Authentication",
            success: false,
            details: "No token in response",
          });
        }
      } else {
        const errorText = await response.text();
        console.log(
          chalk.red(`❌ Admin authentication failed (${response.status})`)
        );
        console.log(chalk.gray(`   Response: ${errorText}`));
        this.checks.push({
          name: "Admin Authentication",
          success: false,
          details: `Status ${response.status}: ${errorText}`,
        });
      }
    } catch (error) {
      console.log(chalk.red("❌ Admin authentication check failed"));
      console.log(chalk.gray(`   Error: ${error.message}`));
      this.checks.push({
        name: "Admin Authentication",
        success: false,
        details: error.message,
      });
    }
  }

  printSummary() {
    console.log(chalk.blue.bold("\n📊 Environment Check Summary"));
    console.log(chalk.gray("━".repeat(60)));

    const successful = this.checks.filter((c) => c.success).length;
    const total = this.checks.length;

    console.log(`Total Checks: ${total}`);
    console.log(chalk.green(`Successful: ${successful}`));
    console.log(chalk.red(`Failed: ${total - successful}`));

    if (successful === total) {
      console.log(chalk.green.bold("\n🎉 Environment is ready for testing!"));
      console.log(chalk.blue("You can now run the comprehensive test suite:"));
      console.log(chalk.yellow("  node index.js full"));
    } else {
      console.log(
        chalk.red.bold("\n⚠️ Environment has issues that need to be resolved:")
      );

      this.checks
        .filter((c) => !c.success)
        .forEach((check) => {
          console.log(chalk.red(`  • ${check.name}: ${check.details}`));
        });

      console.log(
        chalk.yellow("\nPlease fix these issues before running tests.")
      );
    }

    console.log(chalk.gray("\nConfiguration:"));
    console.log(chalk.gray(`  Frontend URL: ${CONFIG.FRONTEND_URL}`));
    console.log(chalk.gray(`  Backend URL: ${CONFIG.BACKEND_URL}`));
    console.log(
      chalk.gray(`  Admin User: ${CONFIG.ADMIN_CREDENTIALS.username}`)
    );
  }

  async runQuickTest() {
    console.log(chalk.blue.bold("\n🧪 Running Quick Test"));
    console.log(chalk.gray("━".repeat(60)));

    try {
      // Quick authentication test
      const authResponse = await fetch(`${CONFIG.BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(CONFIG.ADMIN_CREDENTIALS),
      });

      if (!authResponse.ok) {
        throw new Error("Authentication failed");
      }

      const authData = await authResponse.json();
      const token = authData.token;

      console.log(chalk.green("✅ Authentication successful"));

      // Quick project creation test
      const projectResponse = await fetch(`${CONFIG.BACKEND_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `quick_test_${Date.now()}`,
          description: "Quick validation test project",
        }),
      });

      if (projectResponse.ok) {
        const project = await projectResponse.json();
        console.log(chalk.green("✅ Project creation successful"));

        // Cleanup test project
        await fetch(`${CONFIG.BACKEND_URL}/projects/${project.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log(chalk.green("✅ Project cleanup successful"));
        console.log(
          chalk.green.bold(
            "\n🎉 Quick test passed! System is working correctly."
          )
        );
      } else {
        console.log(chalk.red("❌ Project creation failed"));
        return false;
      }

      return true;
    } catch (error) {
      console.log(chalk.red(`❌ Quick test failed: ${error.message}`));
      return false;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "check";

  const setup = new TestSetup();

  switch (command) {
    case "check":
      const isReady = await setup.validateEnvironment();
      process.exit(isReady ? 0 : 1);
      break;

    case "quick":
      const envReady = await setup.validateEnvironment();
      if (envReady) {
        const quickPassed = await setup.runQuickTest();
        process.exit(quickPassed ? 0 : 1);
      } else {
        process.exit(1);
      }
      break;

    default:
      console.log(chalk.blue.bold("🔧 KRAPI Test Setup"));
      console.log("");
      console.log(chalk.yellow("Usage:"));
      console.log("  node setup.js check    # Check environment readiness");
      console.log("  node setup.js quick    # Run quick validation test");
      break;
  }
}

main().catch((error) => {
  console.error(chalk.red("Setup error:", error));
  process.exit(1);
});
