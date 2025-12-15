/**
 * KRAPI Test Suite Configuration
 *
 * This configuration file contains all the settings for testing KRAPI
 * against the production domain https://krapi.genortg.pl
 */

export const CONFIG = {
  // ⚠️ IMPORTANT: All tests simulate external third-party applications
  // ALL requests MUST go through the FRONTEND (port 3498), NOT directly to backend (port 3470)
  // This simulates how real external apps would connect to Krapi Server

  // Frontend URL - This is what external apps should use
  // Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues on Windows
  FRONTEND_URL: "http://127.0.0.1:3498", // ✅ Use this for all SDK connections
  FRONTEND_API_URL: "http://127.0.0.1:3498/api", // Frontend API endpoints

  // Backend URL - DO NOT USE in tests (only for internal server-side code)
  // Tests should NEVER connect directly to backend - always go through frontend
  BACKEND_URL: "http://127.0.0.1:3470", // ⚠️ Internal only - not for external clients
  DIRECT_BACKEND_URL: "http://127.0.0.1:3470", // ⚠️ Internal only - not for external clients

  // Test credentials
  ADMIN_CREDENTIALS: {
    username: process.env.DEFAULT_ADMIN_USERNAME || "admin",
    password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123", // Default password
  },

  // Test data
  TEST_PROJECT_NAME: "KRAPI_TEST_PROJECT",
  TEST_COLLECTION_NAME: "test_collection",
  TEST_USER_EMAIL: "test@krapitest.com",

  // Test configuration
  CLEANUP_AFTER_TESTS: true,
  VERBOSE_LOGGING: true,
  TIMEOUT_MS: 5000, // Reduced from 30s to 5s max
  TEST_TIMEOUT: 10000, // Single timeout for all tests - 10 seconds (optimized for speed)
  PAGE_WAIT_TIMEOUT: 300, // Reduced wait time between page operations - 300ms

  // CORS test configuration
  // These origins should be configured as allowed in the app
  CORS_ALLOWED_ORIGINS: [
    "https://test-allowed.example.com",
    "https://app1.example.com",
    "https://app2.example.com",
    "https://app3.example.com",
  ],
  // These origins should be blocked (not in allowed list)
  CORS_DISALLOWED_ORIGINS: [
    "https://malicious-attacker.com",
    "http://evil-site.com",
    "https://unauthorized.example.com",
  ],

  // Test file configuration
  TEST_FILE: {
    name: "test-file.txt",
    content: "This is a test file for KRAPI storage testing",
    mimeType: "text/plain",
  },

  // Email test configuration
  TEST_EMAIL: {
    to: "test@example.com",
    subject: "KRAPI Test Email",
    body: "This is a test email from KRAPI test suite",
  },
};

export default CONFIG;
