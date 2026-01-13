# Comprehensive Test to UI Test Mapping

This document maps all 151 comprehensive tests to their UI test equivalents, documenting required UI actions and test identifiers.

**Date Created:** 2025-12-17  
**Total Comprehensive Tests:** 151  
**Total UI Tests Required:** 151

---

## Test Categories

### 1. Authentication Tests (10 tests)
**Comprehensive File:** `tests/auth.tests.js`  
**UI Test File:** `tests/frontend-ui/auth-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Login with valid credentials via SDK | Login with valid credentials via UI | Navigate to `/login`, fill username, fill password, click submit, verify redirect | `login-username`, `login-password`, `login-submit` |
| 2 | Login with invalid credentials via SDK | Login with invalid credentials via UI | Navigate to `/login`, fill username, fill wrong password, click submit, verify error | `login-username`, `login-password`, `login-submit`, `login-error` |
| 3 | Get current user via SDK | Get current user via UI (profile page) | Navigate to `/profile`, verify user info displayed | `profile-username`, `profile-email`, `profile-role` |
| 4 | Register new user via SDK | Register new user via UI | Navigate to `/register`, fill form, submit, verify success | `register-username`, `register-email`, `register-password`, `register-confirm-password`, `register-submit` |
| 5 | Logout via SDK | Logout via UI | Click logout button, verify redirect to login | `logout-button`, `logout-menu-item` |
| 6 | Refresh session via SDK | Refresh session via UI | Navigate to `/profile`, click refresh button, verify session updated | `refresh-session-button` |
| 7 | Create and authenticate as project user | Create and authenticate as project user via UI | Create user via UI, logout, login as project user, verify access | `users-create-button`, `user-form-username`, `user-form-email`, `user-form-password`, `user-form-submit`, `login-username`, `login-password`, `login-submit` |
| 8 | Project user with limited permissions cannot access restricted resources | Project user permissions enforced in UI | Login as project user, attempt restricted action, verify blocked | Various permission-specific test identifiers |
| 9 | Project user cannot access other projects | Project isolation in UI | Login as project user, attempt to access other project, verify blocked | Project-specific navigation test identifiers |
| 10 | Permission enforcement is strict (no bypass for non-admin users) | Permission enforcement in UI | Test various permission scenarios through UI | Various permission test identifiers |

### 2. Admin Tests (10 tests)
**Comprehensive File:** `tests/admin.tests.js`  
**UI Test File:** `tests/frontend-ui/admin-ui.tests.js` (TO BE CREATED)

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Get all admin users via SDK | List admin users via UI | Navigate to `/users`, verify users list displayed | `admin-users-table`, `admin-users-list` |
| 2 | Get admin user by ID via SDK | View admin user details via UI | Navigate to `/users`, click user, verify details | `admin-users-table`, `admin-user-row-{id}`, `admin-user-details` |
| 3 | Create admin user via SDK | Create admin user via UI | Navigate to `/users`, click create, fill form, submit | `create-admin-user-button`, `admin-user-form-username`, `admin-user-form-email`, `admin-user-form-password`, `admin-user-form-role`, `admin-user-form-submit` |
| 4 | Create admin user with duplicate username should fail | Create duplicate admin user via UI | Attempt to create user with existing username, verify error | `create-admin-user-button`, `admin-user-form-username`, `admin-user-form-submit`, `admin-user-error` |
| 5 | Update admin user via SDK | Update admin user via UI | Navigate to user, click edit, modify fields, save | `admin-user-edit-button`, `admin-user-form-email`, `admin-user-form-submit` |
| 6 | Update non-existent admin user should fail | Update non-existent user via UI | Attempt to edit non-existent user, verify error | Error handling test identifiers |
| 7 | Delete admin user via SDK | Delete admin user via UI | Navigate to user, click delete, confirm, verify deletion | `admin-user-delete-button`, `admin-user-delete-confirm`, `admin-user-delete-cancel` |
| 8 | Delete non-existent admin user should fail | Delete non-existent user via UI | Attempt to delete non-existent user, verify error | Error handling test identifiers |
| 9 | Default admin user cannot be deleted | Default admin deletion blocked in UI | Attempt to delete default admin, verify blocked | `admin-user-delete-button`, `admin-user-delete-error` |
| 10 | Create admin user and authenticate | Create and authenticate admin user via UI | Create user, logout, login as new user, verify | `create-admin-user-button`, `admin-user-form-*`, `logout-button`, `login-*` |

### 3. Projects Tests (8 tests)
**Comprehensive File:** `tests/projects.tests.js`  
**UI Test File:** `tests/frontend-ui/projects-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Create test project via SDK | Create project via UI | Navigate to `/projects`, click create, fill form, submit | `projects-create-button`, `project-form-name`, `project-form-description`, `project-form-submit` |
| 2 | Get all projects via SDK | List projects via UI | Navigate to `/projects`, verify projects list | `projects-list`, `projects-table`, `project-row-{id}` |
| 3 | Get project by ID via SDK | View project details via UI | Click project, verify details page | `project-row-{id}`, `project-details-name`, `project-details-description` |
| 4 | Update project via SDK | Update project via UI | Navigate to project, click edit, modify, save | `project-edit-button`, `project-form-name`, `project-form-submit` |
| 5 | Get project statistics via SDK | View project statistics via UI | Navigate to project, verify stats displayed | `project-stats-card`, `project-stats-collections`, `project-stats-documents` |
| 6 | Get project settings via SDK | View project settings via UI | Navigate to project settings, verify settings displayed | `project-settings-tab`, `project-settings-form` |
| 7 | Update project settings via SDK | Update project settings via UI | Navigate to settings, modify, save | `project-settings-form`, `project-settings-submit` |
| 8 | Get project activity via SDK | View project activity via UI | Navigate to project changelog, verify activity | `project-changelog-tab`, `project-activity-list` |

