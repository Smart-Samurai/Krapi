/**
 * Standardized Test Helpers
 * 
 * Provides uniform testing patterns for all UI tests to ensure consistency
 */

import { CONFIG } from "../config.js";

/**
 * Standard login helper - uses domcontentloaded, waits for auth
 */
export async function standardLogin(page, frontendUrl) {
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

  // Wait for auth to initialize (reduced timeout for speed)
  await page.waitForFunction(() => {
    return localStorage.getItem("session_token") !== null && localStorage.getItem("user_scopes") !== null;
  }, { timeout: CONFIG.TEST_TIMEOUT / 2 });
}

/**
 * Standard page navigation - uses domcontentloaded, not networkidle
 */
export async function standardNavigate(page, url) {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: CONFIG.TEST_TIMEOUT,
  });
  await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
}

/**
 * Standard wait for page content - handles multiple possible states
 * @param {Object} page - Playwright page
 * @param {Object} options - Options object
 * @param {string|Array} options.tableSelector - Selector(s) for table/content
 * @param {string|Array} options.emptyStateSelector - Selector(s) for empty state
 * @param {string|Array} options.errorSelector - Selector(s) for error state
 * @param {number} options.timeout - Timeout in ms (defaults to CONFIG.TEST_TIMEOUT / 2)
 */
export async function waitForPageContent(page, options = {}) {
  const {
    tableSelector,
    emptyStateSelector,
    errorSelector,
    timeout = CONFIG.TEST_TIMEOUT / 2,
  } = options;

  const locators = [];
  
  if (tableSelector) {
    const selectors = Array.isArray(tableSelector) ? tableSelector : [tableSelector];
    selectors.forEach(sel => locators.push(page.locator(sel).first()));
  }
  
  if (emptyStateSelector) {
    const selectors = Array.isArray(emptyStateSelector) ? emptyStateSelector : [emptyStateSelector];
    selectors.forEach(sel => locators.push(page.locator(sel).first()));
  }
  
  if (errorSelector) {
    const selectors = Array.isArray(errorSelector) ? errorSelector : [errorSelector];
    selectors.forEach(sel => locators.push(page.locator(sel).first()));
  }

  if (locators.length === 0) {
    throw new Error("At least one selector must be provided");
  }

  // Wait for any of the possible states
  await Promise.race(
    locators.map(locator => locator.waitFor({ state: "attached", timeout }))
  );
}

/**
 * Standard element wait - waits for element to be visible
 */
export async function waitForElement(page, selector, options = {}) {
  const {
    timeout = CONFIG.TEST_TIMEOUT / 2,
    state = "visible",
  } = options;

  const locator = page.locator(selector).first();
  await locator.waitFor({ state, timeout });
  return locator;
}

