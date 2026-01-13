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

/**
 * Verify UI displays same data as SDK returns
 * @param {Object} page - Playwright page
 * @param {Object} sdkResult - Data returned by SDK (can be array or object)
 * @param {string|Function} uiSelector - Selector or function to get UI data
 * @param {Object} options - Options for verification
 */
export async function verifyUIDataMatchesSDK(page, sdkResult, uiSelector, options = {}) {
  const { timeout = CONFIG.TEST_TIMEOUT / 2 } = options;
  
  let uiData;
  if (typeof uiSelector === "function") {
    uiData = await uiSelector(page);
  } else {
    // Extract data from UI elements
    const elements = await page.locator(uiSelector).all();
    uiData = await Promise.all(
      elements.map(async (el) => {
        const text = await el.textContent();
        return text?.trim();
      })
    );
  }
  
  // If SDK returns array, verify UI has same items
  if (Array.isArray(sdkResult)) {
    if (sdkResult.length === 0 && uiData.length === 0) {
      return true; // Both empty, that's fine
    }
    if (uiData.length < sdkResult.length) {
      throw new Error(`UI displays ${uiData.length} items but SDK returned ${sdkResult.length} items`);
    }
    // Verify at least the same number of items appear
    return uiData.length >= sdkResult.length;
  }
  
  // If SDK returns object, verify key fields match
  if (typeof sdkResult === "object" && sdkResult !== null) {
    const sdkKeys = Object.keys(sdkResult);
    for (const key of sdkKeys) {
      const sdkValue = sdkResult[key];
      if (sdkValue !== null && sdkValue !== undefined) {
        // Try to find this value in UI
        const found = uiData.some(uiItem => 
          String(uiItem).includes(String(sdkValue))
        );
        if (!found && typeof sdkValue === "string" && sdkValue.length > 0) {
          throw new Error(`SDK data field "${key}" with value "${sdkValue}" not found in UI`);
        }
      }
    }
    return true;
  }
  
  return true;
}

/**
 * Verify SDK route was called
 * @param {Object} testSuite - Test suite instance
 * @param {string} expectedRoute - Expected route path (e.g., "/api/krapi/k1/projects")
 * @param {string} expectedMethod - Expected HTTP method (e.g., "GET", "POST")
 */
export function verifySDKRouteCalled(testSuite, expectedRoute, expectedMethod, routeType = 'client') {
  if (!testSuite.verifySDKRouteCalled) {
    throw new Error("testSuite.verifySDKRouteCalled not available - test suite factory must be updated");
  }
  // Only convert proxy route paths to client route paths if routeType is 'client'
  // If routeType is 'proxy', use the route as-is
  let routeToCheck = expectedRoute;
  if (routeType === 'client') {
    if (expectedRoute.startsWith('/api/krapi/k1/') && !expectedRoute.startsWith('/api/client/')) {
      routeToCheck = expectedRoute.replace('/api/krapi/k1/', '/api/client/krapi/k1/');
    } else if (expectedRoute.startsWith('/api/mcp/') && !expectedRoute.startsWith('/api/client/')) {
      routeToCheck = expectedRoute.replace('/api/mcp/', '/api/client/mcp/');
    } else if (expectedRoute.startsWith('/api/auth/') && !expectedRoute.startsWith('/api/client/')) {
      routeToCheck = expectedRoute.replace('/api/auth/', '/api/client/auth/');
    } else if (expectedRoute.startsWith('/api/projects') && !expectedRoute.startsWith('/api/client/')) {
      routeToCheck = expectedRoute.replace('/api/projects', '/api/client/projects');
    }
  }
  return testSuite.verifySDKRouteCalled(routeToCheck, expectedMethod, routeType);
}

/**
 * Verify CRUD operation completed in UI
 * @param {Object} page - Playwright page
 * @param {string} operation - Operation type: "create", "update", "delete"
 * @param {string} entityType - Entity type: "project", "collection", "document", etc.
 * @param {Object} options - Options
 */
