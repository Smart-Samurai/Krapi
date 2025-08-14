# KRAPI - Perfect Plug and Socket Backend-as-a-Service

> **The only BaaS you need with perfect client/server harmony**

KRAPI is a revolutionary Backend-as-a-Service platform that implements a **perfect plug and socket architecture**. Frontend applications (plug) and backend services (socket) fit together perfectly, allowing you to write business logic once and use it everywhere.

## 🔌⚡ The Plug and Socket Revolution

```typescript
// FRONTEND (The Plug) 🔌
import { krapi } from "@krapi/sdk";
await krapi.connect({ endpoint: "https://api.myapp.com", apiKey: "key" });
const project = await krapi.projects.create({ name: "My Project" });

// BACKEND (The Socket) ⚡
import { krapi } from "@krapi/sdk";
await krapi.connect({ database: dbConnection });
const project = await krapi.projects.create({ name: "My Project" }); // IDENTICAL!
```

**Every method works identically in both environments. Perfect compatibility guaranteed.**

## 🚀 Quick Start

### 1. One Command Setup

```bash
# Clone the repository
git clone https://github.com/your-org/krapi.git
cd krapi

# Start everything with one command!
pnpm run dev
```

This single command will:

- Install all dependencies
- Build the SDK
- Start PostgreSQL (via Docker)
- Start backend server at `http://localhost:3470`
- Start frontend manager at `http://localhost:3469`
- Login with: **admin** / **admin123**

### ⚡ Even Faster Startup

```bash
# Skip SDK build for faster startup
pnpm run dev:quick
```

### 2. Use the SDK in Your Apps

#### Frontend Application

```typescript
import { krapi } from "@krapi/sdk";

// Connect to your KRAPI backend
await krapi.connect({
  endpoint: "http://localhost:3470/krapi/k1",
  apiKey: "your-api-key",
});

// Create and manage data
const project = await krapi.projects.create({ name: "My App" });
const collection = await krapi.collections.create(project.id, {
  name: "tasks",
  fields: [
    { name: "title", type: "string", required: true },
    { name: "completed", type: "boolean", default: false },
  ],
});

const task = await krapi.documents.create(project.id, "tasks", {
  data: { title: "Setup KRAPI", completed: false },
});
```

#### Backend Service

```typescript
import { krapi } from "@krapi/sdk";
import pg from "pg";

// Connect directly to database
await krapi.connect({
  database: new pg.Pool({
    /* your db config */
  }),
});

// Use EXACT SAME methods as frontend!
const project = await krapi.projects.create({ name: "My App" });
const collection = await krapi.collections.create(project.id, {
  name: "tasks",
  fields: [
    { name: "title", type: "string", required: true },
    { name: "completed", type: "boolean", default: false },
  ],
});

const task = await krapi.documents.create(project.id, "tasks", {
  data: { title: "Setup KRAPI", completed: false },
});
```

## 🏗️ Architecture Overview

KRAPI consists of three main components:

### 1. Backend Server (`/backend-server`)

- Express.js API server with TypeScript
- PostgreSQL database with auto-healing capabilities
- Authentication with API keys and sessions
- Real-time WebSocket support
- File storage management
- Email service integration

### 2. Frontend Manager (`/frontend-manager`)

- Next.js admin dashboard
- Project and user management
- Real-time monitoring
- API key management
- Database health dashboard

### 3. KRAPI SDK (`/packages/krapi-sdk`)

- **Perfect plug and socket design**
- Unified API for client and server
- Full TypeScript support
- HTTP client for frontend apps
- Database client for backend services
- Shared business logic capability

## 🎯 Perfect Method Parity

Every method in the KRAPI SDK works identically in both environments:

| Category           | Methods                                                            | Client Support | Server Support |
| ------------------ | ------------------------------------------------------------------ | -------------- | -------------- |
| **Authentication** | `createSession`, `login`, `logout`, `getCurrentUser`               | ✅             | ✅             |
| **Projects**       | `create`, `get`, `update`, `delete`, `getAll`, `getStatistics`     | ✅             | ✅             |
| **Collections**    | `create`, `get`, `update`, `delete`, `getAll`, `validateSchema`    | ✅             | ✅             |
| **Documents**      | `create`, `get`, `update`, `delete`, `getAll`, `search`, `bulkOps` | ✅             | ✅             |
| **Users**          | `create`, `get`, `update`, `delete`, `getAll`, `updateRole`        | ✅             | ✅             |
| **Storage**        | `uploadFile`, `downloadFile`, `getFiles`, `createFolder`           | ✅             | ✅             |
| **Email**          | `send`, `getTemplates`, `createTemplate`, `getConfig`              | ✅             | ✅             |
| **API Keys**       | `create`, `get`, `update`, `delete`, `regenerate`                  | ✅             | ✅             |
| **Health**         | `check`, `runDiagnostics`, `autoFix`, `migrate`                    | ❌             | ✅             |

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 18+ with **pnpm**
- **PostgreSQL** 13+ (or use Docker)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/krapi.git
cd krapi

