import "@testing-library/jest-dom";

// Setup environment polyfills
if (typeof global !== "undefined") {
  // Only polyfill if not already available
  if (typeof global.TextEncoder === "undefined") {
    // Use dynamic import to avoid type conflicts
    import("util").then(
      ({ TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder }) => {
        (
          global as {
            TextEncoder: typeof NodeTextEncoder;
            TextDecoder: typeof NodeTextDecoder;
          }
        ).TextEncoder = NodeTextEncoder;
        (
          global as {
            TextEncoder: typeof NodeTextEncoder;
            TextDecoder: typeof NodeTextDecoder;
          }
        ).TextDecoder = NodeTextDecoder;
      }
    );
  }
}

// Setup fetch mock
global.fetch = jest.fn();

// Setup console mocks for clean test output
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  // eslint-disable-next-line no-console
  console.error = jest.fn();
  // eslint-disable-next-line no-console
  console.warn = jest.fn();
});

afterEach(() => {
  // eslint-disable-next-line no-console
  console.error = originalError;
  // eslint-disable-next-line no-console
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