### 4. Collections Tests (6 tests)
**Comprehensive File:** `tests/collections.tests.js`  
**UI Test File:** `tests/frontend-ui/collections-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Create test collection via SDK | Create collection via UI | Navigate to project collections, click create, fill form, submit | `collections-create-button`, `collection-form-name`, `collection-form-description`, `collection-form-fields`, `collection-form-submit` |
| 2 | Get all collections via SDK | List collections via UI | Navigate to collections, verify list | `collections-list`, `collections-table`, `collection-row-{name}` |
| 3 | Get collection by name via SDK | View collection details via UI | Click collection, verify details | `collection-row-{name}`, `collection-details-name` |
| 4 | Update collection via SDK | Update collection via UI | Navigate to collection, click edit, modify, save | `collection-edit-button`, `collection-form-name`, `collection-form-submit` |
| 5 | Get collection statistics via SDK | View collection statistics via UI | Navigate to collection, verify stats | `collection-stats-card`, `collection-stats-documents` |
| 6 | Validate collection schema via SDK | Validate collection schema via UI | Navigate to collection, click validate, verify results | `collection-validate-button`, `collection-validation-results` |

### 5. Documents Tests (16 tests)
**Comprehensive File:** `tests/documents.tests.js`  
**UI Test File:** `tests/frontend-ui/documents-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Create single document via SDK | Create document via UI | Navigate to documents, click create, fill form, submit | `documents-create-button`, `document-form-data`, `document-form-submit` |
| 2 | Get document by ID via SDK | View document details via UI | Click document, verify details | `document-row-{id}`, `document-details` |
| 3 | Update document via SDK | Update document via UI | Navigate to document, click edit, modify, save | `document-edit-button`, `document-form-data`, `document-form-submit` |
| 4 | Create multiple test documents via SDK | Create multiple documents via UI | Create several documents, verify all created | `documents-create-button`, `document-form-*`, `documents-table` |
| 5 | Get all documents via SDK | List documents via UI | Navigate to documents, verify list | `documents-table`, `document-row-{id}` |
| 6 | Get documents with pagination via SDK | Paginate documents via UI | Navigate to documents, use pagination controls | `documents-pagination`, `documents-page-next`, `documents-page-prev` |
| 7 | Filter documents by status via SDK | Filter documents via UI | Use filter controls, verify filtered results | `documents-filter`, `documents-filter-status` |
| 8 | Sort documents by priority via SDK | Sort documents via UI | Click sort controls, verify sorted | `documents-sort`, `documents-sort-priority` |
| 9 | Count documents via SDK | View document count via UI | Navigate to documents, verify count displayed | `documents-count` |
| 10 | Count documents with filter via SDK | View filtered document count via UI | Apply filter, verify count updated | `documents-filter`, `documents-count` |
| 11 | Bulk create documents via SDK | Bulk create documents via UI | Use bulk create feature, verify created | `documents-bulk-create-button`, `documents-bulk-form`, `documents-bulk-submit` |
| 12 | Bulk update documents via SDK | Bulk update documents via UI | Select documents, use bulk update, verify updated | `documents-bulk-update-button`, `documents-bulk-form`, `documents-bulk-submit` |
| 13 | Bulk delete documents via SDK | Bulk delete documents via UI | Select documents, click bulk delete, confirm | `documents-bulk-delete-button`, `documents-bulk-delete-confirm` |
| 14 | Search documents via SDK | Search documents via UI | Use search input, verify results | `documents-search-input`, `documents-search-button`, `documents-search-results` |
| 15 | Aggregate documents via SDK | Aggregate documents via UI | Navigate to aggregate, configure pipeline, run | `documents-aggregate-button`, `documents-aggregate-form`, `documents-aggregate-run` |
| 16 | Delete document via SDK | Delete document via UI | Click delete on document, confirm, verify deleted | `document-delete-button`, `document-delete-confirm` |

