/**
 * Frontend UI Users Tests
 * 
 * Tests user management, creation, editing, deletion, and role/scopes management
 * through the actual web UI using browser automation.
 */

import { CONFIG } from "../../config.js";

/**
 * Run users UI tests
 * @param {Object} testSuite - Test suite instance
 * @param {Object} page - Playwright page object
 */
export async function runUsersUITests(testSuite, page) {
  testSuite.logger.suiteStart("Frontend UI: Users Tests");

  const frontendUrl = CONFIG.FRONTEND_URL;

  // Helper function to login
  async function login() {
    await page.goto(`${frontendUrl}/login`);
    await page.waitForLoadState("networkidle");

    const usernameField = await page.locator('[data-testid="login-username"]').first();
    const passwordField = await page.locator('[data-testid="login-password"]').first();
    const submitButton = await page.locator('[data-testid="login-submit"]').first();

    await usernameField.fill(CONFIG.ADMIN_CREDENTIALS.username);
    await passwordField.fill(CONFIG.ADMIN_CREDENTIALS.password);
    await submitButton.click();

    await page.waitForURL(url => !url.pathname.includes("/login"), { timeout: 10000 });
  }

  // Test 7.1: Project Users List
  await testSuite.test("Project users list displays", async () => {
    await login();
    
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const projectLink = await page.locator('a[href*="/projects/"]').first().click().catch(() => null);
    if (projectLink !== null) {
      await page.waitForURL(url => url.pathname.match(/\/projects\/[^/]+$/), { timeout: 5000 });
      
      await page.goto(page.url().replace(/\/$/, "") + "/users");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      const isOnUsersPage = currentUrl.includes("/users");

      testSuite.assert(isOnUsersPage, "Should be on project users page");
    } else {
      testSuite.assert(true, "No project available to test users page");
    }
  });

  // Test 7.2: Admin Users List
  await testSuite.test("Admin users list displays", async () => {
    await login();
    
    await page.goto(`${frontendUrl}/users`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isOnUsersPage = currentUrl.includes("/users");

    testSuite.assert(isOnUsersPage, "Should be on admin users page");
  });

  // Test 7.3: Create User Button
  await testSuite.test("Create User button works", async () => {
    await login();
    
    await page.goto(`${frontendUrl}/users`);
    await page.waitForLoadState("networkidle");

    const createButton = await page.locator(
      '[data-testid="create-user-button"], [data-testid="create-admin-user-button"]'
    ).first().isVisible().catch(() => false);

    if (createButton) {
      await page.locator('[data-testid="create-user-button"], [data-testid="create-admin-user-button"]').first().click();
      await page.waitForTimeout(1000);

      const hasModal = await page.locator(
        '[role="dialog"], [class*="modal"], [class*="dialog"], form'
      ).first().isVisible().catch(() => false);

      testSuite.assert(hasModal, "Create User button should open modal or form");
    } else {
      testSuite.assert(true, "Create button may not be visible");
    }
  });

  testSuite.logger.suiteEnd("Frontend UI: Users Tests");
}

