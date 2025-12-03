<!-- 1eb1f9fa-25f1-42d3-9033-497f21f83f41 1bac4eb5-865c-4a92-8d38-0105a416b178 -->
# SDK Functionality Comprehensive Audit Plan

## Overview

This plan ensures complete 1:1 mapping across all layers: SDK methods, backend endpoints, frontend API routes, test coverage, and WebUI components. The goal is to verify that every SDK functionality is properly implemented and accessible through a code-free WebUI.

---

## Phase 1: SDK Service Inventory (Read-Only Analysis)

Create a complete inventory of all SDK services and their methods by analyzing `index.d.ts`.

### SDK Services to Audit (16 total):

| Service | Adapter Class | Primary Functions |
|---------|---------------|-------------------|
| auth | AuthAdapter | login, logout, validateSession, refreshSession, changePassword |
| projects | ProjectsAdapter | create, get, getAll, update, delete, getStats, getSettings |
| collections | CollectionsAdapter | create, get, getAll, update, delete, getStats, validateSchema |
| documents | DocumentsAdapter | create, get, getAll, update, delete, search, aggregate, bulk ops |
| storage | StorageAdapter | upload, download, delete, getInfo, getStats, move, copy, versions |
| users | UsersAdapter | create, get, getAll, update, delete, permissions |
| email | EmailAdapter | send, sendTemplate, getConfig, updateConfig, getAnalytics, templates |
| admin | AdminAdapter | getUsers, createUser, updateUser, deleteUser, getSettings |
| system | SystemAdapter | getInfo, getSettings, updateSettings |
| health | HealthAdapter | check, runDiagnostics |
| backup | BackupAdapter | createProject, createSystem, list, delete, restore |
| mcp | MCPAdapter | chat, getModels, getCapabilities |
| activity | ActivityAdapter | log, query, getRecent, getStats, cleanup |
| changelog | ChangelogAdapter | getProjectChangelog, getCollectionChangelog, getDocumentChangelog |
| testing | TestingAdapter | createTestProject, cleanup, runTests, seedData |
| apiKeys | (inline object) | getAll, get, create, update, delete, regenerate |
| database | (inline object) | healthCheck, autoFix, validateSchema |

---

## Phase 2: Backend Endpoint Mapping

For each SDK method, verify a corresponding backend endpoint exists.

### Files to Audit:

**Controllers:**

- [backend-server/src/controllers/auth.controller.ts](backend-server/src/controllers/auth.controller.ts)
- [backend-server/src/controllers/project.controller.ts](backend-server/src/controllers/project.controller.ts)
- [backend-server/src/controllers/collections.controller.ts](backend-server/src/controllers/collections.controller.ts)
- [backend-server/src/controllers/storage.controller.ts](backend-server/src/controllers/storage.controller.ts)
- [backend-server/src/controllers/users.controller.ts](backend-server/src/controllers/users.controller.ts)
- [backend-server/src/controllers/email.controller.ts](backend-server/src/controllers/email.controller.ts)
- [backend-server/src/controllers/admin.controller.ts](backend-server/src/controllers/admin.controller.ts)
- [backend-server/src/controllers/system.controller.ts](backend-server/src/controllers/system.controller.ts)
- [backend-server/src/controllers/testing.controller.ts](backend-server/src/controllers/testing.controller.ts)

**Routes:**

- [backend-server/src/routes/index.ts](backend-server/src/routes/index.ts) - Main router

### Expected Gaps to Investigate:

- Backup endpoints (partially implemented based on test failures)
- System info endpoint (404 in tests)
- Health diagnostics endpoint (404 in tests)
- Queue metrics endpoint (404 in tests)
- MCP chat endpoints

---

## Phase 3: Frontend API Route Mapping

Verify frontend routes proxy all SDK methods to backend.

### Key Frontend Route Directories:

