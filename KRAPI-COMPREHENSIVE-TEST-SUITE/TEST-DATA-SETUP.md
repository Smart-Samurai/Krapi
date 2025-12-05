# Frontend UI Test Data Setup

## Overview

The frontend UI test suite now includes automatic test data setup and cleanup. This ensures tests have the data they need and the database is reset between test runs.

## Features

### Automatic Test Data Creation

Before running tests, the suite automatically creates:
- **3 Test Projects** (TEST_PROJECT_1, TEST_PROJECT_2, TEST_PROJECT_3)
- **2 Collections** per project (test_collection_1, test_collection_2)
- **15 Documents** total (10 in collection 1, 5 in collection 2)
- **2 Test Users** per project
- **2 API Keys** per project

### Database Reset

Before creating test data, the suite:
1. Logs in as admin
2. Deletes all existing test projects (projects with "TEST_" in name)
3. Cleans up all related data (collections, documents, users, API keys cascade)

### Test Data Access

Tests can access test data via `testSuite.testData`:

```javascript
export async function runProjectsUITests(testSuite, page) {
  const testData = testSuite.testData || { projects: [] };
  const firstProject = testData.projects[0];
  
  // Use test data in tests
  await page.goto(`${frontendUrl}/projects/${firstProject.id}`);
}
```

## Configuration

Test data setup can be controlled via `config.js`:

```javascript
CLEANUP_AFTER_TESTS: true, // Set to false to keep test data after tests
```

## Usage

The test data setup runs automatically when you run:

```bash
pnpm run test:ui
```

## Manual Test Data Management

You can also use the test data setup functions directly:

```javascript
import { 
  setupTestData, 
  resetTestData, 
  createTestProject,
  createTestCollection,
  createTestDocuments 
} from "./tests/frontend-ui/test-data-setup.js";

// Setup all test data
await setupTestData();

// Create a specific test project
const project = await createTestProject("My Test Project");

// Create a collection
const collection = await createTestCollection(project.id, "my_collection");

// Create documents
await createTestDocuments(project.id, collection.name, 10);

// Reset all test data
await resetTestData();
```

## Test Data Structure

```javascript
{
  projects: [
    { id: "...", name: "TEST_PROJECT_1", ... },
    { id: "...", name: "TEST_PROJECT_2", ... },
    { id: "...", name: "TEST_PROJECT_3", ... }
  ],
  collections: [
    { projectId: "...", collection: { name: "test_collection_1", ... } },
    { projectId: "...", collection: { name: "test_collection_2", ... } }
  ],
  documents: [
    { projectId: "...", collectionName: "...", document: { ... } },
    ...
  ],
  users: [
    { projectId: "...", user: { email: "...", ... } },
    ...
  ],
  apiKeys: [
    { projectId: "...", apiKey: { name: "...", ... } },
    ...
  ]
}
```

## Benefits

1. **Consistent Test Environment**: Every test run starts with the same data
2. **No Manual Setup**: Tests automatically have the data they need
3. **Clean State**: Database is reset before each run
4. **Isolated Tests**: Test data is separate from production data
5. **Easy Debugging**: Test data has predictable names and structure

