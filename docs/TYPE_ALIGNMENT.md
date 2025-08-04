# Type Alignment System

This document explains how the KRAPI frontend stays aligned with the SDK types to ensure type safety across the entire application.

## Overview

The frontend automatically validates that it's using SDK types correctly through several mechanisms:

1. **Strict TypeScript Configuration** - The frontend uses `"strict": true` in tsconfig.json
2. **Type Re-exports** - All SDK types are re-exported through `/lib/krapi.ts`
3. **Compile-time Type Checks** - Special type checking files validate alignment
4. **Pre-build Validation** - Build process ensures types are aligned before deployment

## How It Works

### 1. SDK Type Imports

The frontend imports all types from the `@krapi/sdk` package:

```typescript
// lib/krapi.ts
export {
  type ApiResponse,
  type PaginatedResponse,
  type AdminUser,
  type Project,
  type Collection,
  // ... all other types
} from "@krapi/sdk";
```

### 2. Type Validation Files

#### `/scripts/check-sdk-types.ts`
This file contains compile-time checks that validate the SDK methods return the expected types:

```typescript
// Example: This will fail to compile if SDK changes
const projects: PaginatedResponse<Project> = await sdk.projects.getAll();
```

#### `/types/sdk-alignment.ts`
This file contains:
- Type guards for runtime validation
- Form data interfaces that match SDK expectations
- Compile-time assertions about type structure

### 3. Automated Checks

#### Type Check Commands

```bash
# Check frontend types only
pnpm type-check

# Check SDK type alignment
pnpm type-check:sdk

# Check both
pnpm type-check:all
```

#### Pre-build Validation

The build process automatically:
1. Builds the SDK package
2. Runs all type checks
3. Fails the build if types don't align

```bash
pnpm build  # Automatically runs prebuild script
```

### 4. CI/CD Integration

The `.github/workflows/type-check.yml` workflow ensures:
- Every push and PR is type-checked
- SDK changes that break the frontend are caught
- Type mismatches prevent deployment

## Benefits

1. **Early Detection** - Type mismatches are caught at compile time, not runtime
2. **Automatic Validation** - No manual checking required
3. **IDE Support** - Full IntelliSense and type hints
4. **Refactoring Safety** - Changes to SDK types immediately show where updates are needed
5. **Documentation** - Types serve as living documentation

## Adding New SDK Types

When adding new types to the SDK:

1. Add the type to the SDK package (`/packages/krapi-sdk/src/types.ts`)
2. Export it from the SDK index (`/packages/krapi-sdk/src/index.ts`)
3. Re-export it from the frontend (`/frontend-manager/lib/krapi.ts`)
4. Add validation in `/scripts/check-sdk-types.ts` if it's a new API method
5. Run `pnpm type-check:all` to ensure alignment

## Troubleshooting

### Type Check Failures

If type checks fail:

1. Check the error message for the specific type mismatch
2. Update the frontend code to match the new SDK types
3. If the SDK changed unexpectedly, verify the changes are intentional
4. Run `pnpm build` in the SDK package if types seem outdated

### Common Issues

1. **Circular type references** - Use import types: `type User = import('@krapi/sdk').AdminUser`
2. **Missing SDK build** - Run `cd packages/krapi-sdk && pnpm build`
3. **Outdated dependencies** - Run `pnpm install` in the workspace root

## Best Practices

1. **Always import types from `@/lib/krapi`** instead of directly from `@krapi/sdk`
2. **Use type guards** from `/types/sdk-alignment.ts` for runtime validation
3. **Run type checks locally** before pushing changes
4. **Keep form interfaces** aligned with SDK expectations
5. **Document breaking changes** when updating SDK types