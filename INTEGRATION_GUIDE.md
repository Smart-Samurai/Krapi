# Frontend-Backend Integration Guide

## Overview

This guide documents the integration between the KRAPI frontend (Next.js) and backend (Express) using the SDK pattern with Next.js API routes as an intermediary layer.

## Architecture

```
Frontend (Browser) → Next.js API Routes → Backend SDK → Backend API Server
```

### Flow Diagram

1. **Frontend Component** makes a request using `apiClient`
2. **API Client** sends HTTP request to Next.js API route
3. **Next.js API Route** uses the Backend SDK to call the actual backend
4. **Backend Server** processes the request and returns response
5. **Response** flows back through the same chain

## Key Components

### 1. Backend SDK (`/frontend-manager/lib/krapi-sdk/`)

The SDK is copied from the backend and provides a type-safe client for interacting with the backend API.

- `index.ts` - Main SDK client with all API methods
- `types.ts` - TypeScript type definitions

### 2. API Client (`/frontend-manager/lib/api-client.ts`)

A frontend service that wraps fetch calls to Next.js API routes:

```typescript
import { apiClient } from '@/lib/api-client';

// Example usage
const projects = await apiClient.projects.getAll();
const user = await apiClient.auth.getCurrentUser();
```

### 3. Next.js API Routes (`/frontend-manager/app/api/`)

API routes act as a proxy between the frontend and backend:

- `/api/auth/*` - Authentication endpoints
- `/api/admin/*` - Admin user management
- `/api/projects/*` - Project management
- `/api/database/*` - Database operations
- `/api/storage/*` - File storage

### 4. Authentication Context (`/frontend-manager/contexts/AuthContext.tsx`)

Manages authentication state and provides auth methods to components:

```typescript
const { user, login, logout, isAuthenticated } = useAuth();
```

## API Route Structure

Each API route follows this pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createBackendClient, getAuthToken } from '@/app/api/lib/sdk-client';

export async function GET(request: NextRequest) {
  try {
    // Extract auth token from headers
    const authToken = getAuthToken(request.headers);
    
    // Create SDK client with auth token
    const client = createBackendClient(authToken);
    
    // Call backend using SDK
    const response = await client.someMethod();
    
    // Return response
    return NextResponse.json(response);
  } catch (error) {
    // Handle errors
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

## Authentication Flow

1. User enters credentials in login form
2. Login form calls `useAuth().login(email, password)`
3. AuthContext calls `apiClient.auth.login()`
4. API client sends POST to `/api/auth/login`
5. API route uses SDK to authenticate with backend
6. Backend returns JWT token
7. Token is stored in localStorage and AuthContext state
8. Subsequent requests include token in Authorization header

## Environment Configuration

### Frontend (.env.local)

```env
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=KRAPI Manager
```

### Backend (.env)

```env
PORT=3001
JWT_SECRET=your-secret-key
DATABASE_URL=your-database-url
```

## Usage Examples

### Fetching Data

```typescript
// In a React component
import { apiClient } from '@/lib/api-client';

const MyComponent = () => {
  const [projects, setProjects] = useState([]);
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await apiClient.projects.getAll();
        if (response.success) {
          setProjects(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };
    
    fetchProjects();
  }, []);
  
  return (
    // Render projects
  );
};
```

### Creating Resources

```typescript
const handleCreateProject = async (data) => {
  try {
    const response = await apiClient.projects.create({
      name: data.name,
      description: data.description
    });
    
    if (response.success) {
      // Handle success
      router.push(`/projects/${response.data.id}`);
    } else {
      // Handle error
      setError(response.error);
    }
  } catch (error) {
    console.error('Failed to create project:', error);
  }
};
```

## Testing

A test script is provided to verify the integration:

```bash
# Make sure both backend and frontend are running
npm install axios # If not already installed
node test-integration.js
```

The test script will:
1. Check backend health
2. Test authentication through frontend API route
3. Test authenticated API calls

## Security Considerations

1. **API Routes Protection**: All API routes check for authentication token
2. **Token Storage**: JWT tokens are stored in localStorage (consider using httpOnly cookies for production)
3. **CORS**: Backend should be configured to accept requests only from the frontend domain
4. **Environment Variables**: Sensitive data like backend URL should be in environment variables

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check if token is being passed correctly in headers
2. **Network Errors**: Verify backend URL in environment variables
3. **CORS Errors**: Ensure backend CORS configuration allows frontend origin
4. **Type Errors**: Make sure SDK types match backend response structure

### Debug Tips

- Check browser DevTools Network tab for API calls
- Verify token in localStorage: `localStorage.getItem('auth_token')`
- Check Next.js API route logs in terminal
- Test backend directly using tools like Postman

## Future Improvements

1. Implement request caching and optimistic updates
2. Add request retry logic with exponential backoff
3. Implement proper error boundaries
4. Add request/response interceptors for logging
5. Consider using React Query or SWR for data fetching
6. Implement WebSocket support for real-time updates