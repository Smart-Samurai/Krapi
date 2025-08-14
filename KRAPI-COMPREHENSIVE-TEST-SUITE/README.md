# 🧪 KRAPI Comprehensive Test Suite

> **The ultimate testing framework for KRAPI Backend-as-a-Service**

This comprehensive test suite thoroughly validates every aspect of the KRAPI system by performing real database operations and testing all endpoints in a logical sequence.

## 🎯 What This Test Suite Does

### **Real Database Testing**

- Creates actual projects, collections, and documents
- Performs real CRUD operations on live data
- Tests data integrity and relationships
- Validates all API endpoints with real requests
- Cleans up test data automatically after completion

### **Comprehensive Coverage**

- **Authentication & Sessions**: Login, logout, session management, API keys
- **Project Management**: CRUD operations, settings, statistics, activity logs
- **Collections & Schema**: Dynamic schema creation, field types, indexes, validation
- **Documents & Data**: CRUD, bulk operations, filtering, sorting, aggregation
- **Error Handling**: Invalid requests, missing data, permission errors
- **Performance**: Bulk operations, pagination, complex queries

## 🚀 Quick Start

### Prerequisites

- KRAPI backend running on `https://krapi.genortg.pl`
- Database initialized with default admin user (`admin`/`admin123`)
- Node.js 18+ with npm/pnpm

### Installation

```bash
cd KRAPI-COMPREHENSIVE-TEST-SUITE
npm install
# or
pnpm install
```

### Run All Tests

```bash
# Run comprehensive test suite
npm run test
# or
node index.js full
```

### Run Individual Test Suites

```bash
# Authentication tests only
npm run test:auth
node index.js auth

# Project management tests only
npm run test:projects
node index.js projects

# Collections & schema tests only
npm run test:collections
node index.js collections

# Document operations tests only
npm run test:documents
node index.js documents
```

## 📋 Test Phases

### Phase 1: 🔐 Authentication & Session Management

- Admin login with default credentials
- Session token generation and validation
- Session refresh and persistence
- API key authentication (if available)
- Password change functionality
- Logout and session invalidation
- Invalid login attempt handling

### Phase 2: 🎯 Project Management

- Create new projects with settings
- Retrieve project information
- Update project details and settings
- Project pagination and filtering
- Project statistics and activity logs
- Multiple project creation for testing
- Project deletion and cleanup

### Phase 3: 🗂️ Collections & Schema Management

- Create collections with various field types
- Dynamic schema definition and validation
- Index creation and management
- Schema updates and field additions
- Collection statistics and information
- Advanced field types (UUID, JSON, timestamps, etc.)
- Collection name validation and error handling

### Phase 4: 📄 Documents CRUD & Operations

- Single document creation, retrieval, update, delete
- Bulk document operations (create, update, delete)
- Document filtering and querying
- Sorting and pagination
- Document counting and aggregation
- Complex multi-criteria filtering
- Data validation and error handling

### Phase 5: 👥 Users & Permissions _(if implemented)_

- User creation and management
- Role assignment and permissions
- User activity tracking
- User statistics and reporting

### Phase 6: 💾 Storage & File Management _(if implemented)_

- File upload and download
- File metadata and information
- Folder creation and management
- Storage statistics and quotas

### Phase 7: 📧 Email & Communications _(if implemented)_

- Email template management
- Email sending functionality
- Email configuration testing

### Phase 8: 🔑 API Keys Management _(if implemented)_

- API key creation and management
- Key permissions and scopes
- Key regeneration and deletion

### Phase 9: 🏥 Health & System Diagnostics

- System health endpoint testing
- API health verification
- Database connectivity validation

## 🔧 Configuration

### Environment Configuration

Edit `config.js` to customize test settings:

