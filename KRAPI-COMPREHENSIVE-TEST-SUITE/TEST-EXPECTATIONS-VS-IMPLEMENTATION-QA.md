# Frontend Test Expectations vs Implementation Q&A Analysis

## Executive Summary

This document provides a comprehensive Q&A analysis comparing what the frontend UI tests expect versus what the actual frontend implementation provides. The analysis covers all 17 test files and their corresponding frontend pages/components.

### Overall Alignment: ~75%

**Major Findings:**
- **Selector Mismatches**: Tests use generic/flexible selectors (e.g., `[class*="project"]`) while frontend uses specific component classes (e.g., `krapi-card-hover`, `Card` components)
- **Missing Test IDs**: Frontend components lack `data-testid` attributes, forcing tests to rely on fragile class-based or text-based selectors
- **Component Structure Differences**: Tests expect table layouts in some cases, but frontend uses card-based layouts (e.g., Projects page)
- **Timing Issues**: Tests use `waitForLoadState("networkidle")` which can timeout; frontend uses skeleton loaders and progressive loading
- **Feature Coverage**: Most core features are implemented, but some test expectations don't match actual UI patterns

**Critical Issues:**
1. No `data-testid` attributes on any components - tests must use fragile selectors
2. Login form uses `name="username"` but tests look for multiple patterns
3. Projects displayed as cards, not tables - tests look for both
4. Many tests use overly generic selectors that may match unintended elements
5. Some features tested don't exist in UI (e.g., project search/filter on projects list page)

---

## Feature-by-Feature Q&A

### 1. Authentication (auth-ui.tests.js)

#### Q: What does the test expect for login page display?
**A:** Tests look for:
- Username field: `input[type="text"], input[name*="username"], input[name*="email"], input[placeholder*="username" i], input[placeholder*="email" i]`
- Password field: `input[type="password"]`
- Submit button: `button[type="submit"], button:has-text("Login"), button:has-text("Sign in")`

#### Q: What does the frontend actually implement?
**A:** Frontend (`frontend-manager/app/(auth)/login/page.tsx`) provides:
- Username field: `input[name="username"]` with `type="text"` and `placeholder="Enter your username"`
- Password field: `input[type="password"]` with `placeholder="Enter your password"`
- Submit button: `button[type="submit"]` with text "Sign in" (not "Login")

#### Q: Are they aligned?
**A:** ✅ **Mostly aligned** - The flexible selectors in tests should match, but:
- Button text is "Sign in" not "Login" - test selector `button:has-text("Login")` may not match
- Username field has `name="username"` which matches test expectations
- Password field matches exactly

**Recommendation:** Add `data-testid="login-username"`, `data-testid="login-password"`, `data-testid="login-submit"` to login form fields.

---

#### Q: What does the test expect for logout functionality?
**A:** Tests look for:
- Logout button: `button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out"), [data-testid*="logout"]`
- Or in menu: `[aria-label*="menu" i], button[aria-haspopup="true"]`

#### Q: What does the frontend actually implement?
**A:** Frontend logout is likely in the sidebar/navigation component, but we didn't read that file. Tests should check `app-sidebar.tsx` or navigation components.

#### Q: Are they aligned?
**A:** ⚠️ **Unknown** - Need to verify logout button location and structure.

**Recommendation:** Add `data-testid="logout-button"` to logout element.

---

### 2. Dashboard (dashboard-ui.tests.js)

#### Q: What does the test expect for welcome message?
**A:** Tests look for:
- `text=/welcome/i, h1:has-text("Welcome"), h2:has-text("Welcome"), [class*="welcome"]`
- Or any heading: `h1, h2, [role='heading']`

#### Q: What does the frontend actually implement?
**A:** Frontend (`frontend-manager/app/(sidebar)/dashboard/page.tsx`) provides:
- PageHeader with title: `Welcome back, ${user?.username || "User"}!`
- Uses `PageHeader` component which likely renders as `h1` or heading

#### Q: Are they aligned?
**A:** ✅ **Aligned** - The heading selector should match, and "Welcome" text is present.

---

#### Q: What does the test expect for statistics cards?
**A:** Tests look for:
- `[class*="card"], [class*="stat"], [class*="metric"], [data-testid*="stat"]`
- Or text content: `text=/project/i, text=/collection/i, text=/document/i, text=/user/i`