### 6. Users Tests (11 tests)
**Comprehensive File:** `tests/users.tests.js`  
**UI Test File:** `tests/frontend-ui/users-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Get user activity via SDK | View user activity via UI | Navigate to user, view activity tab | `user-activity-tab`, `user-activity-list` |
| 2 | Get user statistics via SDK | View user statistics via UI | Navigate to user, verify stats | `user-stats-card` |
| 3 | Create project user via SDK | Create project user via UI | Navigate to project users, click create, fill form, submit | `users-create-button`, `user-form-username`, `user-form-email`, `user-form-password`, `user-form-role`, `user-form-permissions`, `user-form-submit` |
| 4 | Get project user by ID via SDK | View project user details via UI | Click user, verify details | `user-row-{id}`, `user-details` |
| 5 | List project users via SDK | List project users via UI | Navigate to users, verify list | `users-table`, `user-row-{id}` |
| 6 | Update project user via SDK | Update project user via UI | Navigate to user, click edit, modify, save | `user-edit-button`, `user-form-email`, `user-form-submit` |
| 7 | Update project user permissions via SDK | Update user permissions via UI | Navigate to user, edit permissions, save | `user-permissions-edit`, `user-permissions-form`, `user-permissions-submit` |
| 8 | Create duplicate user via SDK (should fail) | Create duplicate user via UI | Attempt to create duplicate, verify error | `users-create-button`, `user-form-username`, `user-form-submit`, `user-error` |
| 9 | Delete project user via SDK | Delete project user via UI | Click delete, confirm, verify deleted | `user-delete-button`, `user-delete-confirm` |
| 10 | Get user scopes via SDK | View user scopes via UI | Navigate to user, verify scopes | `user-scopes-display` |
| 11 | Update user scopes via SDK | Update user scopes via UI | Edit scopes, save, verify updated | `user-scopes-edit`, `user-scopes-form`, `user-scopes-submit` |

### 7. Storage Tests (3 tests)
**Comprehensive File:** `tests/storage.tests.js`  
**UI Test File:** `tests/frontend-ui/storage-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Get storage stats via SDK | View storage statistics via UI | Navigate to storage, verify stats | `storage-stats-card`, `storage-stats-total`, `storage-stats-used` |
| 2 | List storage files via SDK | List files via UI | Navigate to files, verify file list | `files-list`, `file-row-{id}`, `file-name-{id}` |
| 3 | Get file URL via SDK | Get file URL via UI | Click file, verify URL or download | `file-download-button-{id}`, `file-url-button-{id}` |