- `frontend-manager/app/api/krapi/k1/` - Main API routes
- `frontend-manager/app/api/projects/` - Project-specific routes
- `frontend-manager/app/api/auth/` - Authentication routes

### Known Gaps from Test Suite:

- `/krapi/k1/health/diagnostics` - Returns 404
- `/krapi/k1/system/info` - Returns 404
- `/krapi/k1/queue/metrics` - Returns 404
- `/krapi/k1/activity/stats` - Returns 404
- Backup routes - Returns 404/500

---

## Phase 4: Test Suite Coverage Audit

Verify every SDK method has corresponding test coverage.

### File to Audit:

- [KRAPI-COMPREHENSIVE-TEST-SUITE/comprehensive-unified-test.js](KRAPI-COMPREHENSIVE-TEST-SUITE/comprehensive-unified-test.js)

### Test Suites Present (from test run):

1. Authentication Tests
2. Project Management Tests
3. SDK Client Tests
4. SDK Integration Tests
5. Collection Management Tests
6. Document CRUD Tests
7. Storage Tests
8. Email Tests
9. API Key Tests
10. User Management Tests
11. Activity Logging Tests
12. Metadata Management Tests
13. Performance Monitoring Tests
14. Database Queue Tests
15. SDK API Endpoint Tests
16. MCP Server Tests
17. Backup Tests
18. CMS Integration Tests

### Tests Currently Skipped (due to missing endpoints):

- Get activity logs via SDK (timeout)
- Get activity stats via SDK (404)
- Get metadata schema via SDK (404)
- Get performance metrics via SDK (404)
- Get queue metrics via SDK health (404)
- Queue metrics in health endpoint (404)
- Performance metrics via SDK diagnostics (404)
- Test SDK system info (404)
- All backup tests (404/500)

---

## Phase 5: WebUI Component Audit

Verify UI pages exist for every SDK functionality.

### Current WebUI Pages:

| Page | Path | SDK Services Used |
|------|------|-------------------|
| Dashboard | `/dashboard` | projects, health |
| Projects List | `/projects` | projects.getAll |
| Project Detail | `/projects/[id]` | projects.get, stats |
| Collections | `/projects/[id]/collections` | collections.* |
| Documents | `/projects/[id]/documents` | documents.* |
| Files/Storage | `/projects/[id]/files` | storage.* |
| Users | `/projects/[id]/users` | users.* |
| API Keys | `/projects/[id]/api-keys` | apiKeys.* |
| Email | `/projects/[id]/email` | email.* |
| Backup | `/projects/[id]/backup` | backup.* |
| Changelog | `/projects/[id]/changelog` | changelog.* |
| MCP | `/projects/[id]/mcp` | mcp.* |
| Settings | `/projects/[id]/settings` | projects.getSettings |
| Profile | `/profile` | auth.me |
| Global Users | `/users` | admin.getUsers |
| Global Settings | `/settings` | system.* |

### Missing UI Components to Implement:

1. **Activity Logs Page** - View and filter activity logs
2. **System Health Dashboard** - Health checks, diagnostics
3. **Database Management** - Schema validation, auto-fix
4. **Testing Dashboard** - Run tests, view results
5. **Performance Metrics** - Queue metrics, performance stats
6. **Bulk Operations UI** - Bulk document/file operations
7. **Email Templates Manager** - Create/edit templates
8. **Backup Restore UI** - Restore from backups

---

## Phase 6: Implementation Tasks

### 6.1 Fix Test Runner Exit Code Issue

- File: [KRAPI-COMPREHENSIVE-TEST-SUITE/comprehensive-test-runner.js](KRAPI-COMPREHENSIVE-TEST-SUITE/comprehensive-test-runner.js)
- Issue: `killProcessOnPort()` causing unhandled rejection
- Fix: Add proper error handling for process cleanup

### 6.2 Implement Missing Backend Endpoints

Priority order:

1. Health diagnostics endpoint
2. System info endpoint
3. Activity stats endpoint
4. Queue metrics endpoint
5. Backup endpoints (full implementation)