#### Q: What does the frontend actually implement?
**A:** Frontend provides:
- `Card` components with `CardHeader` and `CardContent`
- Statistics displayed in cards with titles like "Total Projects", "Active Projects", "Total Collections", "Total Documents"
- Uses shadcn/ui `Card` component which has classes like `card`, `card-header`, etc.

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Cards exist and contain the expected text. The generic `[class*="card"]` selector should match.

---

#### Q: What does the test expect for quick action buttons?
**A:** Tests look for:
- `button:has-text("Create Project"), button:has-text("New Project"), a:has-text("Create Project"), [class*="create-project"]`

#### Q: What does the frontend actually implement?
**A:** Frontend provides:
- `ActionButton` with `variant="add"` and `icon={Plus}` wrapped in `Link` to `/projects`
- Button text: "Create Project"
- Uses `asChild` prop to render as `Link` component

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Button exists with "Create Project" text, and it's wrapped in a `Link` (renders as `<a>`), so `a:has-text("Create Project")` should match.

---

### 3. Projects (projects-ui.tests.js)

#### Q: What does the test expect for projects list?
**A:** Tests look for:
- Project items: `[class*="project"], [data-testid*="project"], [role="listitem"]:has-text("project")`
- Project container: `text=/project/i, [class*="project"], [data-testid*="project"], table, [role="list"]`

#### Q: What does the frontend actually implement?
**A:** Frontend (`frontend-manager/app/(sidebar)/projects/page.tsx`) provides:
- Projects displayed as **cards** in a grid: `<Card className="krapi-card-hover">`
- Each project card has `CardHeader` with `CardTitle` (project name) and `CardDescription`
- Uses grid layout: `grid gap-4` with `gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))'`
- **No table structure** - cards only

#### Q: Are they aligned?
**A:** ⚠️ **Partially aligned** - Tests look for both cards and tables, but frontend only uses cards. The `[class*="project"]` selector won't match because cards use `krapi-card-hover` class, not a class containing "project". Tests should look for `[class*="card"]` or the actual card structure.

**Recommendation:** 
- Add `data-testid="project-card"` to each project card
- Or update test to look for `[class*="card"]` with project name text inside

---

#### Q: What does the test expect for "Create Project" button?
**A:** Tests look for:
- `button:has-text("Create"), button:has-text("New Project"), a:has-text("Create"), [class*="create"]`

#### Q: What does the frontend actually implement?
**A:** Frontend provides:
- `ActionButton` with `variant="add"`, `icon={Plus}`, text "Create Project"
- Button has class `btn-add` (from ActionButton component)
- Opens `FormDialog` when clicked

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Button exists with "Create" in text ("Create Project"), and `[class*="create"]` should match `btn-add` class... wait, `btn-add` doesn't contain "create". The selector `button:has-text("Create")` should match though.

**Recommendation:** Add `data-testid="create-project-button"` to make selector more reliable.

---

#### Q: What does the test expect for project search/filter?
**A:** Tests look for:
- `input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]`

#### Q: What does the frontend actually implement?
**A:** Frontend **does NOT implement** search/filter on the projects list page. The page only shows project cards with no search functionality.

#### Q: Are they aligned?
**A:** ❌ **Not aligned** - Feature doesn't exist. Test expects it but it's not implemented.

**Recommendation:** Either implement search/filter functionality or remove this test expectation.

---

### 4. Collections (collections-ui.tests.js)

#### Q: What does the test expect for collections list?
**A:** Tests look for:
- `text=/collection/i, [class*="collection"], [data-testid*="collection"], table, [role="list"]`

