# UI Test Selector Audit

**Date:** 2025-12-17  
**Purpose:** Document all forbidden selectors found in UI tests and missing test identifiers in frontend

## Forbidden Selector Patterns Found

### Pattern 1: CSS Class Selectors
**Location:** Multiple UI test files  
**Examples:**
- `.className`
- `button.btn-primary`
- `[class*="error"]`
- `[class*="table"]`
- `[class*="stat"]`
- `[class*="metric"]`
- `[class*="activity"]`
- `[class*="storage"]`
- `[class*="pagination"]`
- `[class*="sort"]`

### Pattern 2: Text Content Selectors
**Location:** Multiple UI test files  
**Examples:**
- `:has-text("Login")`
- `:has-text("Create User")`
- `:has-text("Edit")`
- `:has-text("Delete")`
- `:has-text("Save")`
- `:has-text("Confirm")`
- `:has-text("Next")`
- `:has-text("Previous")`
- `text=/no.*users/i`
- `text=/no.*file/i`
- `text=/no.*document/i`
- `text=/storage/i`
- `text=/used/i`
- `text=/quota/i`

### Pattern 3: Attribute Selectors (Non-testid)
**Location:** Multiple UI test files  
**Examples:**
- `input[type="text"]`
- `input[type="password"]`
- `input[type="email"]`
- `input[type="file"]`
- `input[type="search"]`
- `input[name*="username"]`
- `input[name*="email"]`
- `input[placeholder*="username"]`
- `button[type="submit"]`
- `select`
- `[role="dialog"]`
- `[role="alert"]`
- `[role="tab"]`
- `[role="table"]`
- `[role="combobox"]`
- `[role="columnheader"]`
- `[aria-label*="edit"]`
- `[aria-label*="delete"]`
- `[aria-label*="page"]`
- `[aria-label*="next"]`
- `a[href*="activity"]`

### Pattern 4: Element Type Selectors
**Location:** Multiple UI test files  
**Examples:**
- `button`
- `input`
- `select`
- `table`
- `tbody tr`
- `th`
- `tr:has-text(...)`

### Pattern 5: Combined Fallback Selectors
**Location:** Multiple UI test files  
**Examples:**
- `'[data-testid="login-username"], input[type="text"], input[name*="username"]'`
- `'[data-testid="login-submit"], button[type="submit"], button:has-text("Login")'`
- `'[data-testid="users-table"], table, [class*="table"]'`
- `'button:has-text("Edit"), [data-testid*="edit"], button[aria-label*="edit" i]'`

## Files with Forbidden Selectors

1. **auth-ui.tests.js** - Multiple instances of fallback selectors
2. **users-ui.tests.js** - Extensive use of text selectors and CSS classes
3. **documents-ui.tests.js** - Many fallback selectors
4. **storage-ui.tests.js** - Text selectors and CSS classes
5. **projects-ui.tests.js** - Fallback selectors
6. **collections-ui.tests.js** - Fallback selectors
7. **settings-ui.tests.js** - Fallback selectors
8. **api-keys-ui.tests.js** - Fallback selectors
9. **email-ui.tests.js** - Fallback selectors
10. **backup-ui.tests.js** - Fallback selectors
11. **mcp-ui.tests.js** - Fallback selectors
12. **activity-ui.tests.js** - Fallback selectors
13. **dashboard-ui.tests.js** - Fallback selectors
14. **sdk-usage-ui.tests.js** - Fallback selectors
15. **ui-components-ui.tests.js** - Fallback selectors
16. **data-logic-ui.tests.js** - Fallback selectors
17. **error-handling-ui.tests.js** - Fallback selectors
18. **performance-ui.tests.js** - Fallback selectors

## Required Test Identifiers (Missing from Frontend)

Based on the comprehensive test mapping, the following test identifiers need to be added to the frontend:

### Authentication
- ✅ `login-username` (exists)
- ✅ `login-password` (exists)
- ✅ `login-submit` (exists)
- ❌ `login-error` (missing)
- ❌ `register-username` (missing)
- ❌ `register-email` (missing)
- ❌ `register-password` (missing)
- ❌ `register-confirm-password` (missing)
- ❌ `register-submit` (missing)
- ✅ `logout-button` (exists)
- ✅ `refresh-session-button` (exists)

### Admin Users
- ❌ `admin-users-table` (missing)
- ❌ `admin-users-list` (missing)
- ❌ `admin-user-row-{id}` (missing)
- ❌ `admin-user-details` (missing)
- ✅ `create-admin-user-button` (exists)
- ❌ `admin-user-form-username` (missing)
- ❌ `admin-user-form-email` (missing)
- ❌ `admin-user-form-password` (missing)
- ❌ `admin-user-form-role` (missing)
- ❌ `admin-user-form-submit` (missing)
- ❌ `admin-user-error` (missing)
- ❌ `admin-user-edit-button` (missing)
- ❌ `admin-user-delete-button` (missing)
- ❌ `admin-user-delete-confirm` (missing)
- ❌ `admin-user-delete-cancel` (missing)
- ❌ `admin-user-delete-error` (missing)