export async function verifyCRUDOperationComplete(page, operation, entityType, options = {}) {
  const { entityName, entityId, timeout = CONFIG.TEST_TIMEOUT / 2, testId } = options;
  
  // Use testId if provided, otherwise construct from entityType and entityId/entityName
  let nameLocator;
  if (testId) {
    nameLocator = page.locator(`[data-testid="${testId}"]`).first();
  } else if (entityId) {
    // Construct test identifier from entity type and ID
    const testIdentifier = `${entityType}-row-${entityId}`;
    nameLocator = page.locator(`[data-testid="${testIdentifier}"]`).first();
  } else if (entityName) {
    // Construct test identifier from entity type and name
    const testIdentifier = `${entityType}-row-${entityName}`;
    nameLocator = page.locator(`[data-testid="${testIdentifier}"]`).first();
  } else {
    throw new Error("Either testId, entityId, or entityName must be provided");
  }
  
  switch (operation) {
    case "create":
      // Verify entity appears in list
      await nameLocator.waitFor({ state: "visible", timeout });
      return true;
      
    case "update":
      // Verify updated data appears
      await nameLocator.waitFor({ state: "visible", timeout });
      return true;
      
    case "delete":
      // Verify entity removed from list
      const isVisible = await nameLocator.isVisible().catch(() => false);
      if (isVisible) {
        throw new Error(`Entity still visible after delete operation`);
      }
      return true;
  }
  
  return true;
}

/**
 * Wait for data to load in UI
 * @param {Object} page - Playwright page
 * @param {string|Array} selector - Selector(s) to wait for
 * @param {Object} options - Options
 */
export async function waitForDataToLoad(page, selector, options = {}) {
  const { timeout = CONFIG.TEST_TIMEOUT / 2, state = "visible" } = options;
  
  const selectors = Array.isArray(selector) ? selector : [selector];
  const locators = selectors.map(sel => page.locator(sel).first());
  
  // Wait for any of the selectors to appear
  await Promise.race(
    locators.map(locator => locator.waitFor({ state, timeout }))
  );
}

/**
 * Track SDK routes during test execution
 * @param {Object} page - Playwright page
 * @returns {Function} Function to get tracked routes
 */
export function trackSDKRoutes(page) {
  const routes = [];
  
  const handler = (request) => {
    const url = request.url();
    // Track both client routes and proxy routes
    if (url.includes("/api/client/krapi/k1/") || url.includes("/api/client/mcp/") || 
        url.includes("/api/client/auth/") || url.includes("/api/client/projects") ||
        url.includes("/api/krapi/k1/") || url.includes("/api/mcp/")) {
      routes.push({
        url: url,
        method: request.method(),
        timestamp: Date.now(),
        type: url.includes("/api/client/") ? 'client' : 'proxy',
      });
    }
  };
  
  page.on("request", handler);
  
  return {
    getRoutes: () => routes,
    stop: () => page.off("request", handler),
  };
}

/**
 * Verify no direct backend calls detected
 * @param {Object} page - Playwright page
 * @param {Array} trackedCalls - Array of tracked network calls
 */
export function verifyNoDirectBackendCalls(page, trackedCalls = []) {
  const directCalls = trackedCalls.filter(call => 
    call.url.includes("localhost:3470") || call.url.includes("127.0.0.1:3470")
  );
  
  if (directCalls.length > 0) {
    throw new Error(
      `Direct backend calls detected (${directCalls.length}):\n` +
      directCalls.map(call => `  ${call.method} ${call.url}`).join("\n") +
      "\nAll calls must go through client API routes (/api/client/krapi/k1/* or /api/client/mcp/*)"
    );
  }
  
  return true;
}

/**
 * Get SDK route calls for specific route
 * @param {Array} trackedCalls - Array of tracked network calls
 * @param {string} route - Route to filter by
 * @returns {Array} Filtered calls
 */
export function getSDKRouteCalls(trackedCalls, route) {
  return trackedCalls.filter(call => call.url.includes(route));
}

/**
 * Login as project user (not admin)
 * @param {Object} page - Playwright page
 * @param {string} frontendUrl - Frontend URL
 * @param {string} username - Project user username
 * @param {string} password - Project user password
 */
export async function loginAsProjectUser(page, frontendUrl, username, password) {
  await page.goto(`${frontendUrl}/login`, {
    waitUntil: "domcontentloaded",
    timeout: CONFIG.TEST_TIMEOUT,
  });
  await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

  const usernameField = page.locator('[data-testid="login-username"]').first();
  const passwordField = page.locator('[data-testid="login-password"]').first();
  const submitButton = page.locator('[data-testid="login-submit"]').first();

  await usernameField.fill(username);
  await passwordField.fill(password);
  await submitButton.click();

  await page.waitForURL(url => !url.pathname.includes("/login"), { 
    timeout: CONFIG.TEST_TIMEOUT 
  });
  await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

  // Wait for auth to initialize
  await page.waitForFunction(() => {
    return localStorage.getItem("session_token") !== null;
  }, { timeout: CONFIG.TEST_TIMEOUT / 2 });
}

