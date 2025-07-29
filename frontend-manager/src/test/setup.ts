/* eslint-disable @typescript-eslint/no-require-imports */
import "@testing-library/jest-dom";

// Setup environment polyfills
if (typeof global !== "undefined") {
  // Only polyfill if not already available
  if (typeof global.TextEncoder === "undefined") {
    // Use require to avoid type conflicts
    const {
      TextEncoder: NodeTextEncoder,
      TextDecoder: NodeTextDecoder,
    } = require("util");
    global.TextEncoder = NodeTextEncoder;
    global.TextDecoder = NodeTextDecoder;
  }
}

// Setup fetch mock
global.fetch = jest.fn();

// Setup console mocks for clean test output
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Set test environment
Object.defineProperty(process.env, "NODE_ENV", {
  value: "test",
  writable: true,
});

// Setup localStorage mock
const localStorageMock: Storage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

global.localStorage = localStorageMock;

// Setup sessionStorage mock
const sessionStorageMock: Storage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

global.sessionStorage = sessionStorageMock;