### 8. Email Tests (5 tests)
**Comprehensive File:** `tests/email.tests.js`  
**UI Test File:** `tests/frontend-ui/email-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Get email configuration via SDK | View email configuration via UI | Navigate to email settings, verify config | `email-config-tab`, `email-config-form` |
| 2 | Test email connection via SDK | Test email connection via UI | Click test button, verify result | `test-email-button`, `email-test-result` |
| 3 | Update email configuration via SDK | Update email configuration via UI | Modify config, save, verify updated | `email-config-form`, `email-config-submit` |
| 4 | Get email templates via SDK | List email templates via UI | Navigate to templates, verify list | `email-templates-tab`, `email-templates-list`, `email-template-row-{id}` |
| 5 | Send email via SDK | Send email via UI | Use send email feature, verify sent | `email-send-button`, `email-send-form`, `email-send-submit` |

### 9. API Keys Tests (3 tests)
**Comprehensive File:** `tests/api-keys.tests.js`  
**UI Test File:** `tests/frontend-ui/api-keys-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | List API keys via SDK | List API keys via UI | Navigate to API keys, verify list | `api-keys-list`, `api-key-row-{id}` |
| 2 | Create API key via SDK | Create API key via UI | Click create, fill form, submit | `api-keys-create-button`, `api-key-form-name`, `api-key-form-permissions`, `api-key-form-submit` |
| 3 | Validate API key via SDK | Validate API key via UI | Use validate feature, verify result | `api-key-validate-button`, `api-key-validation-result` |

### 10. Backup Tests (5 tests)
**Comprehensive File:** `tests/backup.tests.js`  
**UI Test File:** `tests/frontend-ui/backup-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Create project backup via SDK | Create project backup via UI | Navigate to backup, click create, verify created | `backup-create-button`, `backup-create-confirm` |
| 2 | List project backups via SDK | List backups via UI | Navigate to backup, verify list | `backups-list`, `backup-row-{id}` |
| 3 | List all backups via SDK | List all backups via UI | Navigate to system backups, verify list | `system-backups-list` |
| 4 | Create system backup via SDK | Create system backup via UI | Click create system backup, verify | `system-backup-create-button` |
| 5 | Delete backup via SDK | Delete backup via UI | Click delete, confirm, verify deleted | `backup-delete-button-{id}`, `backup-delete-confirm` |

### 11. Settings Tests
**Comprehensive File:** Various (sdk-api.tests.js, health.tests.js)  
**UI Test File:** `tests/frontend-ui/settings-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Get system settings via SDK | View system settings via UI | Navigate to settings, verify settings | `settings-tab`, `settings-form` |
| 2 | Update system settings via SDK | Update system settings via UI | Modify settings, save | `settings-form`, `settings-submit` |
| 3 | Test system info via SDK | View system info via UI | Navigate to system info, verify info | `system-info-tab`, `system-info-display` |

### 12. MCP Tests (6 tests)
**Comprehensive File:** `tests/mcp.tests.js`  
**UI Test File:** `tests/frontend-ui/mcp-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | MCP admin.chat method exists | MCP admin chat via UI | Use admin chat interface, verify works | `mcp-admin-chat-input`, `mcp-admin-chat-send` |
| 2 | MCP projects.chat method exists | MCP project chat via UI | Use project chat, verify works | `mcp-project-chat-input`, `mcp-project-chat-send` |
| 3 | MCP modelCapabilities method exists | MCP model capabilities via UI | View model capabilities, verify displayed | `mcp-models-capabilities` |
| 4 | MCP models method exists | MCP models list via UI | View models list, verify displayed | `mcp-models-list` |
| 5 | MCP admin.chat returns response structure | MCP admin chat response via UI | Send message, verify response structure | `mcp-admin-chat-response` |
| 6 | MCP projects.chat returns response structure | MCP project chat response via UI | Send message, verify response | `mcp-project-chat-response` |

### 13. Activity Tests (6 tests)
**Comprehensive File:** `tests/activity.tests.js`  
**UI Test File:** `tests/frontend-ui/activity-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Get activity logs via SDK | View activity logs via UI | Navigate to activity, verify logs | `activity-logs-list`, `activity-log-row-{id}` |
| 2 | Get activity stats via SDK | View activity statistics via UI | Navigate to activity, verify stats | `activity-stats-card` |
| 3 | Get recent activity via SDK | View recent activity via UI | Navigate to activity, verify recent items | `activity-recent-list` |
| 4 | Get user activity timeline via SDK | View user activity timeline via UI | Navigate to user activity, verify timeline | `user-activity-timeline` |
| 5 | Log activity via SDK | Log activity via UI | Perform action, verify logged | Various action test identifiers |
| 6 | Cleanup activity logs via SDK | Cleanup activity logs via UI | Use cleanup feature, verify cleaned | `activity-cleanup-button` |