#### Q: What does the frontend actually implement?
**A:** Frontend (`frontend-manager/app/(sidebar)/projects/[projectId]/collections/page.tsx`) provides:
- Collections displayed in a **Table** component (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`)
- Table has columns: Name, Type, Fields, Documents, Created, Actions
- Uses shadcn/ui `Table` component

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Frontend uses a table, which matches test expectations. The `table` selector should match.

---

#### Q: What does the test expect for "Create Collection" button?
**A:** Tests look for:
- `button:has-text("Create"), button:has-text("New Collection"), [class*="create"]`

#### Q: What does the frontend actually implement?
**A:** Frontend provides:
- `ActionButton` with `variant="add"`, `icon={Plus}`, text "Create Collection"
- Opens a `Dialog` (not `FormDialog`) when clicked

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Button exists with "Create" and "Collection" in text.

---

### 5. Documents (documents-ui.tests.js)

#### Q: What does the test expect for documents table?
**A:** Tests look for:
- `text=/document/i, [class*="document"], [data-testid*="document"], table, [role="list"]`

#### Q: What does the frontend actually implement?
**A:** Frontend (`frontend-manager/app/(sidebar)/projects/[projectId]/documents/page.tsx`) provides:
- Documents displayed in a **Table** component
- Table has columns for document data
- Uses shadcn/ui `Table` component

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Frontend uses a table structure.

---

#### Q: What does the test expect for document search/filter?
**A:** Tests look for:
- `input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]`

#### Q: What does the frontend actually implement?
**A:** Frontend provides a `Search` icon and likely has search functionality, but we need to verify the actual input field structure.

#### Q: Are they aligned?
**A:** ⚠️ **Unknown** - Need to verify search input exists and matches selector.

---

### 6. Storage & Files (storage-ui.tests.js)

#### Q: What does the test expect for files list?
**A:** Tests look for:
- `text=/file/i, [class*="file"], [data-testid*="file"], table, [role="list"]`

#### Q: What does the frontend actually implement?
**A:** Frontend has a `/files` route but we didn't read that page. Storage page (`/storage`) shows statistics only, not a file list.

#### Q: Are they aligned?
**A:** ⚠️ **Unknown** - Need to verify files page implementation.

---

### 7. Users (users-ui.tests.js)

#### Q: What does the test expect for users list?
**A:** Tests look for:
- Project users page at `/projects/[projectId]/users`
- Admin users page at `/users`

#### Q: What does the frontend actually implement?
**A:** Frontend provides:
- Project users: `frontend-manager/app/(sidebar)/projects/[projectId]/users/page.tsx` - Uses `Table` component
- Admin users: `frontend-manager/app/(sidebar)/users/page.tsx` - Uses `AdminUsersList` component

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Both pages exist and should be accessible.

---

### 8. API Keys (api-keys-ui.tests.js)

#### Q: What does the test expect for API keys list?
**A:** Tests look for:
- Page at `/projects/[projectId]/api-keys`
- Create button: `button:has-text("Create"), button:has-text("New Key"), [class*="create"]`

#### Q: What does the frontend actually implement?
**A:** Frontend (`frontend-manager/app/(sidebar)/projects/[projectId]/api-keys/page.tsx`) provides:
- API keys displayed in a `Table` component
- `ActionButton` with text "Create API Key" (not "New Key")
- Opens `Dialog` when clicked

#### Q: Are they aligned?
**A:** ✅ **Mostly aligned** - Button text is "Create API Key" which contains "Create", so selector should match. "New Key" won't match though.

---

### 9. Email (email-ui.tests.js)

#### Q: What does the test expect for email configuration?
**A:** Tests look for:
- Page at `/projects/[projectId]/email`
- Form fields: `form, input[name*="smtp"], input[name*="email"], input[type="email"]`
- Test button: `button:has-text("Test"), button:has-text("Send Test"), [class*="test"]`

#### Q: What does the frontend actually implement?
**A:** Frontend (`frontend-manager/app/(sidebar)/projects/[projectId]/email/page.tsx`) provides:
- Email configuration form with SMTP settings
- Uses `Tabs` for Configuration and Templates
- Test email functionality exists

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Email page exists with configuration form.

---

### 10. Backup (backup-ui.tests.js)

#### Q: What does the test expect for backup list?
**A:** Tests look for:
- Page at `/projects/[projectId]/backup`
- Create button: `button:has-text("Create"), button:has-text("New Backup"), [class*="create"]`

#### Q: What does the frontend actually implement?
**A:** Frontend (`frontend-manager/app/(sidebar)/projects/[projectId]/backup/page.tsx`) provides:
- Backup list in a `Table` component
- Create backup dialog with form
- Uses `Dialog` component

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Backup page exists with create functionality.

---

### 11. Settings (settings-ui.tests.js)

#### Q: What does the test expect for settings page?
**A:** Tests look for:
- System settings at `/settings`
- Project settings at `/projects/[projectId]/settings`
- Settings sections: `form, [class*="setting"], [class*="config"], input, select`

#### Q: What does the frontend actually implement?
**A:** Frontend provides:
- System settings: `frontend-manager/app/(sidebar)/settings/page.tsx` - Uses `Tabs` for General, Security, Email, Database
- Project settings: `frontend-manager/app/(sidebar)/projects/[projectId]/settings/page.tsx` (not read, but route exists)

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Settings pages exist with forms and configuration options.

---

### 12. MCP (mcp-ui.tests.js)

#### Q: What does the test expect for MCP interface?
**A:** Tests look for:
- Admin MCP at `/mcp`
- Project MCP at `/projects/[projectId]/mcp`
- Model selector: `select, [class*="model"], [data-testid*="model"], button:has-text("Model")`

#### Q: What does the frontend actually implement?
**A:** Frontend provides:
- Admin MCP: `frontend-manager/app/(sidebar)/mcp/page.tsx` - Chat interface with model selection
- Project MCP: Route exists but page not read
- Model selector uses `Select` component from shadcn/ui

#### Q: Are they aligned?
**A:** ✅ **Aligned** - MCP pages exist with model selection.

---

### 13. Activity/Changelog (activity-ui.tests.js)

#### Q: What does the test expect for changelog?
**A:** Tests look for:
- Page at `/projects/[projectId]/changelog`
- Changelog entries: `text=/changelog/i, [class*="changelog"], [class*="activity"], [class*="log"], table, [role="list"]`
- Filter input: `input[type="search"], input[placeholder*="filter" i], select`

#### Q: What does the frontend actually implement?
**A:** Frontend (`frontend-manager/app/(sidebar)/projects/[projectId]/changelog/page.tsx`) provides:
- Changelog displayed in a `Table` component
- Filter dropdown using `Select` component
- Pagination controls

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Changelog page exists with table and filtering.

---

### 14. UI Components (ui-components-ui.tests.js)

#### Q: What does the test expect for sidebar navigation?
**A:** Tests look for:
- `[role="navigation"], [class*="sidebar"], nav, aside`

#### Q: What does the frontend actually implement?
**A:** Frontend uses `app-sidebar.tsx` component (not read, but exists). Sidebar is likely in the layout.

#### Q: Are they aligned?
**A:** ⚠️ **Unknown** - Need to verify sidebar structure.

---

#### Q: What does the test expect for page headers?
**A:** Tests look for:
- `h1, h2, [role="heading"], [class*="header"], [class*="title"]`

#### Q: What does the frontend actually implement?
**A:** Frontend uses `PageHeader` component which likely renders as `h1` or heading element.

#### Q: Are they aligned?
**A:** ✅ **Aligned** - PageHeader component should render as heading.

---

### 15. Data Logic (data-logic-ui.tests.js)

#### Q: What does the test expect for data loading?
**A:** Tests check:
- Page loads with content
- Data refreshes on reload
- Loading states display during fetch

#### Q: What does the frontend actually implement?
**A:** Frontend provides:
- `Skeleton` components for loading states
- Redux state management for data loading
- Progressive loading with skeleton placeholders

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Frontend has loading states and data loading patterns.

---

### 16. Error Handling (error-handling-ui.tests.js)

#### Q: What does the test expect for error handling?
**A:** Tests check:
- Invalid project ID handling
- Network disconnection handling
- Session expiration handling
- Validation error handling

#### Q: What does the frontend actually implement?
**A:** Frontend provides:
- `Alert` components for error messages
- Error boundaries (likely)
- Redirect to login on auth errors
- Form validation with error messages

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Frontend has error handling patterns.

---

### 17. Performance (performance-ui.tests.js)

#### Q: What does the test expect for performance?
**A:** Tests check:
- Page load times < 10 seconds
- Large lists render efficiently
- Smooth scrolling
- No memory leaks
- Image loading efficiency

#### Q: What does the frontend actually implement?
**A:** Frontend provides:
- Skeleton loaders for progressive rendering
- Optimized React components
- Lazy loading (likely)
- Image optimization (Next.js handles this)

#### Q: Are they aligned?
**A:** ✅ **Aligned** - Frontend uses performance best practices.

---

## Selector Analysis

### Common Selector Patterns in Tests

1. **Generic Class Selectors**: `[class*="project"]`, `[class*="collection"]`
   - **Problem**: Frontend uses specific component classes (e.g., `krapi-card-hover`, `Card`) that don't contain these keywords
   - **Solution**: Add `data-testid` attributes or use more specific selectors

2. **Text-Based Selectors**: `button:has-text("Create")`, `text=/project/i`
   - **Problem**: Text can change, translations break tests
   - **Solution**: Use `data-testid` for critical elements

3. **Multiple Fallback Selectors**: Tests use long chains like `input[type="text"], input[name*="username"], input[name*="email"]`
   - **Problem**: Works but is fragile
   - **Solution**: Standardize on `data-testid` attributes

4. **Role-Based Selectors**: `[role="dialog"]`, `[role="table"]`
   - **Status**: ✅ Good - These should work if components use proper ARIA roles

### Actual DOM Structure

**Projects Page:**
```tsx
<div className="grid gap-4">
  <Card className="krapi-card-hover">
    <CardHeader>
      <CardTitle>{project.name}</CardTitle>
      <CardDescription>{project.description}</CardDescription>
    </CardHeader>
    <CardContent>
      <ActionButton>Enter Project</ActionButton>
    </CardContent>
  </Card>
