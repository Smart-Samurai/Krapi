# Next.js API Routes Guide

Complete guide for using the KRAPI SDK in Next.js API routes.

## Overview

This guide shows you how to use the KRAPI SDK in Next.js API routes to create a backend API layer for your frontend application.

**⚠️ Important Note**: This guide is for using Krapi Server as a backend service from within your own Next.js application's API routes. This is different from connecting external client applications directly to Krapi Server.

### When to Use This Guide

- ✅ You're building a Next.js application that uses Krapi Server as its backend
- ✅ You want to create custom API routes in Next.js that proxy/transform requests to Krapi
- ✅ You need to add custom business logic or authentication layers

### When NOT to Use This Guide

- ❌ You're connecting an external application directly to Krapi Server → Use the [SDK documentation](https://www.npmjs.com/package/@smartsamurai/krapi-sdk) instead
- ❌ You're building the Krapi Server frontend itself → See `ARCHITECTURE_DATA_FLOW.md`

### URL Configuration Note

In this guide, Next.js API routes connect directly to the **Krapi Backend URL (port 3470)** because:

- Next.js API routes run server-side and can access internal services
- This avoids the frontend proxy layer (which is for external clients)
- Provides direct, faster access to the backend

**For external client applications**, always use the **Frontend URL (port 3498)** as documented in `ARCHITECTURE_DATA_FLOW.md`.

## Resources

- **NPM Package**: [https://www.npmjs.com/package/@smartsamurai/krapi-sdk](https://www.npmjs.com/package/@smartsamurai/krapi-sdk)
- **SDK Repository**: [https://github.com/Smart-Samurai/Krapi-SDK](https://github.com/Smart-Samurai/Krapi-SDK)
- **Native KRAPI App**: [https://github.com/GenorTG/Krapi](https://github.com/GenorTG/Krapi)
- **Organization**: [https://github.com/Smart-Samurai](https://github.com/Smart-Samurai)

## Architecture

```
Frontend (React/Vue/etc)
  ↓ HTTP Request
Next.js API Route (uses SDK in HTTP mode)
  ↓ HTTP Request
KRAPI Backend Server
  ↓ Database Query
Database
```

## Setup

### 1. Install the SDK

```bash
npm install @smartsamurai/krapi-sdk
```

### 2. Create SDK Client Instance

Create a shared SDK instance that can be used across all API routes:

```typescript
// lib/krapi-client.ts
import { krapi } from "@smartsamurai/krapi-sdk";

let sdkInitialized = false;

export async function initializeSDK() {
  if (!sdkInitialized) {
    await krapi.connect({
      endpoint: process.env.KRAPI_BACKEND_URL || "http://localhost:3470",
      apiKey: process.env.ADMIN_API_KEY || "admin-api-key",
    });
    sdkInitialized = true;
  }
  return krapi;
}

// Helper to extract auth token from request headers
export function getAuthToken(headers: Headers): string | undefined {
  const authorization = headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.substring(7);
  }
  return undefined;
}
```

## Basic API Route Example

### Projects API Route

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initializeSDK, getAuthToken } from "@/lib/krapi-client";
import { HttpError } from "@smartsamurai/krapi-sdk";

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const krapi = await initializeSDK();

    // Extract and set session token from Authorization header
    const token = getAuthToken(request.headers);
    if (token) {
      krapi.auth.setSessionToken(token);
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined;

    // Fetch projects using SDK
    const projects = await krapi.projects.getAll({
      search,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);

    // Handle HttpError for better error messages
    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          status: error.status,
          code: error.code,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch projects",
      },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const krapi = await initializeSDK();

    // Extract and set session token
    const token = getAuthToken(request.headers);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    krapi.auth.setSessionToken(token);

    // Get request body
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    // Create project using SDK
    const project = await krapi.projects.create(body);

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);

    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          status: error.status,
          code: error.code,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create project",
      },
      { status: 500 }
    );
  }
}
```

## Users API Route Example

### List Users

```typescript
// app/api/projects/[projectId]/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initializeSDK, getAuthToken } from "@/lib/krapi-client";
import { HttpError } from "@smartsamurai/krapi-sdk";

