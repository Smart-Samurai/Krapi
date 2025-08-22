/**
 * KRAPI Test Suite Configuration
 *
 * This configuration file contains all the settings for testing KRAPI
 * against the production domain https://krapi.genortg.pl
 */

export const CONFIG = {
  // Base URLs for testing - MUST go through frontend
  FRONTEND_URL: "http://localhost:3469",
  FRONTEND_API_URL: "http://localhost:3469/api", // Frontend API endpoints
  BACKEND_URL: "http://localhost:3469/api", // Frontend API endpoints (not proxy)
  DIRECT_BACKEND_URL: "http://localhost:3470", // Direct backend URL for health checks

  // Test credentials
  ADMIN_CREDENTIALS: {
    username: "admin",
    password: "admin123", // Default password
  },

  // Test data
  TEST_PROJECT_NAME: "KRAPI_TEST_PROJECT",
  TEST_COLLECTION_NAME: "test_collection",
  TEST_USER_EMAIL: "test@krapitest.com",

  // Test configuration
  CLEANUP_AFTER_TESTS: true,
  VERBOSE_LOGGING: true,
  TIMEOUT_MS: 5000, // Reduced from 30s to 5s max

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
