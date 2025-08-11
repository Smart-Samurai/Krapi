module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.{ts,js}", "**/?(*.)+(spec|test).{ts,js}"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.{ts,js}", "!src/**/*.d.ts", "!src/test/**/*"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 10000,
};
