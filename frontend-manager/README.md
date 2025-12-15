# KRAPI Frontend Manager

The KRAPI Frontend Manager is a Next.js-based web interface that serves as both the management UI and the API gateway for external client applications.

## Architecture

### Dual Role

The frontend serves two primary functions:

1. **Web Management Interface**: Provides a full-featured web UI for managing KRAPI projects, collections, users, and settings
2. **API Gateway/Proxy**: Acts as a proxy layer between external clients and the backend, handling:
   - CORS configuration
   - Authentication and authorization
   - Request routing and validation
   - Error handling and formatting

### Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: Redux Toolkit
- **Form Handling**: React Hook Form + Zod
- **SDK**: @smartsamurai/krapi-sdk

## Project Structure

```
frontend-manager/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (sidebar)/         # Main application pages with sidebar
│   └── api/               # API route handlers (proxy to backend)
│       └── krapi/k1/      # KRAPI API routes
├── components/             # React components
│   ├── ui/                # Reusable UI components (Radix UI)
│   ├── forms/             # Form components
│   ├── common/            # Common components
│   └── ...                # Feature-specific components
├── lib/                    # Utility libraries
│   ├── backend-sdk-client.ts  # Backend SDK client
│   └── config.ts          # Configuration management
├── store/                  # Redux store configuration
├── contexts/              # React contexts
└── hooks/                 # Custom React hooks
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Or with pnpm
pnpm install
```

### Environment Configuration

Create `.env.local` file (or copy from `env.example`):

```bash
# Backend API URL
KRAPI_BACKEND_URL=http://localhost:3470
NEXT_PUBLIC_API_URL=http://localhost:3470

# Frontend URL
NEXT_PUBLIC_APP_URL=http://localhost:3498
NEXT_PUBLIC_LISTEN_HOST=localhost

# Security (CORS)
ALLOWED_ORIGINS=
```

**Note**: Configuration can also be managed using the centralized management script:
```bash
npm run krapi config set frontend.url https://your-domain.com
```

### Development Mode

```bash
# Start development server
npm run dev

# Or use the centralized management script
npm run krapi start --dev
```

The frontend will be available at `http://localhost:3498`

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## API Routes Structure

The frontend exposes API routes under `/api/krapi/k1/` that proxy requests to the backend:

### Route Pattern

All KRAPI API routes follow this pattern:
```
/api/krapi/k1/{resource}/{action}
```

### Example Routes

- `/api/krapi/k1/auth/login` - Admin login
- `/api/krapi/k1/projects` - List/create projects
- `/api/krapi/k1/projects/{id}/collections` - Collection operations
- `/api/krapi/k1/projects/{id}/storage/files` - File storage operations

### Route Implementation

All API routes:
1. Extract authentication token from request headers
2. Create authenticated backend SDK client
3. Call SDK method corresponding to the route
4. Return formatted response

Example:
```typescript
// app/api/krapi/k1/projects/route.ts
export async function GET(request: NextRequest) {
  const authToken = getAuthToken(request.headers);
  const sdk = await createAuthenticatedBackendSdk(authToken);
  const projects = await sdk.projects.list();
  return NextResponse.json({ success: true, data: projects });
}
```

## Configuration Options

### Frontend URL Configuration

For production deployments, configure the frontend URL to prevent unauthorized access:

```bash
# Set frontend URL
npm run krapi config set frontend.url https://your-domain.com

# Set allowed origins for CORS
npm run krapi security set-allowed-origins https://app.example.com,https://api.example.com
```

### Network Configuration

Control which network interfaces the frontend listens on:

- `localhost` (default): Only accessible from local machine
- `0.0.0.0`: Accessible from all network interfaces (requires proper security)

```bash
npm run krapi config set frontend.host 0.0.0.0
```

## Key Features

### SDK-First Architecture

All API routes use the KRAPI SDK exclusively. No direct `fetch()` calls to the backend.

### Authentication

- Admin users: JWT token-based authentication
- API keys: Bearer token authentication
- Session management via cookies

### Error Handling

- Centralized error handling
- Consistent error response format
- SDK error propagation

### Type Safety

- Full TypeScript support
- SDK types imported directly from `@smartsamurai/krapi-sdk`
- No manual type definitions

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
```

## Development Guidelines

### Adding New API Routes

1. Create route file in `app/api/krapi/k1/{resource}/route.ts`
2. Use `createAuthenticatedBackendSdk()` to get SDK instance
3. Call SDK method (verify method exists in SDK first)
4. Return formatted response

### Adding New UI Pages

1. Create page in `app/(sidebar)/{page-name}/page.tsx`
2. Use components from `components/` directory
3. Use SDK client from `lib/backend-sdk-client.ts` for data fetching
4. Follow existing patterns for consistency

### Component Guidelines

- Use Radix UI components from `components/ui/`
- Follow Tailwind CSS styling patterns
- Use TypeScript for all components
- Add JSDoc comments for exported functions

## Troubleshooting

### Port Already in Use

If port 3498 is already in use:

```bash
# Check what's using the port
npm run krapi status

# Stop services
npm run krapi stop

# Or change the port
npm run krapi config set frontend.port 8080
```

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### SDK Connection Issues

Ensure backend is running and accessible:
```bash
npm run krapi status
```

Check backend URL configuration:
```bash
npm run krapi config get backend.url
```

## Security Considerations

1. **CORS Configuration**: Always configure `ALLOWED_ORIGINS` in production
2. **Frontend URL**: Set `FRONTEND_URL` to your public domain
3. **HTTPS**: Use reverse proxy (nginx, Caddy) for HTTPS in production
4. **Authentication**: All API routes require authentication tokens

## Related Documentation

- [Main README](../README.md) - Overall project documentation
- [Backend README](../backend-server/README.md) - Backend architecture
- [SDK Documentation](https://www.npmjs.com/package/@smartsamurai/krapi-sdk) - SDK reference