# One command setup (recommended)
pnpm run dev

# Alternative: Manual setup
pnpm run install:all           # Install all dependencies
pnpm run docker:up             # Start PostgreSQL
pnpm run dev:quick             # Start both services
```

### Alternative Startup Methods

#### Using Manager Scripts:

```bash
# Linux/macOS
chmod +x krapi-manager.sh && ./krapi-manager.sh dev

# Windows PowerShell
.\krapi-manager.ps1 dev
```

#### Individual Services:

```bash
pnpm run dev:backend           # Backend only
pnpm run dev:frontend          # Frontend only
pnpm run dev:sdk               # SDK development mode
```

For detailed startup options, see [STARTUP-GUIDE.md](./STARTUP-GUIDE.md).

### Project Structure

```
krapi/
├── backend-server/           # Express.js API server
│   ├── src/
│   │   ├── controllers/      # Route controllers
│   │   ├── middleware/       # Auth, validation, etc.
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── types/           # Type definitions
│   └── package.json
├── frontend-manager/         # Next.js admin dashboard
│   ├── app/                 # App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities and config
│   └── package.json
├── packages/
│   └── krapi-sdk/           # The perfect plug and socket SDK
│       ├── src/
│       │   ├── http-clients/   # Client mode implementations
│       │   ├── *-service.ts    # Server mode implementations
│       │   ├── krapi.ts        # Main unified wrapper
│       │   └── socket-interface.ts # Perfect parity interface
│       └── package.json
├── docker-compose.yml       # PostgreSQL setup
└── package.json            # Monorepo root
```

## 🔧 Configuration

### Environment Variables

#### Backend Server (`.env` in `/backend-server`)

```bash
# Database
DB_HOST=localhost
DB_PORT=5420
DB_NAME=krapi
DB_USER=postgres
DB_PASSWORD=postgres

# Authentication
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
SESSION_EXPIRES_IN=1h
DEFAULT_ADMIN_PASSWORD=admin123

# Server
PORT=3470
HOST=localhost
NODE_ENV=development
```

#### Frontend Manager (`.env.local` in `/frontend-manager`)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3470
KRAPI_ADMIN_API_KEY=your-admin-api-key

# Application
NEXT_PUBLIC_APP_NAME=KRAPI Manager
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Database Setup

KRAPI uses PostgreSQL with automatic schema management:

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# The backend will automatically:
# - Create required tables
# - Run migrations
# - Setup indexes and constraints
# - Create default admin user
```

## 🚀 Deployment

### Production Deployment

#### Backend Server

```bash
# Build the backend
cd backend-server
pnpm run build

# Start production server
NODE_ENV=production pnpm start
```

#### Frontend Manager

```bash
# Build the frontend
cd frontend-manager
pnpm run build

# Start production server
pnpm start
```

#### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up -d --build

# Backend available at: http://localhost:3470
# Frontend available at: http://localhost:3000
```

### Cloud Deployment Options

#### Railway

```bash
# Connect to Railway
railway login
railway init

# Deploy backend
railway up --service backend

# Deploy frontend
railway up --service frontend
```

#### Vercel + Supabase

```bash
# Deploy frontend to Vercel
vercel --prod

# Use Supabase for PostgreSQL
# Update DB_HOST to your Supabase connection string
```

#### DigitalOcean App Platform

```bash
# Use the included app.yaml for one-click deployment
doctl apps create --spec app.yaml
```

## 📚 Examples and Use Cases

### Task Management App

```typescript
class TaskManager {
  constructor(private projectId: string) {}

  async createTask(data: {
    title: string;
    priority: "low" | "medium" | "high";
  }) {
    return krapi.documents.create(this.projectId, "tasks", { data });
  }

  async getTasks(filter?: { status?: string }) {
    return krapi.documents.getAll(this.projectId, "tasks", { filter });
  }
}