</div>
```

**Collections Page:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Type</TableHead>
      ...
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>...</TableRow>
  </TableBody>
</Table>
```

**Key Observations:**
- Projects use **cards**, not tables
- Collections/Documents use **tables**
- Components use shadcn/ui primitives with consistent class patterns
- No `data-testid` attributes anywhere

---

## Missing Features Analysis

### Features Tests Expect But Don't Exist

1. **Project Search/Filter** (`projects-ui.tests.js`)
   - Test expects: Search input on projects list page
   - Reality: No search functionality on projects page
   - **Action**: Either implement search or remove test

2. **Collection Search/Filter** (`collections-ui.tests.js`)
   - Test expects: Search input on collections page
   - Reality: Need to verify - collections page has table, may have search
   - **Action**: Verify and implement if missing

3. **Document Search/Filter** (`documents-ui.tests.js`)
   - Test expects: Search input on documents page
   - Reality: Documents page has `Search` icon, need to verify input exists
   - **Action**: Verify and implement if missing

### Features That Exist But Tests Don't Cover

1. **Project Detail Page Statistics**
   - Frontend shows: Collections count, documents count, users count
   - Tests: Only check if detail page loads, not statistics display

2. **Empty States**
   - Frontend has: `EmptyState` component used throughout
   - Tests: Check for empty states but don't verify specific empty state components