### 14. Changelog Tests (1 test)
**Comprehensive File:** `tests/changelog.tests.js`  
**UI Test File:** `tests/frontend-ui/activity-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Get project changelog via SDK | View project changelog via UI | Navigate to project changelog, verify displayed | `project-changelog-tab`, `changelog-list`, `changelog-entry-{id}` |

### 15. Transactions Tests (4 tests)
**Comprehensive File:** `tests/transactions.tests.js`  
**UI Test File:** `tests/frontend-ui/transactions-ui.tests.js` (TO BE CREATED)

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Transaction rollback on failure | Transaction rollback via UI | Perform multi-step operation that fails, verify rollback | Various operation test identifiers |
| 2 | Multi-step operation data consistency | Multi-step operation via UI | Perform multi-step operation, verify consistency | Various operation test identifiers |
| 3 | Concurrent operation data integrity | Concurrent operations via UI | Perform concurrent operations, verify integrity | Various operation test identifiers |
| 4 | Unique constraint enforcement | Unique constraint via UI | Attempt duplicate creation, verify blocked | Various form test identifiers with error handling |

### 16. Concurrency Tests (4 tests)
**Comprehensive File:** `tests/concurrency.tests.js`  
**UI Test File:** `tests/frontend-ui/concurrency-ui.tests.js` (TO BE CREATED)

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Concurrent document creation | Concurrent document creation via UI | Create multiple documents simultaneously, verify all created | `documents-create-button`, `document-form-*`, `documents-table` |
| 2 | Concurrent user creation | Concurrent user creation via UI | Create multiple users simultaneously, verify all created | `users-create-button`, `user-form-*`, `users-table` |
| 3 | Concurrent updates to same document | Concurrent document updates via UI | Update same document from multiple sessions, verify integrity | `document-edit-button`, `document-form-*` |
| 4 | Concurrent collection creation | Concurrent collection creation via UI | Create multiple collections simultaneously, verify all created | `collections-create-button`, `collection-form-*`, `collections-table` |

### 17. Edge Cases Tests (9 tests)
**Comprehensive File:** `tests/edge-cases.tests.js`  
**UI Test File:** `tests/frontend-ui/edge-cases-ui.tests.js` (TO BE CREATED)

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Handle empty string inputs | Empty string inputs via UI | Submit forms with empty strings, verify handling | Various form test identifiers |
| 2 | Handle null/undefined inputs | Null/undefined inputs via UI | Attempt to submit null/undefined, verify handling | Various form test identifiers |
| 3 | Handle very long inputs | Very long inputs via UI | Submit very long strings, verify handling | Various form test identifiers |
| 4 | Handle special characters in inputs | Special characters via UI | Submit special characters, verify handling | Various form test identifiers |
| 5 | Handle Unicode characters | Unicode characters via UI | Submit Unicode, verify handling | Various form test identifiers |
| 6 | Handle invalid UUID format | Invalid UUID via UI | Use invalid UUID, verify error | Various form test identifiers with error handling |
| 7 | Handle non-existent resource access | Non-existent resource via UI | Access non-existent resource, verify error | Error handling test identifiers |
| 8 | Handle large payloads | Large payloads via UI | Submit large data, verify handling | Various form test identifiers |
| 9 | Handle session expiration | Session expiration via UI | Wait for session to expire, verify redirect | Session-related test identifiers |

### 18. SDK Integration Tests (9 tests)
**Comprehensive File:** `tests/sdk-integration.tests.js`  
**UI Test File:** `tests/frontend-ui/sdk-integration-ui.tests.js` (TO BE CREATED)

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | SDK health check works | SDK health check via UI | Navigate to health page, verify health status | `health-check-status`, `health-check-details` |
| 2 | SDK getHealthStatus returns detailed status | Health status details via UI | View health details, verify information | `health-status-details` |
| 3 | SDK retry logic is configured | SDK retry logic via UI | Trigger retry scenario, verify retry works | Various operation test identifiers |
| 4 | SDK provides helpful error messages | Error messages via UI | Trigger error, verify helpful message | Error message test identifiers |
| 5 | SDK compatibility check works | Compatibility check via UI | View compatibility info, verify displayed | `compatibility-check-display` |
| 6 | SDK connection config types are correct | Connection config via UI | View connection config, verify types | `connection-config-display` |

### 19. SDK Client Tests (6 tests)
**Comprehensive File:** `tests/sdk-client.tests.js`  
**UI Test File:** `tests/frontend-ui/sdk-usage-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | SDK client can list projects | List projects via UI | Navigate to projects, verify list | `projects-list`, `projects-table` |
| 2 | SDK client can create project | Create project via UI | Create project, verify created | `projects-create-button`, `project-form-*` |
| 3 | SDK client can get project by ID | View project via UI | Click project, verify details | `project-row-{id}`, `project-details` |
| 4 | SDK client can create collection | Create collection via UI | Create collection, verify created | `collections-create-button`, `collection-form-*` |
| 5 | SDK client can create document | Create document via UI | Create document, verify created | `documents-create-button`, `document-form-*` |
| 6 | SDK client can list documents | List documents via UI | Navigate to documents, verify list | `documents-table`, `document-row-{id}` |

