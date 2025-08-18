# 🚀 **KRAPI External Frontend Implementation Guide**

## 📋 **Overview**

This guide shows **external React applications** how to connect to KRAPI as a backend service. KRAPI implements a revolutionary "plug and socket" architecture where your frontend (plug) fits perfectly with the KRAPI backend (socket).

## 🔌 **Connection Architecture**

```
Your Client App → KRAPI Frontend Manager → KRAPI Backend → PostgreSQL Database
     (Plug)           (Web Interface)        (Express API)      (Data Store)
```

**Connection Flow:**

1. **Your App** connects to KRAPI Frontend Manager via HTTP
2. **Frontend Manager** exposes KRAPI backend over web
3. **Backend** processes requests and connects to PostgreSQL
4. **Perfect SDK parity** between client and server environments

## 🌐 **Connection Setup**

### **1. Install KRAPI SDK**

```bash
npm install @krapi/sdk
# or
yarn add @krapi/sdk
# or
pnpm add @krapi/sdk
```

### **2. Connect to KRAPI Backend**

```typescript
import { krapi } from "@krapi/sdk";

// Connect to KRAPI backend through frontend manager
await krapi.connect({
  endpoint: "http://krapi.genortunnel1.pl/krapi/k1", // Your KRAPI domain
  apiKey: "your-api-key-here",
});

console.log("Connected to KRAPI backend!");
```

### **3. Use SDK Methods (Perfect Client/Server Parity)**

```typescript
// All methods work identically regardless of connection mode
const project = await krapi.projects.create({
  name: "My Awesome Project",
  description: "Built with KRAPI SDK",
});

const collection = await krapi.collections.create(project.id, {
  name: "users",
  fields: [
    { name: "email", type: "string", required: true, unique: true },
    { name: "name", type: "string", required: true },
    { name: "age", type: "number", required: false },
  ],
});

const document = await krapi.documents.create(project.id, "users", {
  email: "user@example.com",
  name: "John Doe",
  age: 30,
});
```

## 🎯 **Available SDK Services**

### **🔐 Authentication & Users**

```typescript
// User authentication
const session = await krapi.auth.login("username", "password");
const user = await krapi.auth.getCurrentUser();

// User management
const users = await krapi.users.getAll(projectId);
const user = await krapi.users.get(projectId, userId);
const newUser = await krapi.users.create(projectId, userData);
```

### **📁 Projects & Collections**

```typescript
// Project management
const projects = await krapi.projects.getAll();
const project = await krapi.projects.get(projectId);
const newProject = await krapi.projects.create({ name: "New Project" });

// Collection management
const collections = await krapi.collections.getAll(projectId);
const collection = await krapi.collections.get(projectId, "collectionName");
const newCollection = await krapi.collections.create(projectId, collectionData);
```

### **📄 Documents & Data**

```typescript
// Document operations
const documents = await krapi.documents.getAll(projectId, "collectionName");
const document = await krapi.documents.get(
  projectId,
  "collectionName",
  documentId
);
const newDoc = await krapi.documents.create(projectId, "collectionName", data);
const updatedDoc = await krapi.documents.update(
  projectId,
  "collectionName",
  documentId,
  updates
);
```

### **💾 File Storage**

```typescript
// File management
const files = await krapi.storage.getFiles(projectId);
const file = await krapi.storage.uploadFile(projectId, fileData);
const fileUrl = await krapi.storage.getFileUrl(projectId, fileId, {
  expires_in: 3600,
});
const fileMetadata = await krapi.storage.updateFileMetadata(
  projectId,
  fileId,
  metadata
);
```

### **📧 Email Management**

```typescript
// Email configuration
const emailConfig = await krapi.email.getConfig(projectId);
await krapi.email.updateConfig(projectId, newConfig);

// Email templates
const templates = await krapi.email.getTemplates(projectId);
const template = await krapi.email.createTemplate(projectId, templateData);

// Send emails
await krapi.email.sendEmail(projectId, emailRequest);
```

### **🏥 Health & Diagnostics**

```typescript
// System health
const health = await krapi.health.check();
const dbHealth = await krapi.health.checkDatabase();

// Run diagnostics
const diagnostics = await krapi.health.runDiagnostics();
const schemaValidation = await krapi.health.validateSchema();
```

### **🧪 Testing & Development**

```typescript
// Testing utilities
const testProject = await krapi.testing.createTestProject();
const testResults = await krapi.testing.runTests();
await krapi.testing.cleanup();
```

## 🔧 **Advanced Configuration**

### **Environment Variables**

