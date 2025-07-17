# Krapi CMS - Modular Architecture Guide

## Overview

This guide outlines the new modular architecture designed to make the Krapi CMS codebase easily debuggable, maintainable, and understandable for developers of all skill levels. Each functionality is organized into self-contained, "plug-and-play" modules.

## 🎯 Goals

1. **Easy Debugging**: Clear separation of concerns makes it easy to isolate issues
2. **Developer Friendly**: Junior developers can understand and contribute to specific modules
3. **Plug-and-Play**: Features can be added, removed, or modified independently
4. **Self-Contained**: Each module has its own types, services, controllers, and documentation
5. **Shared Resources**: Common utilities are centralized to avoid duplication

## 📁 Directory Structure

### Backend Architecture (`api-server/src/`)

```
api-server/src/
├── features/                    # Feature-based modules
│   ├── authentication/          # User authentication & authorization
│   │   ├── controllers/         # HTTP request handlers
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # Auth-specific middleware
│   │   ├── types/              # TypeScript interfaces
│   │   ├── routes/             # Route definitions
│   │   ├── tests/              # Unit tests
│   │   └── README.md           # Feature documentation
│   │
│   ├── content-management/      # Content CRUD operations
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── types/
│   │   ├── routes/
│   │   ├── tests/
│   │   └── README.md
│   │
│   ├── file-management/         # File upload & storage
│   ├── email-system/           # Email templates & sending
│   ├── user-management/        # User CRUD operations
│   ├── api-management/         # Dynamic API endpoints
│   ├── route-management/       # Dynamic routing
│   ├── search-system/          # Search functionality
│   ├── notification-system/    # Notifications
│   └── health-monitoring/      # System health checks
│
├── shared/                     # Common utilities
│   ├── database/
│   │   ├── connection.ts       # Database connection singleton
│   │   ├── migrations/         # Database schema updates
│   │   └── seeds/              # Test data
│   │
│   ├── utils/
│   │   ├── validation.ts       # Common validation functions
│   │   ├── encryption.ts       # Encryption utilities
│   │   ├── logger.ts           # Logging utilities
│   │   ├── email.ts            # Email utilities
│   │   └── file-helpers.ts     # File operation helpers
│   │
│   ├── middleware/
│   │   ├── cors.ts             # CORS configuration
│   │   ├── rate-limiter.ts     # Rate limiting
│   │   └── error-handler.ts    # Global error handling
│   │
│   └── types/
│       ├── api.ts              # Common API types
│       ├── database.ts         # Database types
│       └── express.ts          # Express extensions
│
├── app.ts                      # Express app setup
└── server.ts                   # Server startup
```

### Frontend Architecture (`admin-frontend/`)

```
admin-frontend/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Authentication pages
│   ├── dashboard/              # Dashboard pages
│   └── features/               # Feature-specific pages
│       ├── content/
│       ├── users/
│       ├── files/
│       └── settings/
│
├── components/                 # Reusable UI components
│   ├── shared/                 # Common components
│   │   ├── ui/                 # Basic UI elements
│   │   ├── forms/              # Form components
│   │   ├── navigation/         # Navigation components
│   │   └── layout/             # Layout components
│   │
│   └── features/               # Feature-specific components
│       ├── authentication/
│       ├── content-management/
│       ├── user-management/
│       └── file-management/
│
├── lib/                        # Utilities and configurations
│   ├── api/                    # API client functions
│   │   ├── auth.ts
│   │   ├── content.ts
│   │   ├── users.ts
│   │   └── files.ts
│   │
│   ├── hooks/                  # Custom React hooks
│   ├── utils/                  # Helper functions
│   └── validation/             # Form validation schemas
│
├── contexts/                   # React contexts
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── NotificationContext.tsx
│
└── types/                      # TypeScript type definitions
    ├── auth.ts
    ├── content.ts
    ├── user.ts
    └── api.ts
```

## 🔧 Feature Module Structure

Each feature module follows a consistent structure:

### Backend Feature Module

```
feature-name/
├── controllers/
│   └── FeatureController.ts    # HTTP request handling
├── services/
│   └── FeatureService.ts       # Business logic
├── middleware/
│   └── feature-middleware.ts   # Feature-specific middleware
├── types/
│   └── index.ts               # TypeScript interfaces
├── routes/
│   └── index.ts               # Route definitions
├── tests/
│   ├── controller.test.ts     # Controller tests
│   └── service.test.ts        # Service tests
└── README.md                  # Feature documentation
```

### Frontend Feature Module

```
feature-name/
├── components/                 # Feature UI components
│   ├── FeatureList.tsx
│   ├── FeatureForm.tsx
│   └── FeatureDetail.tsx
├── pages/                     # Next.js pages
│   ├── page.tsx
│   └── [id]/page.tsx
├── hooks/                     # Feature-specific hooks
│   └── useFeature.ts
├── types.ts                   # Feature types
└── README.md                  # Feature documentation
```

## 🛠 Implementation Examples

### 1. Authentication Feature (Already Implemented)

**Purpose**: Handle user login, registration, and session management

**Files Created**:
- `api-server/src/features/authentication/types/index.ts`
- `api-server/src/features/authentication/services/AuthService.ts`
- `api-server/src/features/authentication/controllers/AuthController.ts`

**Key Benefits**:
- All auth logic is in one place
- Easy to test individual components
- Clear separation between HTTP handling and business logic
- Standardized error handling and responses

### 2. Content Management Feature (To Be Implemented)

**Purpose**: Handle CRUD operations for content items

