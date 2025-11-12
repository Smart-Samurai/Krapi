# SDK Fixes Needed

This document contains detailed instructions for fixing issues in the `@smartsamurai/krapi-sdk` package that prevent the KRAPI application from working correctly.

## Status

**Last Tested:** 2025-11-12T10:39:57Z  
**Test Results:** 70/70 tests passing (100.0% success rate)  
**Issue Status:** ✅ **ALL ISSUES RESOLVED** - All tests passing!

**SDK Version Tested:** `0.1.6` (installed version from pnpm-lock.yaml)  
**Package.json Specifies:** `latest`

**Status Update:**

- ✅ SDK client can create document - **PASSING** (fixed in SDK 0.1.6)
- ✅ SDK client can list documents - **PASSING** (fixed in SDK 0.1.6)
- ✅ Get project user by ID - **PASSING** (fixed frontend route URL)
- ✅ Update project user scopes - **PASSING** (fixed frontend route URL)
- ✅ Create project user - **PASSING** (fixed frontend route URL)

**Fixes Applied:**

1. **SDK Fix (v0.1.6):** SDK documents module endpoint construction fixed
2. **Test Code Fix:** Updated to prefer collection name over collection ID
3. **Frontend Route Fixes:** Fixed incorrect backend URLs in user management routes:
   - Fixed `/krapi/k1/users/${projectId}/users/${userId}` → `/krapi/k1/projects/${projectId}/users/${userId}`
   - Fixed `/krapi/k1/users/${projectId}/users` → `/krapi/k1/projects/${projectId}/users`
   - Fixed scopes route URL
4. **Backend Route Fix:** Updated usersRoutes mounting from `/users` to `/projects` to match route structure

## Critical Issue: Documents Module Endpoint Construction

### Problem Summary

The `krapi.documents.create()` and `krapi.documents.getAll()` methods in the SDK singleton are returning **404 "Endpoint not found"** errors. The SDK is not constructing the correct endpoint URLs for document operations.

### Error Details

**Test Results:**

- Test: "SDK client can create document"
- Error: `Endpoint not found`
- HTTP Status: `404 Not Found`
- Error Code: `ERR_BAD_REQUEST`

**Test Results:**

- Test: "SDK client can list documents"
- Error: `Endpoint not found`
- HTTP Status: `404 Not Found`
- Error Code: `ERR_BAD_REQUEST`

### Expected Backend API Endpoints

The backend exposes document operations at these endpoints:

**Create Document:**

```
POST /krapi/k1/projects/:projectId/collections/:collectionName/documents
```

**List Documents:**

```
GET /krapi/k1/projects/:projectId/collections/:collectionName/documents
```

**Full URL Examples:**

- Create: `http://localhost:3470/krapi/k1/projects/{projectId}/collections/{collectionName}/documents`
- List: `http://localhost:3470/krapi/k1/projects/{projectId}/collections/{collectionName}/documents`

### How Frontend Uses the SDK

The frontend code uses the SDK singleton exactly like this:

```typescript
// From frontend-manager/store/documentsSlice.ts

// Create document
const document = await krapi.documents.create(
  projectId, // string: project UUID
  collectionId, // string: collection name (not ID)
  { data } // object: { data: Record<string, unknown> }
);

// List documents
const documents = await krapi.documents.getAll(
  projectId, // string: project UUID
  collectionId // string: collection name (not ID)
);
```

**Important Notes:**

1. The `collectionId` parameter is actually the **collection name** (string), not the collection UUID
2. The SDK should accept either collection name or collection ID
3. The `create` method expects `{ data: Record<string, unknown> }` as the third parameter
4. The SDK should return the Document object directly (not wrapped in `{ success, data }`)

### Current SDK Behavior

The SDK singleton has the methods available:

- `krapi.documents.create` exists
- `krapi.documents.getAll` exists
- `krapi.documents.keys` shows: `create, get, update, delete, getAll, search, bulkCreate, bulkUpdate, bulkDelete, count, aggregate`

However, when called, these methods are constructing incorrect endpoint URLs, resulting in 404 errors.

### Required SDK Fix

The SDK's `documents` module must construct the correct endpoint URLs:

**For `documents.create(projectId, collectionId, { data })`:**

1. Accept `projectId` (string, UUID)
2. Accept `collectionId` (string, can be collection name or UUID - SDK should handle both)
3. Accept `{ data: Record<string, unknown> }` as the third parameter
4. Construct URL: `/krapi/k1/projects/{projectId}/collections/{collectionName}/documents`
5. Make POST request with body: `{ data: ... }`
6. Return Document object directly (not wrapped)