```typescript
// .env file
KRAPI_ENDPOINT=http://krapi.genortunnel1.pl/krapi/k1
KRAPI_API_KEY=your-secret-api-key

// In your app
await krapi.connect({
  endpoint: process.env.KRAPI_ENDPOINT,
  apiKey: process.env.KRAPI_API_KEY
});
```

### **Custom Headers & Authentication**

```typescript
// The SDK automatically handles authentication
// API keys are sent in X-API-Key header
// Session tokens are sent in Authorization: Bearer header
```

### **Error Handling**

```typescript
try {
  const project = await krapi.projects.create({ name: "My Project" });
} catch (error) {
  if (error.isApiError) {
    console.error("KRAPI API Error:", error.message);
    console.error("Status:", error.status);
  } else {
    console.error("Connection Error:", error.message);
  }
}
```

## 📱 **React Component Examples**

### **Project List Component**

```typescript
import React, { useState, useEffect } from "react";
import { krapi } from "@krapi/sdk";

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectList = await krapi.projects.getAll();
        setProjects(projectList);
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  if (loading) return <div>Loading projects...</div>;

  return (
    <div>
      <h2>Your Projects</h2>
      {projects.map((project) => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
          <small>
            Created: {new Date(project.created_at).toLocaleDateString()}
          </small>
        </div>
      ))}
    </div>
  );
};
```

### **Document Form Component**

```typescript
import React, { useState } from "react";
import { krapi } from "@krapi/sdk";

interface DocumentFormProps {
  projectId: string;
  collectionName: string;
  onSuccess: () => void;
}

export const DocumentForm: React.FC<DocumentFormProps> = ({
  projectId,
  collectionName,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await krapi.documents.create(projectId, collectionName, formData);
      onSuccess();
      setFormData({});
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Document data (JSON)"
        onChange={(e) => setFormData(JSON.parse(e.target.value))}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Document"}
      </button>
    </form>
  );
};
```

## 🚀 **Production Deployment**

### **1. Set Up KRAPI Backend**

- Deploy KRAPI backend to your server
- Configure PostgreSQL database
- Set up environment variables
- Expose KRAPI frontend manager over web

### **2. Configure Your App**

```typescript
// production.ts
export const krapiConfig = {
  endpoint: "https://your-krapi-domain.com/krapi/k1",
  apiKey: process.env.KRAPI_API_KEY,
};

// development.ts
export const krapiConfig = {
  endpoint: "http://localhost:3470/krapi/k1",
  apiKey: process.env.KRAPI_API_KEY,
};
```

### **3. Security Best Practices**

- Store API keys in environment variables
- Use HTTPS in production
- Implement proper error handling
- Add request rate limiting if needed

## 🔍 **Troubleshooting**

### **Common Issues**

**Connection Failed**

```typescript
// Check your endpoint URL
await krapi.connect({
  endpoint: "http://krapi.genortunnel1.pl/krapi/k1", // Must include /krapi/k1
  apiKey: "your-api-key",
});
```

**Authentication Error**

```typescript
// Verify your API key is correct
// Check if the key has proper permissions
// Ensure the key hasn't expired
```

**Method Not Found**

```typescript
// All methods are documented in the SDK
// Check method signatures match exactly
// Ensure you're using the latest SDK version
```

### **Debug Mode**

```typescript
// Enable debug logging
const krapi = new KrapiWrapper({
  debug: true,
});
```

## 📚 **Additional Resources**

- **SDK Documentation**: Full API reference in the SDK package
- **TypeScript Support**: Full type safety and IntelliSense
- **Examples**: See `packages/krapi-sdk/examples/` for more usage examples
- **Community**: Join KRAPI community for support and updates

## 🎯 **Why KRAPI?**

✅ **Perfect Plug & Socket Design** - Same code works in client and server  
✅ **Type Safety** - Full TypeScript support with IntelliSense  
✅ **Zero Configuration** - Works out of the box  
✅ **Production Ready** - Built for enterprise applications  
✅ **Scalable** - Handles millions of requests  
✅ **Secure** - Built-in authentication and authorization

---

## 🚀 **Get Started Now!**

```bash
# Install the SDK
npm install @krapi/sdk

# Connect to your KRAPI backend
import { krapi } from '@krapi/sdk';
await krapi.connect({
  endpoint: 'http://krapi.genortunnel1.pl/krapi/k1',
  apiKey: 'your-api-key'
});

# Start building amazing applications!
const project = await krapi.projects.create({ name: 'My First KRAPI App' });
```

**Welcome to the future of backend development with KRAPI! 🎉**