```javascript
export const CONFIG = {
  // URLs
  FRONTEND_URL: "https://krapi.genortg.pl",
  BACKEND_URL: "https://krapi.genortg.pl/api/krapi/k1",

  // Credentials
  ADMIN_CREDENTIALS: {
    username: "admin",
    password: "admin123",
  },

  // Test Settings
  CLEANUP_AFTER_TESTS: true,
  VERBOSE_LOGGING: true,
  TIMEOUT_MS: 30000,
};
```

### Test Data

The test suite creates realistic test data:

- Projects with descriptive names and settings
- Collections with various field types and indexes
- Documents with realistic content and metadata
- Users with different roles and permissions (if supported)
- Files and storage items (if supported)

## 📊 Test Results

### Success Output

```
🚀 KRAPI Comprehensive Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Testing against: https://krapi.genortg.pl
API Endpoint: https://krapi.genortg.pl/api/krapi/k1

🔐 Phase 1: Authentication & Session Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Admin Login with Default Credentials (145ms)
  ✅ Get Current User with Session Token (89ms)
  ✅ Validate Session Token (67ms)
  ✅ Refresh Session Token (123ms)
  ...

📊 Final Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Test Suites: 4
Passed Suites: 4
Failed Suites: 0
Total Duration: 12.3s

🎉 ALL TESTS PASSED!
🚀 KRAPI system is working correctly!
```

### Failure Output

When tests fail, detailed error information is provided:

```
❌ Failed Test Suites:
  • AuthTests
    - Invalid Login Attempts: Expected 401 for wrong password

💥 1 TEST SUITE(S) FAILED!
Please check the detailed error messages above.
```

## 🧹 Cleanup

The test suite automatically cleans up all created resources:

- Deletes all test documents (bulk delete for efficiency)
- Removes all test collections
- Deletes all test projects
- Cleans up any uploaded files (if storage is tested)

Cleanup can be disabled by setting `CLEANUP_AFTER_TESTS: false` in config.

## 🔍 Testing Philosophy

### Real Data Operations

- No mocking or simulation - all operations use real API endpoints
- Creates actual database entries to verify data persistence
- Tests data relationships and integrity constraints
- Validates business logic with realistic scenarios

### Comprehensive Validation

- Tests both success and failure scenarios
- Validates data types and structure
- Checks error handling and edge cases
- Verifies pagination, filtering, and sorting
- Tests bulk operations and performance

### Progressive Testing

- Each phase builds on the previous phase
- Authentication is required for all subsequent tests
- Projects are needed for collections testing
- Collections are needed for documents testing
- Realistic dependency chain validation

## 🐛 Troubleshooting

### Common Issues

#### Connection Errors

```bash
# Verify KRAPI is running
curl https://krapi.genortg.pl/health

# Check API endpoint
curl https://krapi.genortg.pl/api/krapi/k1/health
```

#### Authentication Failures

- Verify admin credentials in config.js
- Check if default admin user exists in database
- Ensure admin user has correct permissions

#### Test Failures

- Run individual test suites to isolate issues
- Check detailed error messages in output
- Verify database connectivity and permissions
- Ensure all required endpoints are implemented

### Debug Mode

Enable verbose logging:

```javascript
// In config.js
VERBOSE_LOGGING: true;
```

## 📈 Performance Testing

The test suite includes performance validation:

- Measures response times for all operations
- Tests bulk operations efficiency
- Validates pagination performance
- Monitors resource usage during testing

## 🤝 Contributing

To add new test cases:

1. Create new test file in `tests/` directory
2. Extend `TestFramework` class
3. Add test suite to main runner
4. Update documentation

Example test structure:

```javascript
import TestFramework from "../utils/test-framework.js";

class NewFeatureTests extends TestFramework {
  async runAll() {
    return this.describe("New Feature Tests", async () => {
      await this.test("Test Case Name", async () => {
        // Test implementation
        this.assertTrue(condition, "Error message");
      });
    });
  }
}
```

## 📄 License

MIT License - Part of the KRAPI project

---

**This test suite ensures KRAPI works perfectly with real data and real operations!** 🚀