### Projects
- ❌ `projects-create-button` (missing)
- ❌ `project-form-name` (missing)
- ❌ `project-form-description` (missing)
- ❌ `project-form-submit` (missing)
- ❌ `projects-list` (missing)
- ❌ `projects-table` (missing)
- ❌ `project-row-{id}` (missing)
- ❌ `project-details-name` (missing)
- ❌ `project-details-description` (missing)
- ❌ `project-edit-button` (missing)
- ❌ `project-stats-card` (missing)
- ❌ `project-stats-collections` (missing)
- ❌ `project-stats-documents` (missing)
- ❌ `project-settings-tab` (missing)
- ❌ `project-settings-form` (missing)
- ❌ `project-settings-submit` (missing)
- ❌ `project-changelog-tab` (missing)
- ❌ `project-activity-list` (missing)

### Collections
- ❌ `collections-create-button` (missing)
- ❌ `collection-form-name` (missing)
- ❌ `collection-form-description` (missing)
- ❌ `collection-form-fields` (missing)
- ❌ `collection-form-submit` (missing)
- ❌ `collections-list` (missing)
- ❌ `collections-table` (missing)
- ❌ `collection-row-{name}` (missing)
- ❌ `collection-details-name` (missing)
- ❌ `collection-edit-button` (missing)
- ❌ `collection-stats-card` (missing)
- ❌ `collection-stats-documents` (missing)
- ❌ `collection-validate-button` (missing)
- ❌ `collection-validation-results` (missing)

### Documents
- ✅ `documents-create-button` (exists)
- ✅ `create-document-dialog` (exists)
- ✅ `document-search-input` (exists)
- ✅ `documents-table` (exists)
- ✅ `documents-empty-state` (exists)
- ✅ `documents-no-collection-state` (exists)
- ✅ `select-all-checkbox` (exists)
- ✅ `select-document-{id}` (exists)
- ✅ `bulk-actions-button` (exists)
- ✅ `bulk-delete-button` (exists)
- ✅ `bulk-update-button` (exists)
- ✅ `document-aggregate-button` (exists)
- ✅ `run-aggregation-button` (exists)
- ❌ `document-form-data` (missing)
- ❌ `document-form-submit` (missing)
- ❌ `document-row-{id}` (missing)
- ❌ `document-details` (missing)
- ❌ `document-edit-button` (missing)
- ❌ `document-delete-button` (missing)
- ❌ `document-delete-confirm` (missing)
- ❌ `documents-pagination` (missing)
- ❌ `documents-page-next` (missing)
- ❌ `documents-page-prev` (missing)
- ❌ `documents-filter` (missing)
- ❌ `documents-filter-status` (missing)
- ❌ `documents-sort` (missing)
- ❌ `documents-sort-priority` (missing)
- ❌ `documents-count` (missing)
- ❌ `documents-bulk-create-button` (missing)
- ❌ `documents-bulk-form` (missing)
- ❌ `documents-bulk-submit` (missing)
- ❌ `documents-search-button` (missing)
- ❌ `documents-search-results` (missing)
- ❌ `documents-aggregate-form` (missing)

### Project Users
- ✅ `users-table` (exists)
- ❌ `users-create-button` (missing)
- ❌ `user-form-username` (missing)
- ❌ `user-form-email` (missing)
- ❌ `user-form-password` (missing)
- ❌ `user-form-role` (missing)
- ❌ `user-form-permissions` (missing)
- ❌ `user-form-submit` (missing)
- ❌ `user-row-{id}` (missing)
- ❌ `user-details` (missing)
- ❌ `user-edit-button` (missing)
- ❌ `user-delete-button` (missing)
- ❌ `user-delete-confirm` (missing)
- ❌ `user-activity-tab` (missing)
- ❌ `user-activity-list` (missing)
- ❌ `user-stats-card` (missing)
- ❌ `user-permissions-edit` (missing)
- ❌ `user-permissions-form` (missing)
- ❌ `user-permissions-submit` (missing)
- ❌ `user-scopes-display` (missing)
- ❌ `user-scopes-edit` (missing)
- ❌ `user-scopes-form` (missing)
- ❌ `user-scopes-submit` (missing)
- ❌ `user-error` (missing)

### Storage/Files
- ❌ `storage-stats-card` (missing)
- ❌ `storage-stats-total` (missing)
- ❌ `storage-stats-used` (missing)
- ❌ `files-list` (missing)
- ❌ `file-row-{id}` (missing)
- ❌ `file-name-{id}` (missing)
- ❌ `file-download-button-{id}` (missing)
- ❌ `file-url-button-{id}` (missing)
- ❌ `upload-files-button` (missing)
- ❌ `files-empty-state` (missing)
- ❌ `storage-container` (missing)

