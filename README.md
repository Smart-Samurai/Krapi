# KRAPI Application - Build, Fix, Test Workflow

## Overview

Use ONLY root-level scripts from `package.json` to orchestrate all apps. Do not cd into subpackages for builds/runs.

## Workflow Steps

### 1. Build All Applications (root script)

```bash
pnpm run build:all
```

- Builds SDK, then backend, then frontend in correct order.

### 2. Fix Build Errors

- Address TypeScript, dependency, or config errors reported by the root build.
- After fixes, rerun:

```bash
pnpm run build:all
```

### 3. Start Services in Dev Mode (root script)

```bash
pnpm run dev:all
```

- Starts backend and frontend concurrently after ensuring SDK is built.

### 4. Run Comprehensive Test Suite

From test suite directory (tooling expects this path):

```bash
cd KRAPI-COMPREHENSIVE-TEST-SUITE
node run-comprehensive-tests.js
```

This will:

- Destroy and recreate the Postgres container/volumes
- Start dev services via root scripts
- Wait for readiness and run full tests through frontend->backend

### 5. Fix Testing Errors and Implement Missing Functionality

**CRITICAL ARCHITECTURAL RULES:**

#### TypeScript Safety Requirements

- **Everything MUST be written in TypeScript** - no JavaScript exceptions
- All API routes, SDK methods, data types, and responses MUST have explicit TypeScript types
- Type mismatches will be caught at compile time before testing
- Use strict TypeScript configuration with no `any` types

#### SDK-First Development Workflow

When tests find missing functionality, follow this exact order:

1. **Check SDK**: Does the required method exist in `@krapi/sdk`?

   - If YES → Use it in backend/frontend
   - If NO → Create it in SDK first, then use it

2. **Backend Implementation**: Backend routes MUST ONLY use SDK methods

   - Backend has NO unique methods - it's purely a routing layer
   - All business logic lives in the SDK
   - Backend imports and calls SDK methods with proper TypeScript types
   - **NEVER create separate, disconnected controllers or services that bypass the SDK**

3. **Frontend Implementation**: Frontend API routes MUST use SDK methods
   - Frontend calls SDK client methods or forwards to backend SDK methods
   - Consistent type safety between frontend and backend through shared SDK types

#### CRITICAL ARCHITECTURAL RULE - NO EXCEPTIONS

**NEVER EVER create non-SDK routes, controllers, APIs, or any functionality in frontend or backend that is not connected to the SDK code.**

- **Backend**: Must use `backendSDK.methodName()` for ALL operations
- **Frontend**: Must use `krapi.methodName()` for ALL operations
- **No standalone implementations**: Every piece of functionality must go through the SDK
- **SDK is the single source of truth**: All business logic, validation, and data operations live in the SDK
- **Backend is just HTTP routing**: Backend only wires SDK methods to HTTP endpoints
- **Frontend is just UI**: Frontend only calls SDK methods and displays results

This ensures perfect plug-and-socket compatibility between frontend and backend.

#### Implementation Order

```
Missing Functionality → SDK Method (with types) → Backend Route (using SDK) → Frontend Route (using SDK) → Test
```

#### Type Safety Benefits

- **Compile-time validation**: API mismatches caught before testing
- **Intellisense support**: Full autocomplete for all SDK methods and types
- **Refactor safety**: Type system prevents breaking changes
- **Documentation**: Types serve as living documentation

- Make changes following the SDK-first workflow above
- Rebuild all with type checking:

```bash
npm run build:all
```

- Re-run comprehensive tests:

```bash
cd KRAPI-COMPREHENSIVE-TEST-SUITE
node run-comprehensive-tests.js
```

### 6. Repeat Until All Tests Pass

- Iterate: fix -> build -> test, until green.

## One-shot Commands for LLM Execution

```bash
# Build everything
pnpm run build:all

# Start services (in a separate terminal if needed)
pnpm run dev:all

# Run comprehensive tests (handles DB reset internally)
cd KRAPI-COMPREHENSIVE-TEST-SUITE && node run-comprehensive-tests.js
```

## Notes

- Always use root scripts (`pnpm run build:all`, `pnpm run dev:all`).
- Never manually build subpackages directly.
- Tests must go through the frontend API -> backend API flow.
- Fix errors robustly (no commenting out), maintain type safety.
