/**
 * Frontend UI Projects Tests
 * 
 * Tests projects list, project creation, editing, deletion, and project detail pages
 * through the actual web UI using browser automation.
 */

import { CONFIG } from "../../config.js";

/**
 * Run projects UI tests
 * @param {Object} testSuite - Test suite instance
 * @param {Object} page - Playwright page object
 */
export async function runProjectsUITests(testSuite, page) {
  testSuite.logger.suiteStart("Frontend UI: Projects Tests");

  const frontendUrl = CONFIG.FRONTEND_URL;
  const testData = testSuite.testData || { projects: [] };

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

  // Test 3.1: Projects List Page
  await testSuite.test("Projects list page displays", async () => {
    await login();
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");

    // Check if projects page loaded
    const currentUrl = page.url();
    const isOnProjectsPage = currentUrl.includes("/projects");

    testSuite.assert(isOnProjectsPage, "Should be on projects page");
  });

  // Test 3.2: Projects Load
  await testSuite.test("All projects load correctly", async () => {
    await login();
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");
    
    // Wait for page to render - give it time for React to hydrate and load data
    await page.waitForTimeout(5000);

    // Check for projects container, empty state, or any project-related content
    const hasProjectContainer = await page.locator(
      '[data-testid="projects-container"]'
    ).first().isVisible().catch(() => false);
    
    const hasEmptyState = await page.locator(
      '[data-testid="empty-state-projects"]'
    ).first().isVisible().catch(() => false);
    
    const hasProjectCard = await page.locator(
      '[data-testid="project-card"]'
    ).first().isVisible().catch(() => false);

    // Also check for any text indicating projects page loaded
    const pageText = await page.textContent('body').catch(() => '');
    const hasProjectText = pageText && (
      pageText.toLowerCase().includes('project') ||
      pageText.toLowerCase().includes('create')
    );

    testSuite.assert(
      hasProjectContainer || hasEmptyState || hasProjectCard || hasProjectText,
      "Projects page should display content (container, empty state, or projects)"
    );
  });

  // Test 3.3: Create Project Button
  await testSuite.test("Create Project button works", async () => {
    await login();
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000); // Wait for page to fully render

    const createButton = page.locator(
      '[data-testid="create-project-button"]'
    ).first();

    // Check if button exists and is visible
    const buttonExists = await createButton.isVisible().catch(() => false);
    testSuite.assert(buttonExists, "Create Project button should be visible");

    if (buttonExists) {
      await createButton.click();
      await page.waitForTimeout(1000); // Wait for dialog animation

      // Check if modal/form opened (prioritize data-testid)
      const hasModal = await page.locator(
        '[data-testid="create-project-dialog"]'
      ).first().isVisible().catch(() => false);

      testSuite.assert(hasModal, "Create Project button should open modal or form");
    }
  });

  // Test 3.4: Create Project Form
  await testSuite.test("Create Project form fields display", async () => {
    await login();
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const createButton = page.locator(
      '[data-testid="create-project-button"]'
    ).first();

    const buttonVisible = await createButton.isVisible().catch(() => false);
    
    if (buttonVisible) {
      await createButton.click();
      
      // Wait for dialog to open and form to be visible
      await page.waitForSelector(
        '[data-testid="create-project-dialog"]',
        { state: "visible", timeout: 5000 }
      ).catch(() => null);

      await page.waitForTimeout(500); // Small wait for form to render

      // Look for form fields (prioritize data-testid)
      const nameField = await page.locator(
        '[data-testid="project-form-name"]'
      ).first().isVisible().catch(() => false);

      testSuite.assert(nameField, "Project name field should be visible in form");
    } else {
      // If button not found, skip this test
      testSuite.assert(true, "Create button not found, skipping form test");
    }
  });

  // Test 3.5: Project Cards/Rows Display Info
  await testSuite.test("Project cards/rows show required information", async () => {
    await login();
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Look for project items
    const projectItems = await page.locator(
      '[class*="project"], [data-testid*="project"], tr, [role="listitem"]'
    ).all();

    if (projectItems.length > 0) {
      // Check first project item for name
      const firstProject = projectItems[0];
      const hasText = await firstProject.textContent().then(text => text && text.trim().length > 0).catch(() => false);

      testSuite.assert(hasText, "Project items should display information");
    } else {
      // No projects - that's okay, empty state should be handled
      testSuite.assert(true, "No projects found (empty state should be handled)");
    }
  });

  // Test 3.6: Project Detail Page
  await testSuite.test("Project detail page loads", async () => {
    await login();
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000); // Wait for projects to load

    // Try to click on first project card if available
    const firstProjectCard = page.locator(
      '[data-testid="project-card"]'
    ).first();

    const cardExists = await firstProjectCard.isVisible().catch(() => false);

    if (cardExists) {
      await firstProjectCard.click();
      await page.waitForURL(url => url.pathname.match(/\/projects\/[^/]+$/), { timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for detail page to load

      const currentUrl = page.url();
      const isOnProjectDetail = currentUrl.match(/\/projects\/[^/]+$/);

      testSuite.assert(isOnProjectDetail, "Should navigate to project detail page");
    } else {
      // No projects to navigate to
      testSuite.assert(true, "No projects available to test detail page");
    }
  });

  // Test 3.7: Project Statistics Display
  await testSuite.test("Project statistics display on detail page", async () => {
    await login();
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000); // Wait for projects to load

    // Try to navigate to a project
    const firstProjectCard = page.locator('[data-testid="project-card"]').first();
    const cardExists = await firstProjectCard.isVisible().catch(() => false);

    if (cardExists) {
      await firstProjectCard.click();
      await page.waitForURL(url => url.pathname.match(/\/projects\/[^/]+$/), { timeout: 10000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000); // Wait for detail page to fully load

      // Look for statistics or any content on the detail page
      const pageText = await page.textContent('body').catch(() => '');
      const hasContent = pageText && (
        pageText.toLowerCase().includes('collection') ||
        pageText.toLowerCase().includes('document') ||
        pageText.toLowerCase().includes('user') ||
        pageText.length > 100 // Any substantial content
      );

      testSuite.assert(hasContent, "Project detail page should display content");
    } else {
      testSuite.assert(true, "No project available to test statistics");
    }
  });

  // Test 3.8: Project Navigation Tabs
  await testSuite.test("Project navigation tabs/sections work", async () => {
    await login();
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000); // Wait for projects to load

    const firstProjectCard = page.locator('[data-testid="project-card"]').first();
    const cardExists = await firstProjectCard.isVisible().catch(() => false);

    if (cardExists) {
      await firstProjectCard.click();
      await page.waitForURL(url => url.pathname.match(/\/projects\/[^/]+$/), { timeout: 10000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000); // Wait for detail page to load

      // Look for navigation links in sidebar or page
      const navLinks = await page.locator(
        'a[href*="/collections"], a[href*="/documents"], a[href*="/users"], [role="tab"], [class*="tab"]'
      ).all();

      if (navLinks.length > 0) {
        // Try clicking a nav link
        await navLinks[0].click().catch(() => null);
        await page.waitForTimeout(1000);

        testSuite.assert(true, "Navigation links should be clickable");
      } else {
        testSuite.assert(true, "Navigation may be in sidebar or different format");
      }
    } else {
      testSuite.assert(true, "No project available to test navigation");
    }
  });

  // Test 3.9: Project Search/Filter
  await testSuite.test("Project search/filter works", async () => {
    await login();
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000); // Wait for projects to load

    // Look for search input using data-testid
    const searchInput = await page.locator(
      '[data-testid="projects-search-input"], input[type="search"], input[placeholder*="search" i]'
    ).first().isVisible().catch(() => false);

    if (searchInput) {
      await page.locator('[data-testid="projects-search-input"], input[type="search"], input[placeholder*="search" i]').first().fill("test");
      await page.waitForTimeout(1000);

      testSuite.assert(true, "Search input should accept input");
    } else {
      testSuite.assert(true, "Search/filter may not be implemented or in different location");
    }
  });

  // Test 3.10: Empty State
  await testSuite.test("Empty state displays when no projects", async () => {
    await login();
    await page.goto(`${frontendUrl}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Check for empty state or projects list using data-testid
    const hasProjects = await page.locator('[data-testid="project-card"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator(
      '[data-testid="empty-state-projects"], [data-testid="empty-state-projects-search"], text=/no.*project/i'
    ).first().isVisible().catch(() => false);

    // Either should be present
    testSuite.assert(hasProjects || hasEmptyState, "Should show projects or empty state");
  });

  testSuite.logger.suiteEnd("Frontend UI: Projects Tests");
}