// GET /api/projects/[projectId]/users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const krapi = await initializeSDK();

    // Extract and set session token
    const token = getAuthToken(request.headers);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    krapi.auth.setSessionToken(token);

    // Get project ID from route params
    const { projectId } = await params;

    // Validate project ID format (UUID)
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        projectId
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined;

    // Fetch users using SDK
    const users = await krapi.users.getAll(projectId, {
      search,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);

    if (error instanceof HttpError) {
      // Handle authentication errors
      if (error.isAuthError) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication failed. Please log in again.",
            code: "AUTH_ERROR",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          status: error.status,
          code: error.code,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/users
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const krapi = await initializeSDK();

    // Extract and set session token
    const token = getAuthToken(request.headers);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    krapi.auth.setSessionToken(token);

    // Get project ID and request body
    const { projectId } = await params;
    const userData = await request.json();

    // Validate required fields
    if (!userData.username || !userData.email || !userData.password) {
      return NextResponse.json(
        { success: false, error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    // Create user using SDK
    const user = await krapi.users.create(projectId, {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: userData.role || "user",
      permissions: userData.permissions || [],
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone,
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);

    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          status: error.status,
          code: error.code,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create user",
      },
      { status: 500 }
    );
  }
}
```

### User by ID Route

```typescript
// app/api/projects/[projectId]/users/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initializeSDK, getAuthToken } from "@/lib/krapi-client";
import { HttpError } from "@smartsamurai/krapi-sdk";

// GET /api/projects/[projectId]/users/[userId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  try {
    const krapi = await initializeSDK();

    const token = getAuthToken(request.headers);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    krapi.auth.setSessionToken(token);

    const { projectId, userId } = await params;

    // Validate IDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId) || !uuidRegex.test(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID format" },
        { status: 400 }
      );
    }

    const user = await krapi.users.get(projectId, userId);

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user:", error);

    if (error instanceof HttpError) {
      if (error.status === 404) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          status: error.status,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user",
      },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[projectId]/users/[userId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  try {
    const krapi = await initializeSDK();

    const token = getAuthToken(request.headers);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    krapi.auth.setSessionToken(token);

    const { projectId, userId } = await params;
    const updates = await request.json();

    const user = await krapi.users.update(projectId, userId, updates);

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error updating user:", error);

    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          status: error.status,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/users/[userId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  try {
    const krapi = await initializeSDK();

    const token = getAuthToken(request.headers);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    krapi.auth.setSessionToken(token);

    const { projectId, userId } = await params;

    await krapi.users.delete(projectId, userId);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);

    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          status: error.status,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete user",
      },
      { status: 500 }
    );
  }
}
```

## Documents API Route Example

```typescript
// app/api/projects/[projectId]/collections/[collectionName]/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initializeSDK, getAuthToken } from "@/lib/krapi-client";
import { HttpError } from "@smartsamurai/krapi-sdk";

// GET /api/projects/[projectId]/collections/[collectionName]/documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; collectionName: string }> }
) {
  try {
    const krapi = await initializeSDK();

    const token = getAuthToken(request.headers);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    krapi.auth.setSessionToken(token);

    const { projectId, collectionName } = await params;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined;
    const orderBy = searchParams.get("orderBy") || undefined;
    const order = searchParams.get("order") as "asc" | "desc" | undefined;

    // Parse filter from query string
    let filter: Record<string, unknown> | undefined;
    const filterParam = searchParams.get("filter");
    if (filterParam) {
      try {
        filter = JSON.parse(filterParam);
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid filter format" },
          { status: 400 }
        );
      }
    }

    const documents = await krapi.documents.getAll(projectId, collectionName, {
      filter,
      limit,
      offset,
      orderBy,
      order,
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    console.error("Error fetching documents:", error);

    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          status: error.status,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch documents",
      },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/collections/[collectionName]/documents
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; collectionName: string }> }
) {
  try {
    const krapi = await initializeSDK();

    const token = getAuthToken(request.headers);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    krapi.auth.setSessionToken(token);

    const { projectId, collectionName } = await params;
    const body = await request.json();

    if (!body.data) {
      return NextResponse.json(
        { success: false, error: "Document data is required" },
        { status: 400 }
      );
    }

    const document = await krapi.documents.create(projectId, collectionName, {
      data: body.data,
      created_by: body.created_by,
    });

    return NextResponse.json(
      { success: true, data: document },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating document:", error);

    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          status: error.status,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create document",
      },
      { status: 500 }
    );
  }
}
```

## Best Practices

### 1. Centralized SDK Initialization

Always initialize the SDK in a shared file to avoid multiple connections:

```typescript
// lib/krapi-client.ts
let sdkInitialized = false;

