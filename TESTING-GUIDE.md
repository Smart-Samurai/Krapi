# Krapi CMS Testing Guide

This guide provides comprehensive information on testing in the Krapi CMS project, including how to run tests, what they cover, and testing best practices.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Frontend Tests](#frontend-tests)
- [Backend Tests](#backend-tests)
- [Testing Best Practices](#testing-best-practices)
- [Continuous Integration](#continuous-integration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Krapi CMS uses a comprehensive testing strategy with:

- **Frontend**: Jest + React Testing Library for React components and hooks
- **Backend**: Jest + Supertest for API endpoints and services
- **Minimum Coverage**: 80% code coverage requirement
- **Test Types**: Unit tests, integration tests, and component tests

## 🏗️ Test Structure

```
├── admin-frontend/
│   ├── __tests__/
│   │   ├── components/
│   │   │   ├── Header.test.tsx
│   │   │   ├── Sidebar.test.tsx
│   │   │   ├── QueryBuilder.test.tsx
│   │   │   └── UserSettingsModal.test.tsx
│   │   ├── hooks/
│   │   │   ├── useNotification.test.tsx
│   │   │   └── useAuth.test.tsx
│   │   └── utils/
│   │       └── api.test.ts
│   ├── src/test/
│   │   └── setup.ts
│   └── jest.config.js
├── api-server/
│   ├── src/__tests__/
│   │   ├── controllers/
│   │   │   ├── auth.test.ts
│   │   │   ├── api-management.test.ts
│   │   │   ├── content.test.ts
│   │   │   └── users.test.ts
│   │   ├── services/
│   │   │   ├── database.test.ts
│   │   │   └── email.test.ts
│   │   └── middleware/
│   │       ├── auth.test.ts
│   │       └── validation.test.ts
│   ├── src/test/
│   │   └── setup.ts
│   └── jest.config.js
└── TESTING-GUIDE.md
```

## 🚀 Running Tests

### Frontend Tests

```bash
# Navigate to frontend directory
cd admin-frontend

# Install dependencies (if not already done)
pnpm install

# Run all tests
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests in CI mode (single run, no watch)
pnpm test:ci
```

### Backend Tests

```bash
# Navigate to backend directory
cd api-server

# Install dependencies (if not already done)
pnpm install

# Run all tests
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests in CI mode (single run, no watch)
pnpm test:ci
```

### Run All Tests

```bash
# From project root directory
# Run frontend tests
cd admin-frontend && pnpm test:ci && cd ..

# Run backend tests
cd api-server && pnpm test:ci && cd ..

# Generate combined coverage report
echo "Frontend Coverage:" && cd admin-frontend && pnpm test:coverage --silent
echo "Backend Coverage:" && cd api-server && pnpm test:coverage --silent
```

## 📊 Test Coverage

### Coverage Requirements

- **Minimum Coverage**: 80% for all metrics
- **Statements**: ≥80%
- **Branches**: ≥80%
- **Functions**: ≥80%
- **Lines**: ≥80%

### Coverage Reports

Coverage reports are generated in:

- Frontend: `admin-frontend/coverage/`
- Backend: `api-server/coverage/`

Open `coverage/lcov-report/index.html` in your browser for detailed coverage reports.

### Coverage Commands

```bash
# Frontend coverage
cd admin-frontend
pnpm test:coverage
open coverage/lcov-report/index.html

# Backend coverage
cd api-server
pnpm test:coverage
open coverage/lcov-report/index.html
```

## 🎨 Frontend Tests

### Component Tests

Tests for React components using React Testing Library:

**Header Component Tests** (`__tests__/components/Header.test.tsx`):

- ✅ Basic rendering and navigation
- ✅ Search functionality with API integration
- ✅ Notifications dropdown and management
- ✅ User menu and settings modal
- ✅ Mobile responsiveness
- ✅ Keyboard navigation
- ✅ Error handling

**Sidebar Component Tests** (`__tests__/components/Sidebar.test.tsx`):

- ✅ Navigation rendering and active states
- ✅ Collapse/expand functionality
- ✅ Tooltip behavior when collapsed
- ✅ Badge display and styling
- ✅ Category grouping
- ✅ Responsive design
- ✅ Accessibility features

**QueryBuilder Component Tests**:

- ✅ Visual query builder interface
- ✅ Code editor functionality
- ✅ Database schema browser
- ✅ Query execution and results
- ✅ Template loading and saving
- ✅ Error handling and validation

### Hook Tests

**useNotification Hook Tests** (`__tests__/hooks/useNotification.test.tsx`):

- ✅ Success/Error/Warning/Info notifications
- ✅ Auto-removal timers
- ✅ Manual removal and clearing
- ✅ Multiple notification management
- ✅ Error handling utility
- ✅ Input validation

### Running Specific Frontend Tests

```bash
cd admin-frontend

# Run specific test file
pnpm test Header.test.tsx

# Run tests matching pattern
pnpm test --testNamePattern="search functionality"

# Run tests for specific component
pnpm test components/

# Run hook tests only
pnpm test hooks/

# Debug tests with verbose output
pnpm test --verbose
```

## 🔧 Backend Tests

### Controller Tests

**AuthController Tests** (`src/__tests__/controllers/auth.test.ts`):

- ✅ User login with validation
- ✅ JWT token generation
- ✅ Password verification
- ✅ Profile management
- ✅ Account status checking
- ✅ Error handling and security

**ApiManagementController Tests** (`src/__tests__/controllers/api-management.test.ts`):

- ✅ API key CRUD operations
- ✅ Statistics and analytics
- ✅ Rate limiting management
- ✅ Endpoint management
- ✅ Input validation
- ✅ Error handling

### Service Tests

**Database Service Tests**:

- ✅ CRUD operations for all entities
- ✅ Data validation and constraints
- ✅ Transaction handling
- ✅ Error recovery
- ✅ Performance testing

### Middleware Tests

**Authentication Middleware Tests**:

- ✅ JWT token validation
- ✅ Route protection
- ✅ Permission checking
- ✅ Error handling

### Running Specific Backend Tests

```bash
cd api-server

# Run specific test file
pnpm test auth.test.ts

# Run tests matching pattern
pnpm test --testNamePattern="login"

# Run controller tests only
pnpm test controllers/

# Run service tests only
pnpm test services/

# Debug tests with verbose output
pnpm test --verbose

# Run tests with specific timeout
pnpm test --testTimeout=10000
```

## 🎯 Testing Best Practices

### Writing Tests

1. **Test Structure**: Follow AAA pattern (Arrange, Act, Assert)

```typescript
it("should create API key successfully", async () => {
  // Arrange
  const keyData = { name: "Test Key", permissions: ["read"] };
  mockDatabase.createApiKey.mockReturnValue(mockKey);

  // Act
  const response = await request(app).post("/api/keys").send(keyData);

  // Assert
  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
});
```

2. **Descriptive Test Names**: Use clear, descriptive test names

```typescript
// ❌ Bad
it("should work", () => {});

// ✅ Good
it("should return 400 when username is missing from login request", () => {});
```

3. **Mock External Dependencies**: Mock all external dependencies

```typescript
jest.mock("@/lib/api");
jest.mock("next/navigation");
```

4. **Test Edge Cases**: Include edge cases and error scenarios

```typescript
it("should handle empty notification list", () => {});
it("should handle API connection errors", () => {});
it("should handle malformed JSON responses", () => {});
```

5. **Clean Up**: Clean up mocks and state between tests

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### Component Testing Guidelines

1. **Test User Interactions**: Focus on user behavior

```typescript
// Test user clicking, typing, navigation
await user.click(button);
await user.type(input, "test value");
```

2. **Test Accessibility**: Verify accessibility features

```typescript
expect(screen.getByRole("button")).toBeInTheDocument();
expect(screen.getByLabelText("Search")).toBeAccessible();
```

3. **Test Error States**: Verify error handling

```typescript
// Mock API failure
mockApi.get.mockRejectedValue(new Error("Network error"));
expect(screen.getByText("Failed to load data")).toBeInTheDocument();
```

### API Testing Guidelines

1. **Test All HTTP Methods**: Test GET, POST, PUT, DELETE

```typescript
describe("POST /api/keys", () => {});
describe("GET /api/keys", () => {});
describe("PUT /api/keys/:id", () => {});
describe("DELETE /api/keys/:id", () => {});
```

2. **Test Status Codes**: Verify correct HTTP status codes

```typescript
.expect(200) // Success
.expect(201) // Created
.expect(400) // Bad Request
.expect(401) // Unauthorized
.expect(404) // Not Found
.expect(500) // Server Error
```

3. **Test Request/Response**: Verify request handling and response format

```typescript
expect(response.body).toMatchObject({
  success: true,
  data: expect.any(Object),
  message: expect.any(String),
});
```

## 🔄 Continuous Integration

### GitHub Actions Integration

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: cd admin-frontend && pnpm install
      - name: Run tests
        run: cd admin-frontend && pnpm test:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: admin-frontend/coverage

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: cd api-server && pnpm install
      - name: Run tests
        run: cd api-server && pnpm test:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: api-server/coverage
```

### Pre-commit Hooks

Install husky for pre-commit testing:

```bash
# Frontend
cd admin-frontend
pnpm add -D husky lint-staged

# Backend
cd api-server
pnpm add -D husky lint-staged
```

## 🐛 Troubleshooting

### Common Issues

1. **Test Timeout Errors**

```bash
# Increase timeout
pnpm test --testTimeout=10000

# Or in Jest config
module.exports = {
  testTimeout: 10000,
};
```

2. **Mock Not Working**

```typescript
// Ensure mocks are cleared
beforeEach(() => {
  jest.clearAllMocks();
});

// Check mock implementation
expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
```

3. **Async Test Issues**

```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText("Loading...")).toBeInTheDocument();
});

// Use proper async/await
const response = await request(app).get("/api/data");
```

4. **Environment Variables**

```bash
# Set test environment
NODE_ENV=test pnpm test

# Or in test setup
process.env.NODE_ENV = 'test';
```

### Debugging Tests

1. **Debug Mode**

```bash
# Frontend
cd admin-frontend
pnpm test --debug

# Backend
cd api-server
pnpm test --debug
```

2. **Verbose Output**

```bash
pnpm test --verbose
```

3. **Run Single Test**

```bash
pnpm test -- --testNamePattern="specific test name"
```

4. **Watch Mode for Development**

```bash
pnpm test:watch
```

### Performance Tips

1. **Parallel Test Execution**

```javascript
// Jest config
module.exports = {
  maxWorkers: "50%", // Use 50% of available cores
};
```

2. **Test File Patterns**

```bash
# Only run changed files
pnpm test --onlyChanged

# Run tests related to specific files
pnpm test --findRelatedTests src/components/Header.tsx
```

## 📝 Test Reports

### HTML Coverage Reports

After running coverage tests, open these files:

```bash
# Frontend coverage report
open admin-frontend/coverage/lcov-report/index.html

# Backend coverage report
open api-server/coverage/lcov-report/index.html
```

### CI/CD Integration

Tests automatically run on:

- ✅ Pull requests
- ✅ Pushes to main/develop branches
- ✅ Manual workflow dispatch

Coverage reports are uploaded to codecov.io for tracking over time.

## 🎉 Summary

This testing setup provides:

- ✅ **Comprehensive Coverage**: 80%+ code coverage requirement
- ✅ **Multiple Test Types**: Unit, integration, and component tests
- ✅ **Real-world Scenarios**: Tests cover actual user interactions
- ✅ **Error Handling**: Tests include error states and edge cases
- ✅ **Performance**: Fast test execution with parallel processing
- ✅ **CI/CD Ready**: Automated testing in GitHub Actions
- ✅ **Developer Friendly**: Watch mode and debugging support

Run tests regularly during development and ensure all tests pass before committing code!