**For `documents.getAll(projectId, collectionId)`:**

1. Accept `projectId` (string, UUID)
2. Accept `collectionId` (string, can be collection name or UUID - SDK should handle both)
3. Construct URL: `/krapi/k1/projects/{projectId}/collections/{collectionName}/documents`
4. Make GET request
5. Return Document[] array directly (not wrapped)

### Implementation Pattern

The SDK should follow the same pattern as the `collections` module, which works correctly:

```typescript
// Collections module (working correctly)
krapi.collections.create(projectId, {
  name: "collection_name",
  description: "...",
  fields: [...]
});

// Documents module (needs fixing)
krapi.documents.create(projectId, collectionName, { data: {...} });
```

### Request/Response Format

**Create Document Request:**

```json
POST /krapi/k1/projects/{projectId}/collections/{collectionName}/documents
Authorization: Bearer {sessionToken}
Content-Type: application/json

{
  "data": {
    "title": "Document Title",
    "value": 42
  }
}
```

**Create Document Response (Backend returns):**

```json
{
  "success": true,
  "id": "document-uuid",
  "collection_id": "collection-uuid",
  "project_id": "project-uuid",
  "data": {
    "title": "Document Title",
    "value": 42
  },
  "version": 1,
  "is_deleted": false,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  "created_by": "user-uuid",
  "updated_by": "user-uuid"
}
```

**SDK Should Return:**
The Document object directly (not wrapped):

```typescript
{
  id: "document-uuid",
  collection_id: "collection-uuid",
  project_id: "project-uuid",
  data: { title: "Document Title", value: 42 },
  version: 1,
  // ... other fields
}
```

**List Documents Response (Backend returns):**

```json
{
  "success": true,
  "data": {
    "documents": [
      { "id": "...", "data": {...}, ... },
      { "id": "...", "data": {...}, ... }
    ],
    "total": 2,
    "page": 1,
    "limit": 10
  }
}
```

**SDK Should Return:**
The documents array directly:

```typescript
[
  { id: "...", data: {...}, ... },
  { id: "...", data: {...}, ... }
]
```

### Authentication

The SDK must include the session token in the Authorization header:

```
Authorization: Bearer {sessionToken}
```

The session token is set via:

```typescript
krapi.auth.setSessionToken(sessionToken);
```

### Test Code Context

The test suite uses the SDK exactly like the frontend:

```javascript
// Test code (KRAPI-COMPREHENSIVE-TEST-SUITE/comprehensive-unified-test.js)

// Initialize SDK (same as frontend)
await this.krapi.connect({
  endpoint: "http://localhost:3470", // Base URL without /krapi/k1
});

// Set session token
this.krapi.auth.setSessionToken(this.sessionToken);

// Create document (same as frontend)
const document = await this.krapi.documents.create(
  this.testProject.id, // "5676bd16-d1d4-4362-9d1d-bf81fb9686fe"
  this.testCollection.id || this.testCollection.name, // "test_collection" or UUID
  { data: { title: "SDK Test Document", value: 42 } }
);

// List documents (same as frontend)
const documents = await this.krapi.documents.getAll(
  this.testProject.id,
  this.testCollection.id || this.testCollection.name
);
```

### Root Cause Analysis

The SDK's `documents` module is likely:

1. Not constructing the full path `/krapi/k1/projects/{projectId}/collections/{collectionName}/documents`
2. Possibly calling `/` or an incomplete path
3. Not handling collection name vs. collection ID correctly

### Verification Steps

After fixing, verify:

1. `krapi.documents.create(projectId, collectionName, { data })` returns a Document object
2. `krapi.documents.getAll(projectId, collectionName)` returns a Document[] array
3. Both methods work with collection names (strings)
4. Both methods work with collection IDs (UUIDs)
5. No 404 errors occur
6. The returned objects match the backend response structure

### Implementation Checklist

- [ ] Fix `documents.create()` endpoint URL construction
- [ ] Fix `documents.getAll()` endpoint URL construction
- [ ] Ensure collection name/ID handling works correctly
- [ ] Ensure request body format matches backend expectations
- [ ] Ensure response parsing returns Document/Document[] directly (not wrapped)
- [ ] Ensure authentication headers are included
- [ ] Test with both collection names and collection IDs
- [ ] Verify no 404 errors occur

### Additional Notes

- The `collections` module works correctly and can be used as a reference
- The frontend successfully uses `krapi.documents.create()` and `krapi.documents.getAll()` when the SDK is fixed
- All other SDK modules (projects, collections) work correctly
- The issue is specific to the `documents` module's endpoint construction
