#!/usr/bin/env node

/**
 * One-Click Test Runner for KRAPI Comprehensive Test Suite
 * 
 * This script provides a simple one-click way to run the comprehensive test suite
 * with automatic logfile output.
 * 
 * Usage:
 *   node run-tests.js
 *   npm run test:one-click
 */

import { spawn } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class OneClickTestRunner {
  constructor() {
    this.testSuiteRoot = __dirname;
    this.logDir = join(this.testSuiteRoot, "test-logs");
    this.logFile = join(this.logDir, `test-run-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    this.logBuffer = [];
    this.startTime = Date.now();
  }

  log(message, level = "INFO") {
    const timestamp = new Date().toISOString();
    const levelEmoji = {
      INFO: "ℹ️",
      SUCCESS: "✅",
      WARNING: "⚠️",
      ERROR: "❌",
      CRITICAL: "💥",
    };
    const logMessage = `${levelEmoji[level]} [${timestamp}] ${message}`;
    console.log(logMessage);
    this.logBuffer.push(logMessage);
  }

  async ensureLogDir() {
    if (!existsSync(this.logDir)) {
      await mkdir(this.logDir, { recursive: true });
      this.log(`Created log directory: ${this.logDir}`, "INFO");
    }
  }

  async writeLogFile() {
    try {
      await this.ensureLogDir();
      
      const header = [
        "=".repeat(80),
        "KRAPI Comprehensive Test Suite - Test Run Log",
        "=".repeat(80),
        `Start Time: ${new Date(this.startTime).toISOString()}`,
        `End Time: ${new Date().toISOString()}`,
        `Duration: ${Date.now() - this.startTime}ms`,
        "=".repeat(80),
        "",
      ].join("\n");

      const footer = [
        "",
        "=".repeat(80),
        "End of Test Run Log",
        "=".repeat(80),
      ].join("\n");

      const logContent = header + this.logBuffer.join("\n") + footer;
      
      await writeFile(this.logFile, logContent, "utf-8");
      this.log(`\n📄 Test log saved to: ${this.logFile}`, "SUCCESS");
    } catch (error) {
      this.log(`Failed to write log file: ${error.message}`, "ERROR");
    }
  }

  async runTests() {
    this.log("🚀 Starting One-Click Test Runner", "INFO");
    this.log(`📝 Log file: ${this.logFile}`, "INFO");
    this.log("=".repeat(80), "INFO");

    return new Promise((resolve, reject) => {
      // Run the comprehensive test runner
      const testProcess = spawn(
        "node",
        ["comprehensive-test-runner.js"],
        {
          cwd: this.testSuiteRoot,
          stdio: ["inherit", "pipe", "pipe"],
          shell: true,
        }
      );

      // Capture stdout
      testProcess.stdout.on("data", (data) => {
        const output = data.toString();
        process.stdout.write(output);
        this.logBuffer.push(output.trim());
      });

      // Capture stderr
      testProcess.stderr.on("data", (data) => {
        const output = data.toString();
        process.stderr.write(output);
        this.logBuffer.push(`[STDERR] ${output.trim()}`);
      });

      // Handle process exit
      testProcess.on("close", async (code) => {
        const duration = Date.now() - this.startTime;
        this.log("", "INFO");
        this.log("=".repeat(80), "INFO");
        
        if (code === 0) {
          this.log("🎉 All tests passed!", "SUCCESS");
        } else {
          this.log(`❌ Tests failed with exit code ${code}`, "ERROR");
        }
        
        this.log(`⏱️  Total duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`, "INFO");
        
        // Write log file
        await this.writeLogFile();
        
        resolve(code === 0);
      });

      // Handle process error
      testProcess.on("error", async (error) => {
        this.log(`💥 Failed to start test process: ${error.message}`, "CRITICAL");
        this.logBuffer.push(`[ERROR] ${error.message}`);
        await this.writeLogFile();
        reject(error);
      });
    });
  }

  async run() {
    try {
      const success = await this.runTests();
      process.exit(success ? 0 : 1);
    } catch (error) {
      this.log(`💥 Fatal error: ${error.message}`, "CRITICAL");
      await this.writeLogFile();
      process.exit(1);
    }
  }
}

// Run the test suite
const runner = new OneClickTestRunner();
runner.run();