export async function initializeSDK() {
  if (!sdkInitialized) {
    await krapi.connect({
      endpoint: process.env.KRAPI_BACKEND_URL || "http://localhost:3470",
      apiKey: process.env.ADMIN_API_KEY,
    });
    sdkInitialized = true;
  }
  return krapi;
}
```

### 2. Consistent Error Handling

Use HttpError for consistent error responses:

```typescript
import { HttpError } from "@smartsamurai/krapi-sdk";

try {
  // SDK call
} catch (error) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        status: error.status,
        code: error.code,
      },
      { status: error.status || 500 }
    );
  }
  // Handle other errors
}
```

### 3. Authentication Middleware

Create a reusable authentication check:

```typescript
// lib/auth-middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "./krapi-client";

export function requireAuth(request: NextRequest): string | NextResponse {
  const token = getAuthToken(request.headers);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  return token;
}

// Usage in route:
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }
  const token = authResult; // Use token
  // ... rest of handler
}
```

### 4. Input Validation

Always validate input before making SDK calls:

```typescript
// Validate UUID format
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(projectId)) {
  return NextResponse.json(
    { success: false, error: "Invalid project ID format" },
    { status: 400 }
  );
}
```

### 5. Environment Variables

Use environment variables for configuration:

```bash
# .env.local
KRAPI_BACKEND_URL=http://localhost:3470
ADMIN_API_KEY=your-admin-api-key
```

## Common Patterns

### Pattern 1: List with Pagination

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const items = await krapi.items.getAll({
    limit,
    offset,
  });

  return NextResponse.json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      offset,
    },
  });
}
```

### Pattern 2: Create with Validation

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate required fields
  const requiredFields = ["name", "email"];
  const missingFields = requiredFields.filter((field) => !body[field]);

  if (missingFields.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const item = await krapi.items.create(body);
  return NextResponse.json({ success: true, data: item }, { status: 201 });
}
```

### Pattern 3: Update with Partial Data

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updates = await request.json();

  // Only include defined fields
  const cleanUpdates: Record<string, unknown> = {};
  Object.keys(updates).forEach((key) => {
    if (updates[key] !== undefined) {
      cleanUpdates[key] = updates[key];
    }
  });

  const item = await krapi.items.update(id, cleanUpdates);
  return NextResponse.json({ success: true, data: item });
}
```

## Troubleshooting

### Issue: "HTTP clients not initialized"

**Solution:** Make sure to call `initializeSDK()` before using SDK methods:

```typescript
const krapi = await initializeSDK();
const projects = await krapi.projects.getAll();
```

### Issue: "Invalid or expired session"

**Solution:** Always set the session token from the request headers:

```typescript
const token = getAuthToken(request.headers);
if (token) {
  krapi.auth.setSessionToken(token);
}
```

### Issue: CORS errors

**Solution:** Configure CORS in your Next.js API routes or use Next.js middleware.

## Complete Example: Full CRUD API

See the examples above for complete CRUD implementations for:

- Projects
- Users
- Documents
- Collections

All examples include proper error handling, authentication, and validation.
