/* eslint-disable no-undef */

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
process.env.DATABASE_PATH = ":memory:"; // Use in-memory database for tests

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

// Mock console methods in tests to reduce noise
const originalConsole = console;
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});