### 6.3 Implement Missing Frontend Routes

For each missing backend endpoint, create corresponding frontend route.

### 6.4 Add Missing Test Coverage

Update test suite to cover any newly implemented endpoints.

### 6.5 Implement Missing WebUI Components

Create UI pages/modals for:

1. Activity logs viewer with filters
2. System health dashboard
3. Database management panel
4. Testing dashboard
5. Performance metrics dashboard
6. Email templates manager
7. Backup restore interface

---

## Deliverables

1. **SDK-Backend-Frontend Mapping Document** - Complete matrix showing all SDK methods and their implementation status
2. **Gap Analysis Report** - List of missing implementations with priority
3. **Fixed Test Runner** - Exit code bug resolved
4. **Implemented Missing Endpoints** - Backend + Frontend
5. **Complete WebUI** - All SDK functionalities accessible via UI
6. **Updated Test Suite** - 100% SDK coverage

---

## Success Criteria

- All 79+ tests pass with exit code 0
- Every SDK method has backend endpoint + frontend route
- Every SDK functionality has WebUI component
- No 404 errors for any SDK method
- Code-free interaction with all KRAPI features via WebUI

### To-dos

- [ ] Fix users.controller.ts to use SDK methods instead of DatabaseService
- [ ] Review auth.middleware.ts - verify if DatabaseService usage is acceptable for middleware
- [ ] Fix frontend apikeys/route.ts - replace direct fetch with SDK method
- [ ] Check all project handlers for DatabaseService usage
- [ ] Add missing last_used_at column to sessions table for SDK compatibility
- [ ] Add last_used_at column migration to createEssentialTables and fixMissingColumns
- [ ] Ensure fixMissingColumns is called after table creation to add last_used_at column
- [ ] Fix fixMissingColumns to handle duplicate column errors gracefully so it completes even if some columns already exist
- [ ] Add clear messaging about quick mode vs comprehensive mode in test suite
- [ ] Fixed session validation in auth middleware - SDK returns session object directly, not { valid: boolean }
- [ ] Fixed bulk delete documents handler - SDK returns array of booleans, not object with success/deleted_count
- [ ] Updated test suite logging to always show total expected tests (79) even in quick mode
- [ ] Bulk delete test now passing after SDK hotfix - SQL query bug fixed
- [ ] Fixed project_users table schema to include SDK-required columns and added automatic migration
- [ ] Fixed SDKUsersService to delegate getUserByEmail, getUserByUsername, and getUserById to actual SDK service
- [ ] Fixed createUser in SDKUsersService to pass permissions and createdBy to SDK
- [ ] Fixed test email collision by cleaning up existing test users before creating new ones
- [ ] Fixed test count display to always show 79 total tests in summary
- [ ] Improved database cleanup to delete all project databases and WAL/SHM files
- [ ] Improved database cleanup to industry-standard with retry logic, verification, and comprehensive file deletion
- [ ] Continue running tests and fixing issues
- [ ] Fix backend duplicate column error in fixMissingColumns method
- [ ] Fix syntax error in test file (remove 'as' type assertions)
- [ ] Investigate why backend logging isn't showing in test results - verify backend rebuild and restart
- [ ] Fix test runner exit code issue in killProcessOnPort()
- [ ] Create complete SDK method inventory from index.d.ts
- [ ] Audit backend endpoints against SDK inventory
- [ ] Audit frontend routes against SDK inventory
- [ ] Audit test suite coverage against SDK inventory
- [ ] Audit WebUI pages against SDK functionality requirements
- [ ] Implement missing backend endpoints (health, system, activity, backup)
- [ ] Implement missing frontend routes for new backend endpoints
- [ ] Implement missing WebUI components (activity, health, testing, etc.)
- [ ] Update test suite to cover all implementations
- [ ] Run comprehensive tests and verify 100% pass rate with exit code 0