### Email
- ✅ `test-email-button` (exists)
- ❌ `email-config-tab` (missing)
- ❌ `email-config-form` (missing)
- ❌ `email-config-submit` (missing)
- ❌ `email-test-result` (missing)
- ❌ `email-templates-tab` (missing)
- ❌ `email-templates-list` (missing)
- ❌ `email-template-row-{id}` (missing)
- ❌ `email-send-button` (missing)
- ❌ `email-send-form` (missing)
- ❌ `email-send-submit` (missing)

### API Keys
- ❌ `api-keys-list` (missing)
- ❌ `api-key-row-{id}` (missing)
- ❌ `api-keys-create-button` (missing)
- ❌ `api-key-form-name` (missing)
- ❌ `api-key-form-permissions` (missing)
- ❌ `api-key-form-submit` (missing)
- ❌ `api-key-validate-button` (missing)
- ❌ `api-key-validation-result` (missing)

### Backup
- ❌ `backup-create-button` (missing)
- ❌ `backup-create-confirm` (missing)
- ❌ `backups-list` (missing)
- ❌ `backup-row-{id}` (missing)
- ❌ `system-backups-list` (missing)
- ❌ `system-backup-create-button` (missing)
- ❌ `backup-delete-button-{id}` (missing)
- ❌ `backup-delete-confirm` (missing)

### Settings
- ✅ `reset-database-confirm-input` (exists)
- ✅ `reset-database-confirm-button` (exists)
- ❌ `settings-tab` (missing)
- ❌ `settings-form` (missing)
- ❌ `settings-submit` (missing)
- ❌ `system-info-tab` (missing)
- ❌ `system-info-display` (missing)
- ❌ `reset-database-result` (missing)

### MCP
- ❌ `mcp-admin-chat-input` (missing)
- ❌ `mcp-admin-chat-send` (missing)
- ❌ `mcp-project-chat-input` (missing)
- ❌ `mcp-project-chat-send` (missing)
- ❌ `mcp-models-capabilities` (missing)
- ❌ `mcp-models-list` (missing)
- ❌ `mcp-admin-chat-response` (missing)
- ❌ `mcp-project-chat-response` (missing)

### Activity/Changelog
- ❌ `activity-logs-list` (missing)
- ❌ `activity-log-row-{id}` (missing)
- ❌ `activity-stats-card` (missing)
- ❌ `activity-recent-list` (missing)
- ❌ `activity-cleanup-button` (missing)
- ❌ `changelog-list` (missing)
- ❌ `changelog-entry-{id}` (missing)

### Health
- ❌ `health-check-status` (missing)
- ❌ `health-check-details` (missing)
- ❌ `health-status-details` (missing)
- ❌ `database-schema-validate-button` (missing)
- ❌ `database-schema-validation-results` (missing)
- ❌ `database-auto-fix-button` (missing)
- ❌ `database-auto-fix-results` (missing)
- ❌ `database-migration-button` (missing)
- ❌ `database-migration-results` (missing)
- ❌ `health-stats-card` (missing)
- ❌ `database-repair-button` (missing)
- ❌ `database-repair-results` (missing)
- ❌ `database-initialize-button` (missing)
- ❌ `database-initialize-results` (missing)
- ❌ `create-default-admin-button` (missing)
- ❌ `create-default-admin-results` (missing)

### Metadata
- ❌ `metadata-schema-display` (missing)
- ❌ `metadata-validate-button` (missing)
- ❌ `metadata-validation-results` (missing)

### Performance
- ❌ `performance-metrics-card` (missing)
- ❌ `system-health-display` (missing)

### Queue
- ❌ `health-queue-metrics` (missing)
- ❌ `health-endpoint-queue-metrics` (missing)
- ❌ `diagnostics-performance-metrics` (missing)

### Profile
- ❌ `profile-username` (missing)
- ❌ `profile-email` (missing)
- ❌ `profile-role` (missing)

### Dashboard
- ✅ `dashboard-welcome` (exists)
- ✅ `stat-card-projects` (exists)
- ✅ `stat-card-active-projects` (exists)
- ✅ `stat-card-collections` (exists)
- ✅ `stat-card-documents` (exists)
- ✅ `quick-action-create-project` (exists)
- ✅ `recent-projects-list` (exists)
- ✅ `project-not-found-error` (exists)

## Summary

- **Total Forbidden Selector Instances:** 442+ found
- **Files with Forbidden Selectors:** 18 UI test files
- **Missing Test Identifiers:** ~200+ required identifiers missing from frontend
- **Priority:** HIGH - All selectors must be replaced with data-testid only

## Action Items

1. Create selector validation script
2. Add all missing test identifiers to frontend components
3. Replace all forbidden selectors in UI tests with data-testid selectors
4. Validate uniqueness of all test identifiers
5. Run validation script to ensure zero violations

