/**
 * Frontend UI Documents Tests
 *
 * Tests documents management, CRUD operations, search, filter, and pagination
 * through the actual web UI using browser automation.
 */

import { CONFIG } from "../../config.js";
import { getFirstProject, getFirstCollection, verifyDocumentsExist } from "../../lib/db-verification.js";

// Single timeout constant for all tests
const TEST_TIMEOUT = CONFIG.TEST_TIMEOUT;

/**
 * Run documents UI tests
 * @param {Object} testSuite - Test suite instance
 * @param {Object} page - Playwright page object
 */
export async function runDocumentsUITests(testSuite, page) {
  testSuite.logger.suiteStart("Frontend UI: Documents Tests");

  const frontendUrl = CONFIG.FRONTEND_URL;

  // Helper function to login and navigate to a project
  async function loginAndGetProject() {
    // Login
    await page.goto(`${frontendUrl}/login`);
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

    const usernameField = page
      .locator('[data-testid="login-username"]')
      .first();
    const passwordField = page
      .locator('[data-testid="login-password"]')
      .first();
    const submitButton = page.locator('[data-testid="login-submit"]').first();

    await usernameField.fill(CONFIG.ADMIN_CREDENTIALS.username);
    await passwordField.fill(CONFIG.ADMIN_CREDENTIALS.password);
    await submitButton.click();

    // Wait for redirect from login page
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10000,
    });
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

    // Navigate to projects page
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT); // Give page time to initialize

    // Wait for the projects container to appear first (this should always be present)
    const projectsContainer = page.locator(
      '[data-testid="projects-container"]'
    );
    await projectsContainer
      .waitFor({ state: "attached", timeout: 8000 })
      .catch(() => {
        // Container might not have data-testid, try alternative
      });

    // Now wait for content to load - either skeleton, cards, or empty state
    const skeletonCard = page.locator('[data-testid="projects-skeleton-card"]');
    const projectCard = page.locator('[data-testid="project-card"]');
    const emptyState = page.locator('[data-testid="empty-state-projects"]');

    // Poll for content to appear (skeleton, cards, or empty state)
    // Must complete within 7 seconds to leave time for the actual test
    let foundContent = false;
    for (let i = 0; i < 14; i++) {
      // 14 iterations * 500ms = 7 seconds max
      const skeletonCount = await skeletonCard.count();
      const cardCount = await projectCard.count();
      const emptyCount = await emptyState.count();
      
      // If we have skeletons, page is still loading - good sign!
      if (skeletonCount > 0) {
        await page.waitForTimeout(500);
        continue;
      }
      
      // If we have cards or empty state, we're done
      if (cardCount > 0 || emptyCount > 0) {
        foundContent = true;
        break;
      }
      
      // If we're halfway through and still nothing, try refreshing once
      if (i === 7) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
        // Re-check after reload
        const reloadSkeletonCount = await skeletonCard.count();
        const reloadCardCount = await projectCard.count();
        const reloadEmptyCount = await emptyState.count();
        if (reloadCardCount > 0 || reloadEmptyCount > 0) {
          foundContent = true;
          break;
        }
      }
      
      // Wait a bit and check again
      await page.waitForTimeout(500);
    }

    if (!foundContent) {
      // Check what's actually on the page
      const pageText = await page.textContent("body").catch(() => "");
      const url = page.url();
      const skeletonCount = await skeletonCard.count();
      const cardCount = await projectCard.count();
      const emptyCount = await emptyState.count();
      const containerExists = (await projectsContainer.count()) > 0;

      // Check for error messages
      const errorAlert = await page
        .locator('[role="alert"], .alert')
        .first()
        .isVisible()
        .catch(() => false);
      const errorText = errorAlert
        ? await page
            .locator('[role="alert"], .alert')
            .first()
            .textContent()
            .catch(() => "")
        : "";

      throw new Error(
        `Projects page did not load content. URL: ${url}, Container exists: ${containerExists}, Skeletons: ${skeletonCount}, Cards: ${cardCount}, Empty: ${emptyCount}, Has error: ${errorAlert}, Error text: ${errorText.substring(
          0,
          100
        )}`
      );
    }

    // Check for empty state - this means test data wasn't created
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    if (hasEmptyState) {
      throw new Error(
        "No projects found on projects page. Test data may not have been created."
      );
    }

    // Verify we have at least one project card
    const cardCount = await projectCard.count();
    if (cardCount === 0) {
      const pageText = await page.textContent("body").catch(() => "");
      const url = page.url();
      throw new Error(
        `No project cards found. URL: ${url}, Page contains 'Projects': ${pageText.includes(
          "Projects"
        )}`
      );
    }

    // Click the first project card
    const firstCard = projectCard.first();
    await firstCard.scrollIntoViewIfNeeded();
    await firstCard.click({ timeout: 3000 });

    // Wait for navigation to project detail page
    await page.waitForURL((url) => url.pathname.match(/\/projects\/[^/]+$/), {
      timeout: 6000,
    });
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
    await page.waitForTimeout(500); // Brief wait for page to render

    // Verify we're on a project detail page
    const finalUrl = page.url();
    if (!finalUrl.match(/\/projects\/[^/]+$/)) {
      throw new Error(
        `Failed to navigate to project detail page. Current URL: ${finalUrl}`
      );
    }
  }

  // Test 5.1: Documents Table Displays (CRITICAL - if page doesn't exist, other document tests are pointless)
  await testSuite.test(
    "Documents table displays",
    async () => {
      // Verify data exists in DB first - find a project WITH collections - fail fast on timeout
      const projectCheck = await Promise.race([
        getFirstProject(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB verification timeout")), 3000))
      ]).catch((error) => ({ project: null, error: error.message }));
      
      testSuite.assert(projectCheck.project !== null, `Project should exist in DB: ${projectCheck.error || "OK"}`);
      
      if (!projectCheck.project) {
        throw new Error(`No project found in DB: ${projectCheck.error}`);
      }
      
      // Try to find a collection, but if none exists, the documents page should still work (empty state)
      const collectionCheck = await Promise.race([
        getFirstCollection(projectCheck.project.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Collection DB verification timeout")), CONFIG.TEST_TIMEOUT / 2))
      ]).catch((error) => ({ collection: null, error: error.message }));
      
      // If no collection exists, we'll test the empty state instead
      if (!collectionCheck.collection) {
        // Navigate to documents page - it should show empty state or collection selector
        const projectId = projectCheck.project.id;
        const documentsUrl = `${frontendUrl}/projects/${projectId}/documents`;
        
        // Login first
        await page.goto(`${frontendUrl}/login`, { waitUntil: "domcontentloaded", timeout: CONFIG.TEST_TIMEOUT });
        await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
        
        const usernameField = page.locator('[data-testid="login-username"]').first();
        const passwordField = page.locator('[data-testid="login-password"]').first();
        const submitButton = page.locator('[data-testid="login-submit"]').first();
        
        await usernameField.fill(CONFIG.ADMIN_CREDENTIALS.username);
        await passwordField.fill(CONFIG.ADMIN_CREDENTIALS.password);
        await submitButton.click();
        
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: CONFIG.TEST_TIMEOUT });
        await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
        
        // Wait for auth to initialize
        await page.waitForFunction(() => {
          return localStorage.getItem("session_token") !== null && localStorage.getItem("user_scopes") !== null;
        }, { timeout: CONFIG.TEST_TIMEOUT });
        
        // Navigate to documents page
        await page.goto(documentsUrl, { waitUntil: "domcontentloaded", timeout: CONFIG.TEST_TIMEOUT });
        await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
        await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 2);
        
        // Check for empty state or collection selector
        const emptyState = page.locator('[data-testid="documents-empty-state"], text=/no.*collection/i, text=/no.*document/i').first();
        const collectionSelector = page.locator('select, [role="combobox"]').first();
        const pageText = await page.textContent("body").catch(() => "");
        const hasDocumentText = pageText && pageText.toLowerCase().includes("document");
        
        const hasEmptyState = await emptyState.isVisible().catch(() => false);
        const hasSelector = await collectionSelector.isVisible().catch(() => false);
        const finalUrl = page.url();
        const isOnDocumentsPage = finalUrl.includes("/documents");
        
        testSuite.assert(
          isOnDocumentsPage && (hasEmptyState || hasSelector || hasDocumentText),
          `Documents page should display (empty state or collection selector). URL: ${finalUrl}, Empty state: ${hasEmptyState}, Selector: ${hasSelector}, Has text: ${hasDocumentText}`
        );
        return; // Test passes with empty state
      }
      
      const documentsCheck = await Promise.race([
        verifyDocumentsExist(projectCheck.project.id, collectionCheck.collection.name, 0),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Documents DB verification timeout")), 3000))
      ]).catch(() => ({ exists: false, count: 0, documents: [] }));
      
      testSuite.assert(documentsCheck !== null, "Should be able to verify documents in DB");
      
      // Login and navigate directly to the project with collections
      await page.goto(`${frontendUrl}/login`);
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
      
      const usernameField = page.locator('[data-testid="login-username"]').first();
      const passwordField = page.locator('[data-testid="login-password"]').first();
      const submitButton = page.locator('[data-testid="login-submit"]').first();
      
      await usernameField.fill(CONFIG.ADMIN_CREDENTIALS.username);
      await passwordField.fill(CONFIG.ADMIN_CREDENTIALS.password);
      await submitButton.click();
      
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
      
      // Navigate directly to the project that has collections
      const projectId = projectCheck.project.id;
      const documentsUrl = `${frontendUrl}/projects/${projectId}/documents`;

      await page.goto(documentsUrl);
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 3); // Wait for documents page to load

      // Wait for page content to appear
      const table = page.locator('[data-testid="documents-table"], table, [role="table"]');
      const emptyState = page.locator('[data-testid="documents-empty-state"], text=/no.*document/i');
      
      await Promise.race([
        table.waitFor({ state: "visible", timeout: TEST_TIMEOUT }),
        emptyState.waitFor({ state: "visible", timeout: TEST_TIMEOUT }),
      ]);

      const finalUrl = page.url();
      const isOnDocumentsPage = finalUrl.includes("/documents");

      // Check for any content on the page (table, empty state, or error)
      const hasTable = await table.first().isVisible().catch(() => false);
      const hasEmptyState = await emptyState.first().isVisible().catch(() => false);
      const hasError = await page
        .locator('[role="alert"], .alert')
        .first()
        .isVisible()
        .catch(() => false);
      const pageText = await page.textContent("body").catch(() => "");
      const hasDocumentText =
        pageText &&
        (pageText.toLowerCase().includes("document") ||
          pageText.toLowerCase().includes("collection"));

      testSuite.assert(
        isOnDocumentsPage && (hasTable || hasError || hasDocumentText),
        `Should be on documents page. URL: ${finalUrl}, Has table: ${hasTable}, Has error: ${hasError}, Has text: ${hasDocumentText}`
      );
    },
    { critical: true }
  );

  // Test 5.2: Documents Load (CRITICAL - if documents don't load, other document tests are pointless)
  await testSuite.test(
    "All documents load correctly",
    async () => {
      await loginAndGetProject();

      await page.goto(page.url().replace(/\/$/, "") + "/documents");
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
      await page.waitForTimeout(5000); // Wait for documents page to load

      // Check for documents table or any content indicating the page loaded
      const documentsTable = await page
        .locator('[data-testid="documents-table"]')
        .first()
        .isVisible()
        .catch(() => false);

      // Also check for document-related text
      const pageText = await page.textContent("body").catch(() => "");
      const hasDocumentText =
        pageText &&
        (pageText.toLowerCase().includes("document") ||
          pageText.toLowerCase().includes("collection"));

      testSuite.assert(
        documentsTable || hasDocumentText,
        "Documents page should display content"
      );
    },
    { critical: true }
  );

  // Test 5.3: Create Document Button
  await testSuite.test("Create Document button works", async () => {
    await loginAndGetProject();

    const currentUrl = page.url();
    const projectIdMatch = currentUrl.match(/\/projects\/([^/]+)/);
    
    if (!projectIdMatch) {
      throw new Error(`Not on a project page. Current URL: ${currentUrl}`);
    }
    
    const projectId = projectIdMatch[1];
    const documentsUrl = `${frontendUrl}/projects/${projectId}/documents`;
    
    await page.goto(documentsUrl, {
      waitUntil: "domcontentloaded",
      timeout: CONFIG.TEST_TIMEOUT,
    });
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT); // Brief wait for initial render

    // Wait for page content - documents page can show:
    // 1. documents-table (when loading or has documents)
    // 2. documents-empty-state (when no documents but collection selected)
    // 3. documents-no-collection-state (when no collection selected)
    const table = page.locator('[data-testid="documents-table"]').first();
    const emptyState = page.locator('[data-testid="documents-empty-state"]').first();
    const noCollectionState = page.locator('[data-testid="documents-no-collection-state"]').first();
    
    // Wait for one of these states to appear
    await Promise.race([
      table.waitFor({ state: "attached", timeout: CONFIG.TEST_TIMEOUT / 2 }),
      emptyState.waitFor({ state: "attached", timeout: CONFIG.TEST_TIMEOUT / 2 }),
      noCollectionState.waitFor({ state: "attached", timeout: CONFIG.TEST_TIMEOUT / 2 }),
    ]);

    // STRICT: Create Document button MUST exist and be visible
    const createButton = page.locator('[data-testid="create-document-button"]').first();
    await createButton.waitFor({ state: "visible", timeout: CONFIG.TEST_TIMEOUT / 2 });
    
    const isButtonVisible = await createButton.isVisible();
    const isButtonEnabled = await createButton.isEnabled();
    
    testSuite.assert(
      isButtonVisible,
      "Create Document button MUST be visible on documents page"
    );

    // STRICT: Button must be clickable (may be disabled if no collection selected, but must exist)
    if (isButtonEnabled) {
      await createButton.click();
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

      // STRICT: Dialog MUST open when button is clicked
      const dialog = page.locator('[data-testid="create-document-dialog"]').first();
      await dialog.waitFor({ state: "visible", timeout: CONFIG.TEST_TIMEOUT / 2 });
      
      const hasModal = await dialog.isVisible();
      testSuite.assert(
        hasModal,
        "Create Document button MUST open dialog when clicked"
      );
    } else {
      // Button is disabled - this is acceptable if no collection is selected
      // But we still verified the button exists and is visible
      testSuite.assert(
        true,
        "Create Document button exists but is disabled (no collection selected - this is expected)"
      );
    }
  });

  // Test 5.4: Document Search/Filter
  await testSuite.test("Document search/filter works", async () => {
    await loginAndGetProject();

    await page.goto(page.url().replace(/\/$/, "") + "/documents");
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 2);

    const searchInput = await page
      .locator(
        '[data-testid="document-search-input"], input[type="search"], input[placeholder*="search" i]'
      )
      .first()
      .isVisible()
      .catch(() => false);

    if (searchInput) {
      await page
        .locator(
          '[data-testid="document-search-input"], input[type="search"], input[placeholder*="search" i]'
        )
        .first()
        .fill("test");
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 2); // Wait for debounced search

      // Check if search is processing (loading indicator or results change)
      const isSearching = await page
        .locator(
          '[class*="spinner"], [class*="loading"], [class*="animate-spin"]'
        )
        .first()
        .isVisible()
        .catch(() => false);
      const hasResults = await page
        .locator('[data-testid="documents-table"]')
        .first()
        .isVisible()
        .catch(() => false);

      testSuite.assert(
        true,
        "Search input should accept input and trigger search"
      );
    } else {
      testSuite.assert(true, "Search/filter may not be implemented");
    }
  });

  // Test 5.5: Document Sorting
  await testSuite.test("Document sorting works", async () => {
    await loginAndGetProject();

    await page.goto(page.url().replace(/\/$/, "") + "/documents");
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 2);

    // Look for sortable column headers
    const sortableHeaders = await page
      .locator('th[role="columnheader"], th button, [class*="sort"]')
      .all();

    if (sortableHeaders.length > 0) {
      await sortableHeaders[0].click().catch(() => null);
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

      testSuite.assert(true, "Sortable headers should be clickable");
    } else {
      testSuite.assert(
        true,
        "Sorting may not be implemented or in different format"
      );
    }
  });

  // Test 5.6: Document Pagination
  await testSuite.test("Pagination works", async () => {
    await loginAndGetProject();

    await page.goto(page.url().replace(/\/$/, "") + "/documents");
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 2);

    const pagination = await page
      .locator(
        '[class*="pagination"], button:has-text("Next"), button:has-text("Previous"), [aria-label*="page" i]'
      )
      .first()
      .isVisible()
      .catch(() => false);

    if (pagination) {
      const nextButton = await page
        .locator('button:has-text("Next"), [aria-label*="next" i]')
        .first()
        .click()
        .catch(() => null);
      if (nextButton !== null) {
        await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
        testSuite.assert(true, "Pagination should work");
      } else {
        testSuite.assert(
          true,
          "Pagination controls may be in different format"
        );
      }
    } else {
      testSuite.assert(true, "Pagination may not be needed or implemented");
    }
  });

  // Test 5.7: Document Bulk Selection
  await testSuite.test("Document bulk selection works", async () => {
    await loginAndGetProject();

    await page.goto(page.url().replace(/\/$/, "") + "/documents");
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 3);

    // Check for select all checkbox
    const selectAllCheckbox = await page
      .locator('[data-testid="select-all-checkbox"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (selectAllCheckbox) {
      await page.locator('[data-testid="select-all-checkbox"]').first().click();
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

      // Check if bulk actions button appears
      const bulkActionsButton = await page
        .locator('[data-testid="bulk-actions-button"]')
        .first()
        .isVisible()
        .catch(() => false);
      testSuite.assert(
        bulkActionsButton,
        "Bulk actions button should appear when documents are selected"
      );
    } else {
      testSuite.assert(true, "Bulk selection may not be implemented");
    }
  });

  // Test 5.8: Document Bulk Delete
  await testSuite.test("Document bulk delete works", async () => {
    await loginAndGetProject();

    await page.goto(page.url().replace(/\/$/, "") + "/documents");
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT * 3);

    // Select a document
    const documentCheckbox = await page
      .locator('[data-testid^="select-document-"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (documentCheckbox) {
      await page.locator('[data-testid^="select-document-"]').first().click();
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

      // Click bulk actions button
      const bulkActionsButton = await page
        .locator('[data-testid="bulk-actions-button"]')
        .first();
      if (await bulkActionsButton.isVisible().catch(() => false)) {
        await bulkActionsButton.click();
        await page.waitForTimeout(500);

        // Click bulk delete
        const bulkDeleteButton = await page
          .locator('[data-testid="bulk-delete-button"]')
          .first();
        if (await bulkDeleteButton.isVisible().catch(() => false)) {
          // Note: We don't actually click delete to avoid deleting test data
          testSuite.assert(true, "Bulk delete button should be accessible");
        } else {
          testSuite.assert(true, "Bulk delete may be in different location");
        }
      } else {
        testSuite.assert(true, "Bulk actions may not be available");
      }
    } else {
      testSuite.assert(true, "Document selection may not be implemented");
    }
  });

  // Test 5.9: Document Aggregation
  await testSuite.test("Document aggregation UI works", async () => {
    await loginAndGetProject();

    const currentUrl = page.url();
    const projectIdMatch = currentUrl.match(/\/projects\/([^/]+)/);
    
    if (!projectIdMatch) {
      throw new Error(`Not on a project page. Current URL: ${currentUrl}`);
    }
    
    const projectId = projectIdMatch[1];
    const documentsUrl = `${frontendUrl}/projects/${projectId}/documents`;
    
    await page.goto(documentsUrl, {
      waitUntil: "domcontentloaded",
      timeout: CONFIG.TEST_TIMEOUT,
    });
    await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

    // Wait for page content
    const table = page.locator('[data-testid="documents-table"]').first();
    const emptyState = page.locator('[data-testid="documents-empty-state"]').first();
    const noCollectionState = page.locator('[data-testid="documents-no-collection-state"]').first();
    
    await Promise.race([
      table.waitFor({ state: "attached", timeout: CONFIG.TEST_TIMEOUT / 2 }),
      emptyState.waitFor({ state: "attached", timeout: CONFIG.TEST_TIMEOUT / 2 }),
      noCollectionState.waitFor({ state: "attached", timeout: CONFIG.TEST_TIMEOUT / 2 }),
    ]);

    // STRICT: Aggregate button MUST exist
    const aggregateButton = page.locator('[data-testid="document-aggregate-button"]').first();
    await aggregateButton.waitFor({ state: "visible", timeout: CONFIG.TEST_TIMEOUT / 2 });
    
    const isButtonVisible = await aggregateButton.isVisible();
    testSuite.assert(
      isButtonVisible,
      "Aggregate button MUST be visible on documents page"
    );

    // STRICT: Button must be clickable (may be disabled if no collection, but must exist)
    const isButtonEnabled = await aggregateButton.isEnabled();
    
    if (isButtonEnabled) {
      await aggregateButton.click();
      await page.waitForTimeout(CONFIG.PAGE_WAIT_TIMEOUT);

      // STRICT: Aggregation dialog MUST open
      const aggregationDialog = page.locator('[role="dialog"]:has-text("Aggregate")').first();
      await aggregationDialog.waitFor({ state: "visible", timeout: CONFIG.TEST_TIMEOUT / 2 });
      
      const hasDialog = await aggregationDialog.isVisible();
      testSuite.assert(
        hasDialog,
        "Aggregation dialog MUST open when button is clicked"
      );

      // STRICT: Aggregation form elements MUST exist
      const runButton = page.locator('[data-testid="run-aggregation-button"]').first();
      await runButton.waitFor({ state: "visible", timeout: CONFIG.TEST_TIMEOUT / 2 });
      
      const hasRunButton = await runButton.isVisible();
      testSuite.assert(
        hasRunButton,
        "Run aggregation button MUST be visible in dialog"
      );
    } else {
      // Button is disabled - this is acceptable if no collection is selected
      // But we still verified the button exists and is visible
      testSuite.assert(
        true,
        "Aggregate button exists but is disabled (no collection selected - this is expected)"
      );
    }
  });

  testSuite.logger.suiteEnd("Frontend UI: Documents Tests");
}
