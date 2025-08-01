# Database Recovery and Error Handling Fixes

## Overview

This document describes the comprehensive fixes implemented to handle database errors and ensure the KRAPI backend can recover from various database issues automatically. All functionality is built directly into the SDK and backend, following the principle of avoiding standalone scripts.

## Key Improvements

### 1. Database Service Enhancements

#### Auto-Recovery System
- Added `checkHealth()` method to verify database connectivity and table integrity
- Added `autoRepair()` method that automatically:
  - Re-initializes missing tables
  - Runs pending migrations
  - Fixes schema inconsistencies
  - Creates default admin user if none exists

#### Retry Logic
- Implemented `queryWithRetry()` method with exponential backoff
- Automatically retries failed queries up to 3 times
- Detects connection errors and attempts to reconnect

#### Health Monitoring
- Periodic health checks during operations
- Automatic repair attempts when issues are detected
- Connection pool monitoring

### 2. Migration Service Improvements

#### Enhanced Schema Fixes
- Added migration to handle `is_active` vs `active` column naming conflicts
- Column type validation and correction (e.g., JSONB types)
- Missing index creation with error handling
- Graceful handling of migration failures

#### Robust Error Handling
- Each fix is wrapped in try-catch to continue with other fixes
- Detailed logging of schema modifications
- Transaction support for atomic changes

### 3. Project Controller Enhancements

#### Better Error Messages
- Detailed error codes for different failure scenarios
- Development mode includes error details
- Proper HTTP status codes (503 for DB errors, 409 for duplicates)

#### Input Validation
- Validates project names and IDs
- Trims whitespace from inputs
- Prevents empty project names

### 4. SDK Integration

The KRAPI SDK now includes comprehensive health and testing utilities:

#### Health Operations
```typescript
// Check system health
const health = await krapi.health.check();

// Check database health (admin only)
const dbHealth = await krapi.health.checkDatabase();

// Repair database issues (master admin only)
const repair = await krapi.health.repairDatabase();

// Run system diagnostics
const diagnostics = await krapi.health.runDiagnostics();
```

#### Testing Utilities
```typescript
// Create test project with sample data
const testProject = await krapi.testing.createTestProject({
  name: 'Test Project',
  withCollections: true,
  withDocuments: true,
  documentCount: 50
});

// Clean up test data
const cleanup = await krapi.testing.cleanup(testProject.data.id);

// Run integration tests
const testResults = await krapi.testing.runIntegrationTests();
```

### 5. API Endpoints

#### Health and Diagnostics
- `GET /health` - System health check (no auth)
- `GET /krapi/k1/admin/system/db-health` - Database health (admin read)
- `POST /krapi/k1/admin/system/db-repair` - Database repair (master admin)
- `POST /krapi/k1/admin/system/diagnostics` - Run diagnostics (admin read)

#### Testing Endpoints (Development Only)
- `POST /krapi/k1/testing/create-project` - Create test project
- `POST /krapi/k1/testing/cleanup` - Clean up test data
- `POST /krapi/k1/testing/integration-tests` - Run tests

## Usage

### Using the SDK for Health Monitoring

```typescript
import { KrapiClient } from '@krapi/sdk';

const krapi = new KrapiClient({
  baseUrl: 'http://localhost:3470/krapi/k1',
  sessionToken: 'your-token'
});

// Monitor system health
async function monitorHealth() {
  const health = await krapi.health.check();
  if (health.data?.status === 'unhealthy') {
    console.error('System unhealthy:', health.data.database);
    
    // Attempt repair if authorized
    const repair = await krapi.health.repairDatabase();
    console.log('Repair result:', repair);
  }
}
```

### Running Tests via SDK

```typescript
// Run comprehensive diagnostics
const diagnostics = await krapi.health.runDiagnostics();
console.log('Diagnostics:', diagnostics.data?.summary);

// Create test environment
const testProject = await krapi.testing.createTestProject({
  withCollections: true,
  withDocuments: true
});

// Run integration tests
const tests = await krapi.testing.runIntegrationTests();
console.log('Test results:', tests.data?.summary);

// Clean up
await krapi.testing.cleanup();
```

## Error Scenarios Handled

1. **Database Connection Lost**
   - Automatic reconnection attempts
   - Graceful degradation with proper error messages

2. **Missing Tables**
   - Automatic table creation
   - Migration system ensures schema consistency

3. **Column Mismatches**
   - Automatic column renaming (is_active → active)
   - Type corrections (text → JSONB)

4. **Missing Indexes**
   - Automatic index creation
   - Performance optimization

5. **No Admin Users**
   - Automatic default admin creation
   - Setup endpoint for initial configuration

## Frontend Integration

The frontend can use the SDK to monitor and handle database issues:

```typescript
// In your frontend code
const checkSystemHealth = async () => {
  const health = await krapi.health.check();
  
  if (!health.success || health.data?.status === 'unhealthy') {
    // Show warning to user
    showSystemWarning('Database issues detected');
    
    // Admin users can trigger repair
    if (hasAdminRole) {
      const repair = await krapi.health.repairDatabase();
      if (repair.success) {
        showSuccess('Database repaired successfully');
      }
    }
  }
};
```

## Development Workflow

1. **Start Backend**: The backend automatically handles database issues on startup
2. **Monitor Health**: Use `krapi.health.check()` to monitor system status
3. **Run Diagnostics**: Use `krapi.health.runDiagnostics()` for detailed checks
4. **Test Features**: Use `krapi.testing.*` methods for development testing
5. **Clean Up**: Use `krapi.testing.cleanup()` to remove test data

## Benefits of SDK Integration

1. **Discoverable**: All functionality is documented in the SDK types
2. **Maintainable**: Changes to the backend automatically reflect in SDK
3. **Type-safe**: TypeScript ensures correct usage
4. **Versioned**: SDK version tracks API compatibility
5. **Testable**: Built-in testing utilities for CI/CD integration

## Future Improvements

1. WebSocket support for real-time health monitoring
2. Automated health check scheduling in the SDK
3. Enhanced diagnostics with performance metrics
4. Database backup integration before repairs