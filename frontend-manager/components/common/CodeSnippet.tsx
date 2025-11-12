/**
 * Code Snippet Component
 * 
 * Reusable component that displays copy-pasteable React/Next.js code snippets
 * for KRAPI SDK integration. Context-aware snippets based on current page/resource.
 * 
 * @module components/common/CodeSnippet
 * @example
 * <CodeSnippet
 *   context="projects"
 *   projectId="project-123"
 *   collectionName="users"
 * />
 */
"use client";

import { Copy, Check, Code2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ActionButton } from "./ActionButtons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Code Snippet Context Type
 * 
 * Defines the context for which code snippets should be generated.
 * 
 * @typedef {"projects" | "collections" | "documents" | "users" | "storage" | "api-keys"} CodeSnippetContext
 */
export type CodeSnippetContext = "projects" | "collections" | "documents" | "users" | "storage" | "api-keys";

/**
 * Code Snippet Props
 * 
 * @interface CodeSnippetProps
 * @property {CodeSnippetContext} context - The context for code generation
 * @property {string} [projectId] - Current project ID (for project-specific contexts)
 * @property {string} [collectionName] - Current collection name (for collection/document contexts)
 * @property {string} [endpoint] - KRAPI endpoint URL (defaults to placeholder)
 * @property {string} [apiKey] - API key placeholder text
 */
export interface CodeSnippetProps {
  context: CodeSnippetContext;
  projectId?: string;
  collectionName?: string;
  endpoint?: string;
  apiKey?: string;
}

/**
 * Generate Code Snippet
 * 
 * Generates React/Next.js code snippet based on context and provided parameters.
 * 
 * @param {CodeSnippetProps} props - Code snippet props
 * @returns {string} Generated code snippet
 */