// Use IDENTICALLY in frontend and backend!
const taskManager = new TaskManager("project-123");
const task = await taskManager.createTask({
  title: "Build API",
  priority: "high",
});
```

### E-commerce Platform

```typescript
class ProductCatalog {
  async createProduct(productData: ProductData) {
    const product = await krapi.documents.create("shop", "products", {
      data: productData,
    });

    // Upload product images
    if (productData.images) {
      for (const image of productData.images) {
        await krapi.storage.uploadFile("shop", image, {
          folder: `products/${product.id}`,
        });
      }
    }

    return product;
  }
}
```

### Content Management System

```typescript
class CMSManager {
  async publishArticle(article: ArticleData) {
    // Create article
    const doc = await krapi.documents.create("cms", "articles", {
      data: { ...article, status: "published" },
    });

    // Send notification email
    await krapi.email.send("cms", {
      to: "editors@company.com",
      subject: `New Article Published: ${article.title}`,
      template_id: "article-published",
      template_variables: { article },
    });

    return doc;
  }
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run SDK tests
cd packages/krapi-sdk
pnpm test

# Run backend tests
cd backend-server
pnpm test

# Run frontend tests
cd frontend-manager
pnpm test
```

### Socket Verification

```bash
# Verify perfect plug and socket fit
cd packages/krapi-sdk
pnpm run verify-socket
```

This runs comprehensive verification ensuring every client method has an exact server counterpart.

## 🔒 Security

### Authentication Methods

- **API Keys**: For service-to-service communication
- **Session Tokens**: For user sessions with automatic refresh
- **Scoped Access**: Fine-grained permissions per API key/session

### Data Security

- **Encryption**: All data encrypted at rest and in transit
- **SQL Injection Protection**: Parameterized queries throughout
- **CORS Protection**: Configurable CORS policies
- **Rate Limiting**: Built-in rate limiting per API key

### Database Security

- **Auto-healing**: Automatic detection and fixing of schema issues
- **Backup Management**: Automated backups with point-in-time recovery
- **Access Logging**: Comprehensive audit logs for all operations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

### Core Principles

1. **Perfect Plug and Socket Design**: Every client method must have an exact server counterpart
2. **Type Safety First**: All code must be fully typed with TypeScript
3. **Performance**: Optimize for both HTTP and database operations
4. **Developer Experience**: Prioritize ease of use and great documentation

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes following our coding standards
# Run tests
pnpm test

# Run socket verification
cd packages/krapi-sdk && pnpm run verify-socket

# Submit pull request
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Documentation**: [https://docs.krapi.dev](https://docs.krapi.dev)
- **SDK Documentation**: [packages/krapi-sdk/README.md](packages/krapi-sdk/README.md)
- **Examples**: [https://github.com/your-org/krapi-examples](https://github.com/your-org/krapi-examples)
- **Community**: [https://discord.gg/krapi](https://discord.gg/krapi)
- **Support**: [support@krapi.dev](mailto:support@krapi.dev)

## 🌟 Why Choose KRAPI?

### Revolutionary Architecture

- ✅ **Perfect Plug and Socket**: Frontend and backend APIs are identical
- ✅ **Shared Business Logic**: Write once, use everywhere
- ✅ **Zero Context Switching**: Same patterns in client and server
- ✅ **Perfect Type Safety**: Full TypeScript support throughout

### Developer Experience

- ✅ **One API to Learn**: Not separate frontend/backend APIs
- ✅ **Intelligent Autocompletion**: Full IntelliSense support
- ✅ **Great Documentation**: Comprehensive guides and examples
- ✅ **Active Community**: Discord, GitHub discussions, examples

### Production Ready

- ✅ **High Performance**: Optimized HTTP and database operations
- ✅ **Auto-healing Database**: Automatic schema fixes and migrations
- ✅ **Comprehensive Security**: Multiple auth methods, encryption, auditing
- ✅ **Scalable**: From prototype to enterprise scale

### Unique Features

- ✅ **Perfect Method Parity**: Every frontend method works on backend
- ✅ **Business Logic Portability**: Move logic between tiers seamlessly
- ✅ **Socket Verification**: Automated testing of plug/socket compatibility
- ✅ **Real-time Everything**: Built-in WebSocket support

---

**Build amazing applications with perfect client/server harmony.** 🚀

```bash
# Get started now - one command setup!
git clone https://github.com/your-org/krapi.git
cd krapi && pnpm run dev
```