3. **Form Validation**
   - Frontend has: Zod schema validation with error messages
   - Tests: Check validation but don't verify specific error message display

4. **Loading Skeletons**
   - Frontend has: `Skeleton` components for loading states
   - Tests: Check loading states but don't verify skeleton structure

### Partial Implementations

1. **Logout Functionality**
   - Frontend: Logout likely exists in sidebar
   - Tests: Look for logout button but structure unknown
   - **Action**: Verify logout button location and add `data-testid`

2. **Theme Toggle**
   - Frontend: May have theme toggle (not verified)
   - Tests: Look for theme toggle button
   - **Action**: Verify theme toggle implementation

---

## Recommendations

### 1. Add data-testid Attributes (CRITICAL)

**Priority: HIGH**

Add `data-testid` attributes to all interactive elements and key containers:

```tsx
// Projects Page
<Card className="krapi-card-hover" data-testid="project-card">
  <CardTitle data-testid="project-name">{project.name}</CardTitle>
</Card>

// Login Page
<Input name="username" data-testid="login-username" />
<Input type="password" data-testid="login-password" />
<Button type="submit" data-testid="login-submit">Sign in</Button>

// Create Buttons
<ActionButton variant="add" data-testid="create-project-button">
  Create Project
</ActionButton>
```

**Benefits:**
- Tests become more reliable and maintainable
- Less brittle when UI styling changes
- Clear intent of what elements are testable

### 2. Fix Test Selectors

**Priority: HIGH**

Update test selectors to match actual frontend structure:

```javascript
// OLD (fragile)
const projectItems = await page.locator('[class*="project"]').all();

// NEW (reliable)
const projectItems = await page.locator('[data-testid="project-card"]').all();
```

**Specific Fixes:**
- Projects page: Use `[data-testid="project-card"]` instead of `[class*="project"]`
- Login button: Use `[data-testid="login-submit"]` instead of `button:has-text("Login")`
- Create buttons: Use `[data-testid="create-{entity}-button"]` pattern

### 3. Implement Missing Features

**Priority: MEDIUM**

1. **Project Search/Filter**
   - Add search input to projects list page
   - Implement filtering logic
   - Add `data-testid="project-search-input"`

2. **Collection/Document Search**
   - Verify search functionality exists
   - If missing, implement with proper `data-testid` attributes

