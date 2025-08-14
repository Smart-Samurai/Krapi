/**
 * KRAPI Test Framework
 *
 * A simple but powerful testing framework for comprehensive KRAPI testing
 */

import chalk from "chalk";

class TestFramework {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.currentSuite = "";
    this.suiteStartTime = 0;
    this.testStartTime = 0;
    this.results = [];
  }

  // Start a test suite
  describe(suiteName, callback) {
    this.currentSuite = suiteName;
    this.suiteStartTime = Date.now();

    console.log(chalk.blue.bold(`\n📋 ${suiteName}`));
    console.log(chalk.gray("━".repeat(50)));

    return callback();
  }

  // Individual test
  async test(testName, callback) {
    this.totalTests++;
    this.testStartTime = Date.now();

    try {
      process.stdout.write(chalk.yellow(`  ⏳ ${testName}... `));

      await callback();

      const duration = Date.now() - this.testStartTime;
      this.passedTests++;

      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log(
        chalk.green(`  ✅ ${testName}`) + chalk.gray(` (${duration}ms)`)
      );

      this.results.push({
        suite: this.currentSuite,
        test: testName,
        status: "passed",
        duration,
        error: null,
      });
    } catch (error) {
      const duration = Date.now() - this.testStartTime;
      this.failedTests++;

      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log(
        chalk.red(`  ❌ ${testName}`) + chalk.gray(` (${duration}ms)`)
      );
      console.log(chalk.red(`     Error: ${error.message}`));

      this.results.push({
        suite: this.currentSuite,
        test: testName,
        status: "failed",
        duration,
        error: error.message,
      });
    }
  }

  // Assertion methods
  assertEqual(actual, expected, message = "") {
    if (actual !== expected) {
      throw new Error(
        `${message}\n  Expected: ${expected}\n  Actual: ${actual}`
      );
    }
  }

  assertTrue(value, message = "") {
    if (!value) {
      throw new Error(`${message}\n  Expected: true\n  Actual: ${value}`);
    }
  }

  assertFalse(value, message = "") {
    if (value) {
      throw new Error(`${message}\n  Expected: false\n  Actual: ${value}`);
    }
  }

  assertNotNull(value, message = "") {
    if (value === null || value === undefined) {
      throw new Error(`${message}\n  Value should not be null or undefined`);
    }
  }

  assertExists(obj, property, message = "") {
    if (!(property in obj)) {
      throw new Error(
        `${message}\n  Property '${property}' does not exist in object`
      );
    }
  }

  assertType(value, expectedType, message = "") {
    if (typeof value !== expectedType) {
      throw new Error(
        `${message}\n  Expected type: ${expectedType}\n  Actual type: ${typeof value}`
      );
    }
  }

  assertArrayLength(array, expectedLength, message = "") {
    if (!Array.isArray(array)) {
      throw new Error(`${message}\n  Value is not an array`);
    }
    if (array.length !== expectedLength) {
      throw new Error(
        `${message}\n  Expected length: ${expectedLength}\n  Actual length: ${array.length}`
      );
    }
  }

  assertGreaterThan(actual, expected, message = "") {
    if (actual <= expected) {
      throw new Error(
        `${message}\n  Expected ${actual} to be greater than ${expected}`
      );
    }
  }

  assertContains(array, value, message = "") {
    if (!Array.isArray(array)) {
      throw new Error(`${message}\n  First argument must be an array`);
    }
    if (!array.includes(value)) {
      throw new Error(`${message}\n  Array does not contain: ${value}`);
    }
  }

  // HTTP response assertions
  assertHttpSuccess(response, message = "") {
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `${message}\n  Expected HTTP success (200-299)\n  Actual status: ${response.status}`
      );
    }
  }

  assertHttpError(response, expectedStatus, message = "") {
    if (response.status !== expectedStatus) {
      throw new Error(
        `${message}\n  Expected HTTP status: ${expectedStatus}\n  Actual status: ${response.status}`
      );
    }
  }

  // Print final results
  printSummary() {
    const totalDuration = Date.now() - this.suiteStartTime;

    console.log(chalk.blue.bold("\n📊 Test Summary"));
    console.log(chalk.gray("━".repeat(50)));

    console.log(`Total Tests: ${this.totalTests}`);
    console.log(chalk.green(`Passed: ${this.passedTests}`));
    console.log(chalk.red(`Failed: ${this.failedTests}`));
    console.log(`Duration: ${totalDuration}ms`);

    const successRate = ((this.passedTests / this.totalTests) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%`);

    if (this.failedTests > 0) {
      console.log(chalk.red.bold("\n❌ Failed Tests:"));
      this.results
        .filter((r) => r.status === "failed")
        .forEach((result) => {
          console.log(chalk.red(`  • ${result.suite}: ${result.test}`));
          console.log(chalk.gray(`    ${result.error}`));
        });
    }

    if (this.failedTests === 0) {
      console.log(chalk.green.bold("\n🎉 All tests passed!"));
    } else {
      console.log(chalk.red.bold(`\n💥 ${this.failedTests} test(s) failed!`));
    }

    return this.failedTests === 0;
  }

  // Utility methods
  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  generateRandomString(length = 8) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateTestEmail() {
    return `test-${this.generateRandomString()}@krapitest.com`;
  }

  generateTestData() {
    const id = this.generateRandomString();
    return {
      id,
      name: `Test-${id}`,
      email: this.generateTestEmail(),
      timestamp: new Date().toISOString(),
    };
  }
}

export default TestFramework;
