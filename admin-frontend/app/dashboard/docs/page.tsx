"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Globe,
  Lock,
  Shield,
  Key,
  Server,
  Database,
  FileText,
} from "lucide-react";

export default function DocumentationPage() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const CodeBlock = ({
    children,
    language = "javascript",
    label,
  }: {
    children: string;
    language?: string;
    label: string;
  }) => (
    <div className="relative">
      <div className="flex justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-t-lg">
        <span className="text-sm font-medium">{language.toUpperCase()}</span>
        <button
          onClick={() => copyToClipboard(children, label)}
          className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
        >
          {copiedText === label ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span className="text-xs">
            {copiedText === label ? "Copied!" : "Copy"}
          </span>
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Krapi CMS API Documentation
        </h1>
        <p className="text-gray-600 mt-2">
          Complete guide for developers integrating with the Krapi Content
          Management System
        </p>
      </div>

      {/* Overview */}
      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Server className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">Overview</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Krapi is a flexible content management system with a RESTful API that
          supports dynamic routes, nested content structures, file management,
          and user authentication. The system is designed for developers who
          need a backend CMS with complete control over content schemas and
          route-based access levels.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <Database className="h-8 w-8 text-blue-600 mb-2" />
            <h3 className="font-semibold">Dynamic Content</h3>
            <p className="text-sm text-gray-600">
              Schema-based content with custom validation
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <Globe className="h-8 w-8 text-green-600 mb-2" />
            <h3 className="font-semibold">Route-Based Access</h3>
            <p className="text-sm text-gray-600">
              Access control at the route level - content inherits route
              permissions
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <FileText className="h-8 w-8 text-purple-600 mb-2" />
            <h3 className="font-semibold">File Management</h3>
            <p className="text-sm text-gray-600">
              Upload, store, and serve files with access control
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <Key className="h-8 w-8 text-orange-600 mb-2" />
            <h3 className="font-semibold">JWT Authentication</h3>
            <p className="text-sm text-gray-600">
              Role-based authentication with permissions
            </p>
          </div>
        </div>
      </section>

      {/* Base URL */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Base URL</h2>
        <CodeBlock label="base-url">
          {`# Development
http://localhost:3469/api

# Production
https://your-domain.com/api`}
        </CodeBlock>
      </section>

      {/* Authentication */}
      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Key className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-semibold">Authentication</h2>
        </div>

        <h3 className="text-lg font-semibold mb-2">Login</h3>
        <CodeBlock language="javascript" label="login-example">
          {`// Login to get JWT token
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'your-username',
    password: 'your-password'
  })
});

const data = await response.json();
if (data.success) {
  const token = data.data.token;
  const user = data.data.user;
  
  // Store token for subsequent requests
  localStorage.setItem('auth_token', token);
}`}
        </CodeBlock>

        <h3 className="text-lg font-semibold mb-2 mt-6">
          Making Authenticated Requests
        </h3>
        <CodeBlock language="javascript" label="auth-requests">
          {`// Include JWT token in Authorization header
const response = await fetch('/api/admin/content', {
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  }
});`}
        </CodeBlock>
      </section>

      {/* Routes API */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Routes API</h2>
        <p className="text-gray-700 mb-4">
          Routes define the structure of your content. They can be nested and
          have custom schemas that define what fields content items in that
          route should have.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Create a Route</h3>
            <CodeBlock language="javascript" label="create-route">
              {`POST /api/admin/routes

{
  "path": "/blog/posts",
  "name": "Blog Posts",
  "description": "Blog post content",
  "access_level": "public",
  "schema": {
    "title": {
      "type": "string",
      "required": true,
      "description": "Post title"
    },
    "content": {
      "type": "string",
      "required": true,
      "description": "Post content"
    },
    "tags": {
      "type": "array",
      "description": "Post tags"
    },
    "published": {
      "type": "boolean",
      "default": false
    }
  }
}`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Get All Routes</h3>
            <CodeBlock language="javascript" label="get-routes">
              {`GET /api/admin/routes

// Response
{
  "success": true,
  "data": [
    {
      "id": 1,
      "path": "/blog/posts",
      "name": "Blog Posts",
      "description": "Blog post content",
      "access_level": "public",
      "schema": { ... },
      "parent_id": null,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}`}
            </CodeBlock>
          </div>
        </div>
      </section>

      {/* Content API */}
      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">Content API</h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Create Content</h3>
            <CodeBlock language="javascript" label="create-content">
              {`POST /api/admin/content/create

{
  "key": "my-first-post",
  "data": {
    "title": "My First Blog Post",
    "content": "This is the content of my first blog post...",
    "tags": ["javascript", "api", "cms"],
    "published": true
  },
  "route_path": "/blog/posts",
  "content_type": "json",
  "description": "My first blog post"
}

// Note: Access level is now controlled by the route, not individual content items`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Get Content (Admin)</h3>
            <CodeBlock language="javascript" label="get-admin-content">
              {`GET /api/admin/content/get
GET /api/admin/content/get?route_path=/blog/posts
GET /api/admin/content/get?content_type=json
GET /api/admin/content/get/:key

// Response
{
  "success": true,
  "data": [
    {
      "id": 1,
      "key": "my-first-post",
      "data": {
        "title": "My First Blog Post",
        "content": "This is the content...",
        "tags": ["javascript", "api", "cms"],
        "published": true
      },
      "route_path": "/blog/posts",
      "content_type": "json",
      "description": "My first blog post",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Update Content</h3>
            <CodeBlock language="javascript" label="update-content">
              {`PUT /api/admin/content/modify/:key
PUT /api/admin/content/modify/id/:id

{
  "data": {
    "title": "Updated Blog Post Title",
    "content": "Updated content...",
    "tags": ["javascript", "api", "cms", "updated"],
    "published": true
  },
  "description": "Updated description"
}`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Delete Content</h3>
            <CodeBlock language="javascript" label="delete-content">
              {`DELETE /api/admin/content/delete/:key
DELETE /api/admin/content/delete/id/:id`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Get Public Content</h3>
            <CodeBlock language="javascript" label="get-public-content">
              {`// Get content by route path and key (access controlled by route)
GET /api/content/:route_path/:key
GET /api/content/blog/posts/my-first-post

// Get content by key from default route
GET /api/content/:key
GET /api/content/default/:key

// Response (access depends on route access level)
{
  "success": true,
  "data": {
    "title": "My First Blog Post",
    "content": "This is the content...",
    "tags": ["javascript", "api", "cms"],
    "published": true
  },
  "message": "Retrieved content for key 'my-first-post'"
}`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Access Control Notes</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Content items no longer have
                individual access levels. Access control is now managed at the
                route level:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-blue-700">
                <li>
                  <strong>Public routes:</strong> Content accessible without
                  authentication
                </li>
                <li>
                  <strong>Protected routes:</strong> Content requires
                  authentication
                </li>
                <li>
                  <strong>Private routes:</strong> Content blocked from public
                  API endpoints
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* File Management */}
      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-semibold">File Management</h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Upload File</h3>
            <CodeBlock language="javascript" label="upload-file">
              {`// Upload a file with FormData
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('access_level', 'public');
formData.append('description', 'Profile image');

const response = await fetch('/api/admin/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`
  },
  body: formData
});

// Response
{
  "success": true,
  "data": {
    "id": 1,
    "original_name": "profile.jpg",
    "filename": "uuid-filename.jpg",
    "mimetype": "image/jpeg",
    "size": 1024000,
    "path": "/uploads/uuid-filename.jpg",
    "access_level": "public",
    "description": "Profile image"
  }
}`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Download File</h3>
            <CodeBlock language="javascript" label="download-file">
              {`// Download file (admin - any access level)
GET /api/admin/files/1/download

// Public file access (no auth required)
GET /api/files/uuid-filename.jpg`}
            </CodeBlock>
          </div>
        </div>
      </section>

      {/* Access Levels */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Access Levels</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Globe className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold text-green-700">Public</h3>
            </div>
            <p className="text-sm text-gray-600">
              Accessible without authentication via public endpoints
            </p>
          </div>

          <div className="border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-yellow-700">Protected</h3>
            </div>
            <p className="text-sm text-gray-600">
              Requires authentication but accessible to all authenticated users
            </p>
          </div>

          <div className="border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Lock className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-red-700">Private</h3>
            </div>
            <p className="text-sm text-gray-600">
              Requires specific permissions or admin access
            </p>
          </div>
        </div>
      </section>

      {/* Next.js Integration */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Next.js Integration Example
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">API Client Setup</h3>
            <CodeBlock language="javascript" label="nextjs-api-client">
              {`// lib/krapi.js
export class KrapiClient {
  constructor(baseUrl, token = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = \`\${this.baseUrl}\${endpoint}\`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = \`Bearer \${this.token}\`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response.json();
  }

  // Public content methods
  async getPublicContent(routePath, key = null) {
    const endpoint = key ? \`/content/\${routePath}/\${key}\` : \`/content/\${routePath}\`;
    return this.request(endpoint);
  }

  // Admin methods (require authentication)
  async getAllContent(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(\`/admin/content?\${params}\`);
  }

  async createContent(data) {
    return this.request('/admin/content', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Usage
const krapi = new KrapiClient('http://localhost:3469/api');`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              Static Site Generation
            </h3>
            <CodeBlock language="javascript" label="nextjs-ssg">
              {`// pages/blog/[slug].js
import { KrapiClient } from '../../lib/krapi';

export async function getStaticPaths() {
  const krapi = new KrapiClient(process.env.KRAPI_API_URL);
  const response = await krapi.getPublicContent('blog/posts');
  
  const paths = response.data.map((post) => ({
    params: { slug: post.key }
  }));

  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const krapi = new KrapiClient(process.env.KRAPI_API_URL);
  const response = await krapi.getPublicContent('blog/posts', params.slug);
  
  return {
    props: {
      post: response.data,
    },
  };
}

export default function BlogPost({ post }) {
  return (
    <article>
      <h1>{post.data.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.data.content }} />
      <div>
        {post.data.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
    </article>
  );
}`}
            </CodeBlock>
          </div>
        </div>
      </section>

      {/* Error Handling */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Error Handling</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Response Format</h3>
            <CodeBlock language="javascript" label="error-format">
              {`// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}

// Error Response
{
  "success": false,
  "error": "Detailed error message",
  "message": "User-friendly error message"
}`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              Common HTTP Status Codes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium">200 - OK</h4>
                <p className="text-sm text-gray-600">Request successful</p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium">201 - Created</h4>
                <p className="text-sm text-gray-600">
                  Resource created successfully
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium">400 - Bad Request</h4>
                <p className="text-sm text-gray-600">Invalid request data</p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium">401 - Unauthorized</h4>
                <p className="text-sm text-gray-600">Authentication required</p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium">403 - Forbidden</h4>
                <p className="text-sm text-gray-600">
                  Insufficient permissions
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium">404 - Not Found</h4>
                <p className="text-sm text-gray-600">Resource not found</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Schema Examples */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Schema Examples</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Blog Post Schema</h3>
            <CodeBlock language="json" label="blog-schema">
              {`{
  "title": {
    "type": "string",
    "required": true,
    "description": "Blog post title"
  },
  "content": {
    "type": "string",
    "required": true,
    "description": "Post content in HTML or Markdown"
  },
  "excerpt": {
    "type": "string",
    "description": "Short excerpt for listings"
  },
  "author": {
    "type": "object",
    "fields": {
      "name": { "type": "string", "required": true },
      "email": { "type": "string" },
      "bio": { "type": "string" }
    }
  },
  "tags": {
    "type": "array",
    "description": "Post tags"
  },
  "published": {
    "type": "boolean",
    "default": false
  },
  "publishedAt": {
    "type": "date",
    "description": "Publication date"
  },
  "featuredImage": {
    "type": "string",
    "description": "URL to featured image"
  }
}`}
            </CodeBlock>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Product Schema</h3>
            <CodeBlock language="json" label="product-schema">
              {`{
  "name": {
    "type": "string",
    "required": true,
    "description": "Product name"
  },
  "description": {
    "type": "string",
    "required": true,
    "description": "Product description"
  },
  "price": {
    "type": "number",
    "required": true,
    "validation": { "min": 0 }
  },
  "currency": {
    "type": "string",
    "default": "USD"
  },
  "category": {
    "type": "string",
    "validation": {
      "options": ["electronics", "clothing", "books", "home"]
    }
  },
  "images": {
    "type": "array",
    "description": "Product image URLs"
  },
  "inventory": {
    "type": "object",
    "fields": {
      "stock": { "type": "number", "required": true },
      "sku": { "type": "string" },
      "trackInventory": { "type": "boolean", "default": true }
    }
  },
  "active": {
    "type": "boolean",
    "default": true
  }
}`}
            </CodeBlock>
          </div>
        </div>
      </section>

      {/* Scalability & Architecture */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Scalability & Architecture
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Current Architecture</h3>
            <p className="text-gray-700 mb-4">
              Krapi CMS is designed with scalability in mind. The current
              architecture supports small to medium deployments and can be
              easily scaled for larger implementations.
            </p>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">
                Current Stack:
              </h4>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>
                  <strong>Backend:</strong> Node.js/Express with TypeScript
                </li>
                <li>
                  <strong>Database:</strong> SQLite (easily migrated to
                  PostgreSQL)
                </li>
                <li>
                  <strong>Frontend:</strong> Next.js admin dashboard
                </li>
                <li>
                  <strong>Proxy:</strong> Nginx reverse proxy
                </li>
                <li>
                  <strong>Deployment:</strong> Docker containers
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Scaling Options</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">
                  🔧 Phase 1: Basic Scaling
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Migrate to PostgreSQL</li>
                  <li>• Add Redis caching layer</li>
                  <li>• External file storage (S3/CDN)</li>
                  <li>• Horizontal API scaling</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">
                  🚀 Phase 2: Advanced
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Microservices architecture</li>
                  <li>• Event-driven patterns</li>
                  <li>• Search with Elasticsearch</li>
                  <li>• Multi-tenancy support</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Performance Targets</h3>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">10K+</div>
                  <div className="text-sm text-green-700">Requests/sec</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    &lt;100ms
                  </div>
                  <div className="text-sm text-green-700">Response time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">10K+</div>
                  <div className="text-sm text-green-700">Concurrent users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">99.9%</div>
                  <div className="text-sm text-green-700">Uptime</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              Enterprise Features Roadmap
            </h3>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">
                  Route-based access control
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">
                  RESTful API with specific action endpoints
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-700">
                  Database scaling and optimization
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-700">
                  Caching and CDN integration
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-700">
                  Multi-tenancy and workflow engine
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-700">
                  Advanced analytics and search
                </span>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Available
              <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2 ml-4"></span>
              In Development
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2 ml-4"></span>
              Planned
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