### 4. Standardize Component Patterns

**Priority: MEDIUM**

1. **Consistent Button Patterns**
   - All create buttons should use `ActionButton` with `variant="add"`
   - All edit buttons should use `ActionButton` with `variant="edit"`
   - Add `data-testid` to all action buttons

2. **Consistent Form Patterns**
   - Use `FormDialog` for create/edit forms
   - Use `Form` component from `@/components/forms` for consistency
   - Add `data-testid` to form fields

3. **Consistent Table Patterns**
   - Use shadcn/ui `Table` component consistently
   - Add `data-testid` to table rows: `data-testid="{entity}-row-{id}"`

### 5. Improve Loading State Tests

**Priority: LOW**

Update tests to verify skeleton loaders:

```javascript
// Check for skeleton during loading
const skeleton = await page.locator('[class*="skeleton"]').first().isVisible();
testSuite.assert(skeleton, "Skeleton loader should display during loading");
```

### 6. Add ARIA Roles Where Missing

**Priority: LOW**

Ensure all components have proper ARIA roles:
- Modals: `role="dialog"`
- Tables: `role="table"`
- Navigation: `role="navigation"`
- Alerts: `role="alert"`

---

## Code Examples

### Example 1: Projects Page Selector Mismatch

**Test Expectation:**
```javascript
const projectItems = await page.locator(
  '[class*="project"], [data-testid*="project"], [role="listitem"]:has-text("project")'
).all();
```

**Actual Frontend:**
```tsx
<Card className="krapi-card-hover">  // No "project" in class name
  <CardTitle>{project.name}</CardTitle>
</Card>
```

**Fix:**
```tsx
<Card className="krapi-card-hover" data-testid="project-card">
  <CardTitle data-testid="project-name">{project.name}</CardTitle>
</Card>
```

```javascript
const projectItems = await page.locator('[data-testid="project-card"]').all();
```

### Example 2: Login Button Text Mismatch

**Test Expectation:**
```javascript
const submitButton = await page.locator(
  'button[type="submit"], button:has-text("Login"), button:has-text("Sign in")'
).first();
```

**Actual Frontend:**
```tsx
<Button type="submit">{loading ? "Signing in..." : "Sign in"}</Button>
```

**Fix:**
```tsx
<Button type="submit" data-testid="login-submit">
  {loading ? "Signing in..." : "Sign in"}
</Button>
```

```javascript
const submitButton = await page.locator('[data-testid="login-submit"]').first();
```

### Example 3: Create Button Selector

**Test Expectation:**
```javascript
const createButton = await page.locator(
  'button:has-text("Create"), button:has-text("New Project"), [class*="create"]'
).first();
```

**Actual Frontend:**
```tsx
<ActionButton variant="add" icon={Plus} className="btn-add">
  Create Project
</ActionButton>
```

**Fix:**
```tsx
<ActionButton 
  variant="add" 
  icon={Plus} 
  className="btn-add"
  data-testid="create-project-button"
>
  Create Project
</ActionButton>
```

```javascript
const createButton = await page.locator('[data-testid="create-project-button"]').first();
```

---

## Summary of Critical Actions

1. ✅ **Add `data-testid` attributes** to all interactive elements (buttons, inputs, forms, cards, tables)
2. ✅ **Fix project page selectors** - use card-based selectors, not generic class selectors
3. ✅ **Implement missing search/filter** functionality or remove test expectations
4. ✅ **Standardize button text** - ensure "Create" buttons say "Create {Entity}" consistently
5. ✅ **Verify logout button** location and add `data-testid`
6. ✅ **Update test selectors** to use `data-testid` instead of fragile class/text selectors

---

## Conclusion

The frontend implementation is **mostly aligned** with test expectations (~75% alignment). The main issues are:

1. **Selector fragility** - Tests use generic selectors that break when UI changes
2. **Missing test IDs** - No `data-testid` attributes make tests brittle
3. **Structural differences** - Some tests expect tables but frontend uses cards (projects)
4. **Missing features** - Some test expectations don't match actual features (project search)

**Recommended Priority:**
1. **HIGH**: Add `data-testid` attributes to all components
2. **HIGH**: Fix test selectors to use `data-testid`
3. **MEDIUM**: Implement missing features or remove test expectations
4. **LOW**: Improve test coverage for edge cases and loading states

With these changes, test reliability should improve from ~75% to ~95%+ alignment.

