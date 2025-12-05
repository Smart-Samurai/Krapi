# Frontend UI Testing Suite

## Overview

This comprehensive frontend UI testing suite uses Playwright to test 100% of KRAPI functionality through the actual web UI. It covers all pages, routes, visual elements, data displays, forms, modals, and user interactions.

## Prerequisites

1. **Install Playwright browsers**:
   ```bash
   cd KRAPI-COMPREHENSIVE-TEST-SUITE
   npx playwright install chromium
   ```

2. **Ensure frontend and backend are running**:
   ```bash
   # From project root
   npm run krapi start --dev
   ```

## Running Tests

### Run All Frontend UI Tests

```bash
cd KRAPI-COMPREHENSIVE-TEST-SUITE
npm run test:ui
```

### Run with Visible Browser (Headed Mode)

```bash
npm run test:ui:headed
```

### Run with Verbose Logging

```bash
npm run test:ui:verbose
```

### Run Specific Browser

```bash
BROWSER=firefox npm run test:ui
BROWSER=webkit npm run test:ui
```

## Test Phases

The test suite is organized into 17 phases covering all aspects of the frontend:

1. **Authentication & Access Control** - Login, profile, session management
2. **Dashboard & Overview** - Statistics, quick actions, recent projects
3. **Project Management** - List, create, edit, delete, detail pages
4. **Collections Management** - CRUD operations, schema validation
5. **Documents Management** - CRUD, search, filter, pagination
6. **Storage & Files** - Upload, download, deletion, statistics
7. **Users Management** - Create, edit, delete, role/scopes
8. **API Keys Management** - Create, revoke, manage
9. **Email Configuration** - Settings, templates, test emails
10. **Backup & Restore** - Create, restore, download, delete
11. **Settings & Configuration** - System and project settings
12. **MCP Integration** - Model selection, chat functionality
13. **Activity & Logs** - Changelog, activity logs, audit trails
14. **Visual Elements & UI Components** - All UI components, responsive design, theme
15. **Data Loading & Display Logic** - Data fetching, formatting, real-time updates
16. **Error Handling & Edge Cases** - Error scenarios, edge cases
17. **Performance & Optimization** - Load times, rendering efficiency

## Test Structure

Each test phase has its own test file in `tests/frontend-ui/`:

- `auth-ui.tests.js` - Authentication tests
- `dashboard-ui.tests.js` - Dashboard tests
- `projects-ui.tests.js` - Projects tests
- `collections-ui.tests.js` - Collections tests
- `documents-ui.tests.js` - Documents tests
- `storage-ui.tests.js` - Storage tests
- `users-ui.tests.js` - Users tests
- `api-keys-ui.tests.js` - API keys tests
- `email-ui.tests.js` - Email tests
- `backup-ui.tests.js` - Backup tests
- `settings-ui.tests.js` - Settings tests
- `mcp-ui.tests.js` - MCP tests
- `activity-ui.tests.js` - Activity tests
- `ui-components-ui.tests.js` - UI components tests
- `data-logic-ui.tests.js` - Data logic tests
- `error-handling-ui.tests.js` - Error handling tests
- `performance-ui.tests.js` - Performance tests

## Configuration

Tests use the same configuration as the API test suite (`config.js`):

- `FRONTEND_URL` - Frontend URL (default: http://127.0.0.1:3498)
- `ADMIN_CREDENTIALS` - Admin username and password

## Environment Variables

- `HEADLESS` - Set to `false` to run in headed mode (default: `true`)
- `VERBOSE` - Set to `true` for verbose logging (default: `false`)
- `BROWSER` - Browser to use: `chromium`, `firefox`, or `webkit` (default: `chromium`)
- `SLOW_MO` - Slow down operations by specified milliseconds (default: `0`)

## Test Results

Test results are logged to the console and follow the same format as the API test suite. Results include:

- Pass/fail status for each test
- Duration for each test
- Error messages and stack traces for failures
- Summary statistics

## Troubleshooting

### Browser Installation Issues

If Playwright browsers are not installed:

```bash
npx playwright install
```

### Frontend Not Responding

Ensure the frontend is running:

```bash
# Check if frontend is accessible
curl http://127.0.0.1:3498/api/health
```

### Tests Timing Out

Increase timeouts in test files or check network connectivity.

### Browser Crashes

Try running in headed mode to see what's happening:

```bash
HEADLESS=false npm run test:ui
```

## Integration with CI/CD

The frontend UI tests can be integrated into CI/CD pipelines:

```bash
# Install dependencies and browsers
npm install
npx playwright install --with-deps chromium

# Run tests
npm run test:ui
```

## Notes

- Tests simulate real user interactions through the browser
- All tests go through the frontend UI, not direct API calls
- Tests verify visual elements, not just functionality
- Performance tests measure actual load times and rendering efficiency
- Error handling tests verify graceful error states