### 20. SDK API Tests (6 tests)
**Comprehensive File:** `tests/sdk-api.tests.js`  
**UI Test File:** `tests/frontend-ui/settings-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Test SDK status via health check | SDK status via UI | View health check, verify status | `health-check-status` |
| 2 | Get system settings via SDK | System settings via UI | Navigate to settings, verify settings | `settings-tab`, `settings-form` |
| 3 | Update system settings via SDK | Update system settings via UI | Modify settings, save | `settings-form`, `settings-submit` |
| 4 | Test SDK system info | System info via UI | View system info, verify displayed | `system-info-tab`, `system-info-display` |
| 5 | System resetDatabase method exists | Reset database via UI | Use reset database feature, verify works | `reset-database-button`, `reset-database-confirm` |
| 6 | System resetDatabase returns proper structure | Reset database result via UI | Reset database, verify result structure | `reset-database-result` |

### 21. Health Tests (7 tests)
**Comprehensive File:** `tests/health.tests.js`  
**UI Test File:** `tests/frontend-ui/health-ui.tests.js` (TO BE CREATED)

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Validate database schema via SDK | Validate database schema via UI | Use schema validation, verify results | `database-schema-validate-button`, `database-schema-validation-results` |
| 2 | Auto-fix database issues via SDK | Auto-fix database via UI | Use auto-fix feature, verify fixed | `database-auto-fix-button`, `database-auto-fix-results` |
| 3 | Run database migration via SDK | Database migration via UI | Run migration, verify completed | `database-migration-button`, `database-migration-results` |
| 4 | Get health statistics via SDK | Health statistics via UI | View health stats, verify displayed | `health-stats-card` |
| 5 | Repair database via SDK | Repair database via UI | Use repair feature, verify repaired | `database-repair-button`, `database-repair-results` |
| 6 | Initialize database via SDK | Initialize database via UI | Use initialize feature, verify initialized | `database-initialize-button`, `database-initialize-results` |
| 7 | Create default admin via SDK | Create default admin via UI | Use create default admin, verify created | `create-default-admin-button`, `create-default-admin-results` |

### 22. Metadata Tests (2 tests)
**Comprehensive File:** `tests/metadata.tests.js`  
**UI Test File:** `tests/frontend-ui/metadata-ui.tests.js` (TO BE CREATED)

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Get metadata schema via SDK | View metadata schema via UI | Navigate to metadata, verify schema | `metadata-schema-display` |
| 2 | Validate metadata via SDK | Validate metadata via UI | Use validation feature, verify results | `metadata-validate-button`, `metadata-validation-results` |

### 23. Performance Tests (2 tests)
**Comprehensive File:** `tests/performance.tests.js`  
**UI Test File:** `tests/frontend-ui/performance-ui.tests.js`

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Get performance metrics via SDK | View performance metrics via UI | Navigate to performance, verify metrics | `performance-metrics-card` |
| 2 | Get system health via SDK | System health via UI | View system health, verify displayed | `system-health-display` |

### 24. Queue Tests (5 tests)
**Comprehensive File:** `tests/queue.tests.js`  
**UI Test File:** `tests/frontend-ui/queue-ui.tests.js` (TO BE CREATED)

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Get project changelog via SDK | Project changelog via UI | Navigate to changelog, verify displayed | `project-changelog-tab`, `changelog-list` |
| 2 | Get queue metrics via SDK health | Queue metrics via UI | View health page, verify queue metrics | `health-queue-metrics` |
| 3 | Queue metrics in health endpoint via SDK | Queue metrics in health via UI | View health endpoint info, verify queue metrics | `health-endpoint-queue-metrics` |
| 4 | Performance metrics via SDK diagnostics | Performance metrics via UI | View diagnostics, verify performance metrics | `diagnostics-performance-metrics` |

### 25. CMS Integration Tests (1 test)
**Comprehensive File:** `tests/cms-integration.tests.js`  
**UI Test File:** `tests/frontend-ui/cms-integration-ui.tests.js` (TO BE CREATED)

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | Full CMS workflow via SDK | Full CMS workflow via UI | Perform complete CMS workflow, verify all steps | Various CMS workflow test identifiers |

### 26. CORS Tests (6 tests)
**Comprehensive File:** `tests/cors.tests.js`  
**UI Test File:** `tests/frontend-ui/cors-ui.tests.js` (TO BE CREATED)

| # | Comprehensive Test | UI Test | Required UI Actions | Required Test Identifiers |
|---|-------------------|---------|---------------------|-------------------------|
| 1 | CORS: Request from allowed origin should succeed | CORS allowed origin via UI | Make request from allowed origin, verify success | CORS-related test identifiers |
| 2 | CORS: Request from disallowed origin should be blocked | CORS disallowed origin via UI | Make request from disallowed origin, verify blocked | CORS error test identifiers |
| 3 | CORS: Request with wrong protocol should be handled | CORS wrong protocol via UI | Make request with wrong protocol, verify handled | CORS error test identifiers |
| 4 | CORS: Request with invalid origin format should be handled | CORS invalid origin via UI | Make request with invalid origin, verify handled | CORS error test identifiers |
| 5 | CORS: Preflight OPTIONS request should work | CORS preflight via UI | Make preflight request, verify works | CORS preflight test identifiers |
| 6 | CORS: Multiple allowed origins should work | CORS multiple origins via UI | Test multiple origins, verify all work | CORS multiple origins test identifiers |

---

## Summary

- **Total Comprehensive Tests:** 151
- **Total UI Tests Required:** 151
- **Existing UI Test Files:** 17
- **Missing UI Test Files:** 10 (admin, transactions, concurrency, edge-cases, sdk-integration, health, metadata, queue, cms-integration, cors)

## Next Steps

1. Audit all frontend components for missing test identifiers
2. Add all required test identifiers to frontend
3. Create selector validation script
4. Update existing UI tests to use only data-testid selectors
5. Create missing UI test files
6. Verify 100% test coverage

