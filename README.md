# KRAPI - Modern Headless CMS

KRAPI is a modern, scalable headless CMS built with TypeScript, featuring a powerful SDK-first approach and automatic database recovery capabilities.

## Project Structure

```
├── backend-server/      # Express.js backend API
├── frontend-manager/    # Next.js admin dashboard
├── packages/
│   └── krapi-sdk/      # TypeScript SDK
├── bin/                # Development scripts
├── docs/               # Documentation
└── docker-compose.yml  # PostgreSQL setup
```

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- Docker (for PostgreSQL)

### Development Setup

1. **Start PostgreSQL**
   ```bash
   docker-compose up -d postgres
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Start Development Servers**
   
   **Windows:**
   ```bash
   ./bin/start-krapi.bat
   ```
   
   **Linux/Mac:**
   ```bash
   ./bin/start-krapi.sh
   ```

This will start:
- Backend API on http://localhost:3470
- Frontend Dashboard on http://localhost:3469
- SDK in watch mode

## Architecture

### SDK-First Development
Following the principle: "SDK is the most important part of the app. It describes all functionality."

1. Mock functionality in SDK first
2. Implement in backend
3. Import in frontend

### Key Features

- **Automatic Database Recovery**: Self-healing database with automatic schema fixes
- **Type-Safe SDK**: Full TypeScript support with comprehensive types
- **Multi-Project Support**: Manage multiple projects with isolated data
- **Role-Based Access Control**: Granular permissions system
- **File Storage**: Built-in file management
- **Real-time Health Monitoring**: System diagnostics and health checks

## Development Principles

1. **No Standalone Scripts**: All functionality is built into the SDK and backend
2. **Type Safety**: Full TypeScript coverage
3. **API-First**: Backend defines the API, frontend consumes via SDK
4. **Self-Documenting**: Code and SDK serve as documentation

## Documentation

- [Database Recovery System](docs/DATABASE_RECOVERY_FIXES.md)
- [Form Components](frontend-manager/components/forms/README.md)
- [Styled Components](frontend-manager/components/styled/README.md)

## Testing

Use the built-in SDK testing utilities:

```typescript
// Run diagnostics
const diagnostics = await krapi.health.runDiagnostics();

// Create test project
const testProject = await krapi.testing.createTestProject({
  withCollections: true,
  withDocuments: true
});

// Run integration tests
const results = await krapi.testing.runIntegrationTests();
```

## License

MIT