**Structure**:
```typescript
// types/index.ts
export interface ContentItem {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  // ... other fields
}

// services/ContentService.ts
export class ContentService {
  static async createContent(data: CreateContentData): Promise<ContentItem> {
    // Business logic for creating content
  }
  
  static async getContent(id: string): Promise<ContentItem | null> {
    // Business logic for retrieving content
  }
  
  // ... other methods
}

// controllers/ContentController.ts
export class ContentController {
  static async create(req: Request, res: Response): Promise<void> {
    // HTTP request handling for content creation
  }
  
  // ... other endpoints
}
```

## 📋 Benefits of This Architecture

### For Junior Developers

1. **Clear Boundaries**: Each feature is self-contained with clear boundaries
2. **Easy Navigation**: Consistent file structure across all features
3. **Focused Learning**: Can learn one feature at a time without understanding the entire codebase
4. **Safe Changes**: Modifications to one feature are unlikely to break others

### For Debugging

1. **Isolation**: Issues can be quickly isolated to specific features
2. **Traceability**: Clear path from HTTP request → Controller → Service → Database
3. **Logging**: Each layer can have specific logging for easier troubleshooting
4. **Testing**: Each component can be tested independently

### For Code Review

1. **Focused Reviews**: PRs can focus on specific features
2. **Consistent Patterns**: All features follow the same structure
3. **Easy Validation**: Reviewers can quickly verify completeness

## 🔄 How to Add a New Feature

### Backend Feature

1. **Create Feature Directory**:
   ```bash
   mkdir -p api-server/src/features/my-feature/{controllers,services,types,routes,tests}
   ```

2. **Define Types** (`types/index.ts`):
   ```typescript
   export interface MyFeatureData {
     // Define your interfaces
   }
   ```

3. **Implement Service** (`services/MyFeatureService.ts`):
   ```typescript
   export class MyFeatureService {
     // Implement business logic
   }
   ```

4. **Create Controller** (`controllers/MyFeatureController.ts`):
   ```typescript
   export class MyFeatureController {
     // Handle HTTP requests
   }
   ```

5. **Define Routes** (`routes/index.ts`):
   ```typescript
   import { Router } from 'express';
   import { MyFeatureController } from '../controllers/MyFeatureController';
   
   const router = Router();
   router.get('/', MyFeatureController.list);
   // ... other routes
   
   export default router;
   ```

6. **Add Tests** (`tests/`):
   ```typescript
   // Write unit tests for services and controllers
   ```

7. **Document Feature** (`README.md`):
   ```markdown
   # My Feature
   
   ## Purpose
   ## API Endpoints
   ## Usage Examples
   ```

### Frontend Feature

1. **Create Feature Components**:
   ```bash
   mkdir -p admin-frontend/components/features/my-feature
   ```

2. **Create API Client**:
   ```typescript
   // lib/api/my-feature.ts
   export const myFeatureAPI = {
     // API methods
   };
   ```

3. **Create React Components**:
   ```typescript
   // components/features/my-feature/MyFeatureList.tsx
   ```

4. **Add Pages**:
   ```typescript
   // app/features/my-feature/page.tsx
   ```

## 🧪 Testing Strategy

### Unit Tests
- Each service method should have unit tests
- Controllers should have tests for request/response handling
- Utilities should be thoroughly tested

### Integration Tests
- Test complete workflows (e.g., user registration → login → access protected resource)
- Test database interactions
- Test API endpoint responses

### Example Test Structure
```typescript
// tests/auth.test.ts
describe('Authentication Feature', () => {
  describe('AuthService', () => {
    it('should authenticate valid user', async () => {
      // Test service logic
    });
  });
  
  describe('AuthController', () => {
    it('should return 401 for invalid credentials', async () => {
      // Test HTTP responses
    });
  });
});
```

## 📖 Documentation Standards

Each feature must include:

1. **README.md** with:
   - Purpose and overview
   - API endpoints (backend)
   - Component usage (frontend)
   - Examples
   - Dependencies

2. **Inline Comments**:
   - JSDoc for all public methods
   - Complex logic explanations
   - Type annotations

3. **TypeScript Types**:
   - All interfaces properly defined
   - Export types for reuse
   - Avoid `any` types

## 🔒 Security Considerations

1. **Input Validation**: Each feature validates its own inputs
2. **Authorization**: Features check permissions independently
3. **Error Handling**: No sensitive data in error messages
4. **Logging**: Security events are logged appropriately

## 🚀 Migration Strategy

### Phase 1: Core Features (In Progress)
- ✅ Authentication
- ⏳ Content Management
- ⏳ User Management

### Phase 2: Advanced Features
- File Management
- Email System
- API Management

### Phase 3: System Features
- Search System
- Notification System
- Health Monitoring

### Phase 4: Cleanup
- Remove old monolithic files
- Update documentation
- Performance optimization

## 📞 Getting Help

### For Developers

1. **Feature Documentation**: Check the feature's README.md
2. **Code Examples**: Look at existing features for patterns
3. **Type Definitions**: TypeScript interfaces provide clear contracts
4. **Tests**: Unit tests show usage examples

### Common Debugging Steps

1. **Identify the Feature**: Which module is involved?
2. **Check the Controller**: Is the HTTP request being handled correctly?
3. **Review the Service**: Is the business logic working as expected?
4. **Validate Database**: Are database operations successful?
5. **Check Shared Utilities**: Are common functions working properly?

## 🎯 Best Practices

1. **Single Responsibility**: Each module should have one clear purpose
2. **Dependency Injection**: Use shared services rather than tight coupling
3. **Error Boundaries**: Handle errors at appropriate levels
4. **Consistent Naming**: Follow established conventions
5. **Documentation**: Always document public interfaces
6. **Testing**: Write tests before refactoring
7. **Type Safety**: Use TypeScript effectively

---

This modular architecture ensures that the Krapi CMS remains maintainable, debuggable, and accessible to developers of all skill levels while supporting rapid feature development and easy code review processes.