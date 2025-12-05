/**
 * Browser Manager
 * Handles browser initialization and health checks
 */

import { chromium, firefox, webkit } from "playwright";
import { CONFIG } from "../config.js";

export async function initializeBrowser(log) {
  log("🌐 Initializing browser...", "INFO");
  
  try {
    const browserType = process.env.BROWSER || "chromium";
    const browserEngine = {
      chromium,
      firefox,
      webkit,
    }[browserType] || chromium;

    const browser = await browserEngine.launch({
      headless: process.env.HEADLESS !== "false",
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: "KRAPI Frontend UI Test Runner",
      acceptDownloads: true,
    });

    const page = await context.newPage();

    // Set up console logging from browser
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error") {
        log(`Browser Console Error: ${msg.text()}`, "ERROR");
      } else if (process.env.VERBOSE === "true") {
        log(`Browser Console [${type}]: ${msg.text()}`, "INFO");
      }
    });

    page.on("pageerror", (error) => {
      log(`Page Error: ${error.message}`, "ERROR");
    });

    if (process.env.VERBOSE === "true") {
      page.on("request", (request) => {
        log(`→ ${request.method()} ${request.url()}`, "INFO");
      });
      page.on("response", (response) => {
        if (!response.ok()) {
          log(`← ${response.status()} ${response.url()}`, "WARNING");
        }
      });
    }

    log("✅ Browser initialized", "SUCCESS");
    return { browser, context, page };
  } catch (error) {
    log(`❌ Failed to initialize browser: ${error.message}`, "ERROR");
    throw error;
  }
}

export async function checkFrontendHealth(page, log) {
  log("🏥 Checking frontend health...", "INFO");
  
  try {
    const response = await page.goto(`${CONFIG.FRONTEND_URL}/api/health`, {
      waitUntil: "networkidle",
      timeout: 10000,
    });

    if (!response || !response.ok()) {
      throw new Error(`Frontend not responding: ${response?.status() || "No response"}`);
    }

    log("✅ Frontend is healthy", "SUCCESS");
    return true;
  } catch (error) {
    log(`❌ Frontend health check failed: ${error.message}`, "ERROR");
    log(`   Make sure frontend is running at ${CONFIG.FRONTEND_URL}`, "INFO");
    throw error;
  }
}

export async function closeBrowser(browser, context, page, log) {
  try {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
    log("✅ Browser closed", "SUCCESS");
  } catch (error) {
    log(`⚠️  Error closing browser: ${error.message}`, "WARNING");
  }
}