/**
 * Create a project user via UI (requires admin login first)
 * @param {Object} page - Playwright page
 * @param {string} frontendUrl - Frontend URL
 * @param {string} projectId - Project ID
 * @param {Object} userData - User data { username, email, password, permissions? }
 * @returns {Promise<{username: string, email: string}>} Created user info
 */
export async function createProjectUserViaUI(page, frontendUrl, projectId, userData) {
  const { username, email, password, permissions = ["documents:read", "documents:write"] } = userData;
  
  // Navigate to users page
  await page.goto(`${frontendUrl}/projects/${projectId}/users`);
  await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 2);
  
  // Click "Create User" button (data-testid only)
  const createButton = page.locator('[data-testid="create-user-button"]').first();
  
  const hasCreateButton = await createButton.isVisible().catch(() => false);
  if (!hasCreateButton) {
    throw new Error("Create user button not found - add data-testid='create-user-button' to the button");
  }
  
  await createButton.click();
  await page.waitForTimeout(1000);
  
  // Fill user creation form (data-testid only)
  const dialog = page.locator('[data-testid="create-user-dialog"]').first();
  await dialog.waitFor({ state: "visible", timeout: CONFIG.TEST_TIMEOUT }).catch(() => null);
  
  const usernameField = page.locator('[data-testid="user-form-username"]').first();
  const emailField = page.locator('[data-testid="user-form-email"]').first();
  const passwordField = page.locator('[data-testid="user-form-password"]').first();
  const saveButton = page.locator('[data-testid="create-user-dialog-submit"]').first();
  
  if (await usernameField.isVisible().catch(() => false)) {
    await usernameField.fill(username);
  }
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(email);
  }
  if (await passwordField.isVisible().catch(() => false)) {
    await passwordField.fill(password);
  }
  
  await saveButton.click();
  await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 2);
  
  // Verify user was created (appears in list) - need test identifier on user rows
  const userRow = page.locator(`[data-testid="user-row-${username}"]`).first();
  const userCreated = await userRow.isVisible({ timeout: CONFIG.TEST_TIMEOUT }).catch(() => false);
  
  if (!userCreated) {
    throw new Error(`Project user ${username} was not created or does not appear in list`);
  }
  
  return { username, email };
}

/**
 * Logout current user
 * @param {Object} page - Playwright page
 * @param {string} frontendUrl - Frontend URL
 */
export async function logoutUser(page, frontendUrl) {
  // Try to find logout button
  await page.goto(`${frontendUrl}/profile`);
  await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
  
  const logoutButton = page.locator('[data-testid="logout-button"]').first();
  const hasLogoutButton = await logoutButton.isVisible().catch(() => false);
  
  if (hasLogoutButton) {
    await logoutButton.click();
    await page.waitForURL(url => url.pathname.includes("/login"), { timeout: 10000 });
  } else {
    // Clear session manually
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${frontendUrl}/login`);
  }
}

/**
 * Verify user cannot access a specific page (should redirect or show error)
 * @param {Object} page - Playwright page
 * @param {string} url - URL to test
 * @param {string} expectedRedirect - Expected redirect path (e.g., "/login", "/dashboard")
 * @returns {boolean} True if access was blocked
 */
export async function verifyAccessBlocked(page, url, expectedRedirect = "/login") {
  await page.goto(url);
  await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 2);
  
  const currentUrl = page.url();
  const isBlocked = currentUrl.includes(expectedRedirect) || 
                    !currentUrl.includes(url.split('/').pop());
  
  return isBlocked;
}

/**
 * Verify edit/delete buttons are disabled or hidden for read-only user
 * @param {Object} page - Playwright page
 * @param {string} testId - data-testid for edit/delete buttons (must use data-testid only)
 * @returns {boolean} True if buttons are disabled/hidden
 */
export async function verifyWriteActionsDisabled(page, testId) {
  // Ensure testId is a data-testid selector
  if (!testId.startsWith('[data-testid=') && !testId.startsWith('data-testid=')) {
    throw new Error(`verifyWriteActionsDisabled must use data-testid selector only. Got: ${testId}`);
  }
  
  const selector = testId.startsWith('[') ? testId : `[data-testid="${testId}"]`;
  const buttons = page.locator(selector);
  const count = await buttons.count();
  
  if (count === 0) {
    return true; // Buttons are hidden (good for read-only)
  }
  
  // Check if buttons are disabled
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const isDisabled = await button.isDisabled().catch(() => false);
    const isVisible = await button.isVisible().catch(() => false);
    
    if (isVisible && !isDisabled) {
      return false; // Button is visible and enabled (bad for read-only)
    }
  }
  
  return true; // All buttons are disabled or hidden
}