function generateCodeSnippet({
  context,
  projectId = "YOUR_PROJECT_ID",
  collectionName = "YOUR_COLLECTION_NAME",
  endpoint = "https://your-krapi-instance.com",
  apiKey = "YOUR_API_KEY",
}: CodeSnippetProps): string {
  const projectIdPlaceholder = projectId !== "YOUR_PROJECT_ID" ? projectId : "YOUR_PROJECT_ID";
  const collectionNamePlaceholder = collectionName !== "YOUR_COLLECTION_NAME" ? collectionName : "YOUR_COLLECTION_NAME";

  switch (context) {
    case "projects":
      return `import { KrapiClient } from '@smartsamurai/krapi-sdk/client';
import { useEffect, useState } from 'react';

// Initialize KRAPI client
const krapi = new KrapiClient({
  endpoint: '${endpoint}',
  apiKey: '${apiKey}'
});

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await krapi.projects.getAll();
        setProjects(data);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Create a new project
  const createProject = async () => {
    try {
      const newProject = await krapi.projects.create({
        name: 'My New Project',
        description: 'Project description'
      });
      console.log('Created project:', newProject);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  // Get a specific project
  const getProject = async (projectId: string) => {
    try {
      const project = await krapi.projects.get(projectId);
      console.log('Project:', project);
    } catch (error) {
      console.error('Failed to get project:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Projects</h1>
      <button onClick={createProject}>Create Project</button>
      {projects.map((project) => (
        <div key={project.id}>
          <h2>{project.name}</h2>
          <p>{project.description}</p>
        </div>
      ))}
    </div>
  );
}`;

    case "collections":
      return `import { KrapiClient } from '@smartsamurai/krapi-sdk/client';
import { useEffect, useState } from 'react';

// Initialize KRAPI client
const krapi = new KrapiClient({
  endpoint: '${endpoint}',
  apiKey: '${apiKey}'
});

const PROJECT_ID = '${projectIdPlaceholder}';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollections() {
      try {
        const data = await krapi.collections.getAll(PROJECT_ID);
        setCollections(data);
      } catch (error) {
        console.error('Failed to load collections:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCollections();
  }, []);

  // Create a new collection
  const createCollection = async () => {
    try {
      const newCollection = await krapi.collections.create(PROJECT_ID, {
        name: 'users',
        description: 'User collection',
        fields: [
          {
            name: 'email',
            type: 'string',
            required: true,
            unique: true
          },
          {
            name: 'age',
            type: 'number',
            required: false
          }
        ]
      });
      console.log('Created collection:', newCollection);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  // Get a specific collection
  const getCollection = async (collectionName: string) => {
    try {
      const collection = await krapi.collections.get(PROJECT_ID, collectionName);
      console.log('Collection:', collection);
    } catch (error) {
      console.error('Failed to get collection:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Collections</h1>
      <button onClick={createCollection}>Create Collection</button>
      {collections.map((collection) => (
        <div key={collection.id}>
          <h2>{collection.name}</h2>
          <p>{collection.description}</p>
        </div>
      ))}
    </div>
  );
}`;

    case "documents":
      return `import { KrapiClient } from '@smartsamurai/krapi-sdk/client';
import { useEffect, useState } from 'react';

// Initialize KRAPI client
const krapi = new KrapiClient({
  endpoint: '${endpoint}',
  apiKey: '${apiKey}'
});

const PROJECT_ID = '${projectIdPlaceholder}';
const COLLECTION_NAME = '${collectionNamePlaceholder}';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const data = await krapi.documents.getAll(PROJECT_ID, COLLECTION_NAME);
        setDocuments(data);
      } catch (error) {
        console.error('Failed to load documents:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, []);

  // Create a new document
  const createDocument = async () => {
    try {
      const newDocument = await krapi.documents.create(PROJECT_ID, COLLECTION_NAME, {
        data: {
          email: 'user@example.com',
          name: 'John Doe',
          age: 30
        }
      });
      console.log('Created document:', newDocument);
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  // Get a specific document
  const getDocument = async (documentId: string) => {
    try {
      const document = await krapi.documents.get(PROJECT_ID, COLLECTION_NAME, documentId);
      console.log('Document:', document);
    } catch (error) {
      console.error('Failed to get document:', error);
    }
  };

  // Update a document
  const updateDocument = async (documentId: string) => {
    try {
      const updated = await krapi.documents.update(PROJECT_ID, COLLECTION_NAME, documentId, {
        data: {
          name: 'Jane Doe',
          age: 31
        }
      });
      console.log('Updated document:', updated);
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  };

  // Delete a document
  const deleteDocument = async (documentId: string) => {
    try {
      await krapi.documents.delete(PROJECT_ID, COLLECTION_NAME, documentId);
      console.log('Document deleted');
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Documents</h1>
      <button onClick={createDocument}>Create Document</button>
      {documents.map((document) => (
        <div key={document.id}>
          <h2>{document.id}</h2>
          <pre>{JSON.stringify(document.data, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}`;

    case "users":
      return `import { KrapiClient } from '@smartsamurai/krapi-sdk/client';
import { useEffect, useState } from 'react';

// Initialize KRAPI client
const krapi = new KrapiClient({
  endpoint: '${endpoint}',
  apiKey: '${apiKey}'
});

const PROJECT_ID = '${projectIdPlaceholder}';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await krapi.users.getAll(PROJECT_ID);
        setUsers(data);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  // Create a new user
  const createUser = async () => {
    try {
      const newUser = await krapi.users.create(PROJECT_ID, {
        username: 'johndoe',
        email: 'john@example.com',
        password: 'securepassword',
        first_name: 'John',
        last_name: 'Doe',
        access_scopes: ['documents:read', 'documents:write']
      });
      console.log('Created user:', newUser);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  // Get a specific user
  const getUser = async (userId: string) => {
    try {
      const user = await krapi.users.get(PROJECT_ID, userId);
      console.log('User:', user);
    } catch (error) {
      console.error('Failed to get user:', error);
    }
  };

  // Update a user
  const updateUser = async (userId: string) => {
    try {
      const updated = await krapi.users.update(PROJECT_ID, userId, {
        first_name: 'Jane',
        last_name: 'Smith'
      });
      console.log('Updated user:', updated);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Users</h1>
      <button onClick={createUser}>Create User</button>
      {users.map((user) => (
        <div key={user.id}>
          <h2>{user.username}</h2>
          <p>{user.email}</p>
        </div>
      ))}
    </div>
  );
}`;

    case "storage":
      return `import { KrapiClient } from '@smartsamurai/krapi-sdk/client';
import { useEffect, useState } from 'react';

// Initialize KRAPI client
const krapi = new KrapiClient({
  endpoint: '${endpoint}',
  apiKey: '${apiKey}'
});

const PROJECT_ID = '${projectIdPlaceholder}';

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFiles() {
      try {
        const data = await krapi.storage.getAll(PROJECT_ID);
        setFiles(data);
      } catch (error) {
        console.error('Failed to load files:', error);
      } finally {
        setLoading(false);
      }
    }
    loadFiles();
  }, []);

  // Upload a file
  const uploadFile = async (file: File) => {
    try {
      const uploaded = await krapi.storage.upload(PROJECT_ID, file, {
        folder: 'uploads', // Optional folder path
        onProgress: (progress) => {
          console.log('Upload progress:', progress);
        }
      });
      console.log('File uploaded:', uploaded);
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  // Get file info
  const getFileInfo = async (fileId: string) => {
    try {
      const fileInfo = await krapi.storage.get(PROJECT_ID, fileId);
      console.log('File info:', fileInfo);
    } catch (error) {
      console.error('Failed to get file info:', error);
    }
  };

  // Download a file
  const downloadFile = async (fileId: string) => {
    try {
      const blob = await krapi.storage.download(PROJECT_ID, fileId);
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'file';
      a.click();
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  // Delete a file
  const deleteFile = async (fileId: string) => {
    try {
      await krapi.storage.delete(PROJECT_ID, fileId);
      console.log('File deleted');
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Files</h1>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
        }}
      />
      {files.map((file) => (
        <div key={file.id}>
          <h2>{file.name}</h2>
          <p>Size: {file.size} bytes</p>
          <button onClick={() => downloadFile(file.id)}>Download</button>
          <button onClick={() => deleteFile(file.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}`;

    case "api-keys":
      return `import { KrapiClient } from '@smartsamurai/krapi-sdk/client';
import { useEffect, useState } from 'react';

// Initialize KRAPI client
const krapi = new KrapiClient({
  endpoint: '${endpoint}',
  apiKey: '${apiKey}'
});

const PROJECT_ID = '${projectIdPlaceholder}';

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApiKeys() {
      try {
        const data = await krapi.apiKeys.getAll(PROJECT_ID);
        setApiKeys(data);
      } catch (error) {
        console.error('Failed to load API keys:', error);
      } finally {
        setLoading(false);
      }
    }
    loadApiKeys();
  }, []);

  // Create a new API key
  const createApiKey = async () => {
    try {
      const newKey = await krapi.apiKeys.create(PROJECT_ID, {
        name: 'My API Key',
        scopes: ['documents:read', 'documents:write'],
        expires_at: '2025-12-31T23:59:59Z' // Optional expiration
      });
      console.log('Created API key:', newKey);
      // IMPORTANT: Save the key value immediately - it won't be shown again!
      alert('API Key created! Save this key: ' + newKey.key);
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  // Get a specific API key
  const getApiKey = async (keyId: string) => {
    try {
      const apiKey = await krapi.apiKeys.get(PROJECT_ID, keyId);
      console.log('API key:', apiKey);
    } catch (error) {
      console.error('Failed to get API key:', error);
    }
  };

  // Update an API key
  const updateApiKey = async (keyId: string) => {
    try {
      const updated = await krapi.apiKeys.update(PROJECT_ID, keyId, {
        name: 'Updated API Key',
        scopes: ['documents:read']
      });
      console.log('Updated API key:', updated);
    } catch (error) {
      console.error('Failed to update API key:', error);
    }
  };

  // Delete an API key
  const deleteApiKey = async (keyId: string) => {
    try {
      await krapi.apiKeys.delete(PROJECT_ID, keyId);
      console.log('API key deleted');
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>API Keys</h1>
      <button onClick={createApiKey}>Create API Key</button>
      {apiKeys.map((key) => (
        <div key={key.id}>
          <h2>{key.name}</h2>
          <p>Scopes: {key.scopes.join(', ')}</p>
          <button onClick={() => updateApiKey(key.id)}>Update</button>
          <button onClick={() => deleteApiKey(key.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}`;

    default:
      return "";
  }
}

/**
 * Code Snippet Component
 * 
 * Displays a dialog with copy-pasteable React/Next.js code snippets for KRAPI SDK.
 * 
 * @param {CodeSnippetProps} props - Component props
 * @returns {JSX.Element} Code snippet component
 */
export function CodeSnippet(props: CodeSnippetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = generateCodeSnippet(props);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <ActionButton variant="outline" icon={Code2}>
          Copy Code
        </ActionButton>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            React/Next.js Code Snippet
          </DialogTitle>
          <DialogDescription>
            Copy this code into your React or Next.js app to interact with KRAPI
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                {code}
              </pre>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Installation:</p>
            <code className="bg-muted px-2 py-1 rounded">
              npm install @smartsamurai/krapi-sdk
            </code>
            <p className="mt-2">
              Make sure to replace <code className="bg-muted px-1 rounded">YOUR_API_KEY</code> and{" "}
              <code className="bg-muted px-1 rounded">YOUR_PROJECT_ID</code> with your actual values.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

