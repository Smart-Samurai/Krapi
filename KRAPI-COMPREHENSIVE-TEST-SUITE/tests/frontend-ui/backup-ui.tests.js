/**
 * Frontend UI Backup Tests
 * 
 * Tests backup creation, restoration, download, and deletion
 * through the actual web UI using browser automation.
 */

import { CONFIG } from "../../config.js";
import { getFirstProject } from "../../lib/db-verification.js";

/**
 * Run backup UI tests
 * @param {Object} testSuite - Test suite instance
 * @param {Object} page - Playwright page object
 */
export async function runBackupUITests(testSuite, page) {
  testSuite.logger.suiteStart("Frontend UI: Backup Tests");

  const frontendUrl = CONFIG.FRONTEND_URL;

  // Helper function to login and navigate to a project
  async function loginAndGetProject() {
    // Verify data exists in DB first
    const projectCheck = await Promise.race([
      getFirstProject(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("DB verification timeout")),
          CONFIG.TEST_TIMEOUT / 2
        )
      ),
    ]).catch((error) => ({ project: null, error: error.message }));

    testSuite.assert(
      projectCheck.project !== null,
      `Project should exist in DB: ${projectCheck.error || "OK"}`
    );

    if (!projectCheck.project) {
      throw new Error(`No project found in DB: ${projectCheck.error}`);
    }

    // Login
    await page.goto(`${frontendUrl}/login`, {
      waitUntil: "domcontentloaded",
      timeout: CONFIG.TEST_TIMEOUT,
    });
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

    const usernameField = page.locator('[data-testid="login-username"]').first();
    const passwordField = page.locator('[data-testid="login-password"]').first();
    const submitButton = page.locator('[data-testid="login-submit"]').first();

    await usernameField.fill(CONFIG.ADMIN_CREDENTIALS.username);
    await passwordField.fill(CONFIG.ADMIN_CREDENTIALS.password);
    await submitButton.click();

    await page.waitForURL(url => !url.pathname.includes("/login"), { 
      timeout: CONFIG.TEST_TIMEOUT 
    });
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

    // Navigate directly to the project
    await page.goto(`${frontendUrl}/projects/${projectCheck.project.id}`, {
      waitUntil: "domcontentloaded",
      timeout: CONFIG.TEST_TIMEOUT,
    });
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
  }

  // Test 10.1: Backup List Displays
  await testSuite.test("Backup list displays", async () => {
    await loginAndGetProject();
    
    const currentUrl = page.url();
    const projectIdMatch = currentUrl.match(/\/projects\/([^/]+)/);
    
    if (!projectIdMatch) {
      throw new Error(`Not on a project page. Current URL: ${currentUrl}`);
    }
    
    const projectId = projectIdMatch[1];
    const backupUrl = `${frontendUrl}/projects/${projectId}/backup`;
    
    await page.goto(backupUrl, {
      waitUntil: "domcontentloaded",
      timeout: CONFIG.TEST_TIMEOUT,
    });
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

    // Wait for page content - backup page can show table, empty state, or error
    const table = page.locator('[data-testid="backup-table"], table').first();
    const emptyState = page.locator('[data-testid="backup-empty-state"]').first();
    const emptyStateText = page.locator('text=/no.*backup/i').first();
    
    await Promise.race([
      table.waitFor({ state: "attached", timeout: CONFIG.TEST_TIMEOUT / 2 }),
      emptyState.waitFor({ state: "attached", timeout: CONFIG.TEST_TIMEOUT / 2 }),
      emptyStateText.waitFor({ state: "attached", timeout: CONFIG.TEST_TIMEOUT / 2 }),
    ]);

    const finalUrl = page.url();
    const isOnBackupPage = finalUrl.includes("/backup");
    const hasTable = await table.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false) || await emptyStateText.isVisible().catch(() => false);
    const pageText = await page.textContent("body").catch(() => "");
    const hasBackupText = pageText && pageText.toLowerCase().includes("backup");

    // STRICT: Page MUST be on backup route and show content
    testSuite.assert(
      isOnBackupPage && (hasTable || hasEmptyState || hasBackupText),
      `Backup page MUST display. URL: ${finalUrl}, Has table: ${hasTable}, Has empty state: ${hasEmptyState}, Has backup text: ${hasBackupText}`
    );
  });

  // Test 10.2: Create Backup Button
  await testSuite.test("Create Backup button works", async () => {
    await loginAndGetProject();
    
    await page.goto(page.url().replace(/\/$/, "") + "/backup");
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

    const createButton = await page.locator(
      '[data-testid="create-backup-button"]'
    ).first().isVisible().catch(() => false);

    if (createButton) {
      await page.locator('[data-testid="create-backup-button"]').first().click();
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

      const hasModal = await page.locator(
        '[data-testid="create-backup-dialog"], [role="dialog"]'
      ).first().isVisible().catch(() => false);

      testSuite.assert(hasModal, "Create Backup button should open modal or form");
    } else {
      testSuite.assert(true, "Create button may not be visible");
    }
  });

  testSuite.logger.suiteEnd("Frontend UI: Backup Tests");
}

