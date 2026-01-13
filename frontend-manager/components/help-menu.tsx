/**
 * Help Menu Component
 * 
 * Provides help documentation and instructions for using Krapi Server,
 * including SDK initialization, API key creation, and hosting information.
 * 
 * @module components/help-menu
 * @example
 * <HelpMenu />
 */
"use client";

import {
  HelpCircle,
  BookOpen,
  Code,
  Key,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/**
 * Help Menu Component
 * 
 * Displays a dialog with comprehensive help documentation including:
 * - SDK initialization instructions
 * - API key creation guide
 * - Hosting and deployment information
 * - Quick start guides
 * 
 * @returns {JSX.Element} Help menu component
 */
export function HelpMenu() {
  const [open, setOpen] = useState(false);

  // SDK-FIRST: Use centralized config for API URL
  // Note: Client-side components can't import server-side config directly
  // Use environment variable or derive from current URL
  const currentUrl = typeof window !== "undefined" ? window.location.origin : "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/krapi/k1", "") || 
                 (currentUrl.includes(":3498") ? currentUrl.replace(":3498", ":3470") : currentUrl);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="cursor-pointer">
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Krapi Server Help & Documentation
          </DialogTitle>
          <DialogDescription>
            Complete guide for using Krapi Server, integrating the SDK, and hosting your instance
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="sdk" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sdk">SDK Setup</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="hosting">Hosting</TabsTrigger>
            <TabsTrigger value="quick-start">Quick Start</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            {/* SDK Setup Tab */}
            <TabsContent value="sdk" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Initializing the SDK
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The Krapi SDK allows you to connect your applications to Krapi Server.
                  </p>

                  <div className="bg-muted p-4 rounded-lg space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">1. Install the SDK</h4>
                      <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
                        <code>npm install @smartsamurai/krapi-sdk</code>
                      </pre>
                      <p className="text-xs text-muted-foreground mt-2">
                        Or using pnpm: <code>pnpm add @smartsamurai/krapi-sdk</code>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        📦 <a href="https://www.npmjs.com/package/@smartsamurai/krapi-sdk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View on NPM</a>
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">2. Initialize the SDK</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Connect to your Krapi Server instance:
                      </p>
                      <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
                        <code>{`import { krapi } from '@smartsamurai/krapi-sdk';

// Connect to your Krapi Server
await krapi.connect({
  endpoint: '${apiUrl}', // Your Krapi Server URL
  apiKey: 'your-api-key-here' // API key from Settings → API Keys
});

// Now you can use all SDK methods
const projects = await krapi.projects.list();`}</code>
                      </pre>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">3. Environment Variables</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Create a <code>.env</code> file in your project:
                      </p>
                      <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
                        <code>{`KRAPI_ENDPOINT=${apiUrl}
KRAPI_API_KEY=your-api-key-here`}</code>
                      </pre>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">4. Complete Example</h4>
                      <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
                        <code>{`import { krapi } from '@smartsamurai/krapi-sdk';

async function initializeApp() {
  try {
    // Connect to KRAPI FRONTEND URL (port 3498), not backend!
    await krapi.connect({
      endpoint: process.env.KRAPI_ENDPOINT || 'https://your-krapi-instance.com', // Frontend URL
      apiKey: process.env.KRAPI_API_KEY || ''
    });
    
    console.log('✅ Connected to Krapi Server');
    
    // Get all projects
    const projects = await krapi.projects.getAll();
    console.log('Projects:', projects);
    
    // Create a new project
    const newProject = await krapi.projects.create({
      name: 'My New Project',
      description: 'Project description'
    });
    
    // Get all collections in a project
    const collections = await krapi.collections.getAll(newProject.id);
    
  } catch (error) {
    console.error('Failed to connect:', error);
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">React/Next.js Example</h3>
                  <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                    <code>{`'use client';

import { useEffect, useState } from 'react';
import { krapi } from '@smartsamurai/krapi-sdk';

export default function MyComponent() {
  const [projects, setProjects] = useState([]);
  
  useEffect(() => {
    async function loadData() {
      // Connect to FRONTEND URL (port 3498), not backend!
      await krapi.connect({
        endpoint: process.env.NEXT_PUBLIC_KRAPI_ENDPOINT!, // e.g., "https://your-krapi-instance.com"
        apiKey: process.env.NEXT_PUBLIC_KRAPI_API_KEY!
      });
      
      // Get all projects
      const projectList = await krapi.projects.getAll();
      setProjects(projectList);
    }
    loadData();
  }, []);
  
  return (
    <div>
      {projects.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}`}</code>
                  </pre>
                </div>
              </div>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api-keys" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Creating API Keys
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    API keys authenticate your applications with Krapi Server.
                  </p>

                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Via Web UI</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Navigate to <strong>Settings</strong> → <strong>API Keys</strong></li>
                        <li>Click <strong>Create New API Key</strong></li>
                        <li>Configure:
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li><strong>Name</strong>: Descriptive name for the key</li>
                            <li><strong>Scopes</strong>: Permissions (e.g., projects:read, collections:write)</li>
                            <li><strong>Expiration</strong>: Optional expiration date</li>
                            <li><strong>Project</strong>: If creating project-specific key</li>
                          </ul>
                        </li>
                        <li>Click <strong>Create</strong></li>
                        <li className="font-semibold text-warning">⚠️ Copy the API key immediately - it&apos;s only shown once!</li>
                      </ol>
                    </div>

                    <Separator />

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">API Key Scopes</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold mb-1">Admin Scopes:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li><code>admin:read</code> - View admin users</li>
                            <li><code>admin:write</code> - Create/update admin users</li>
                            <li><code>admin:delete</code> - Delete admin users</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Project Scopes:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li><code>projects:read</code> - View projects</li>
                            <li><code>projects:write</code> - Create/update projects</li>
                            <li><code>projects:delete</code> - Delete projects</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Collection Scopes:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li><code>collections:read</code> - View collections</li>
                            <li><code>collections:write</code> - Create/update collections</li>
                            <li><code>collections:delete</code> - Delete collections</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Document Scopes:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li><code>documents:read</code> - View documents</li>
                            <li><code>documents:write</code> - Create/update documents</li>
                            <li><code>documents:delete</code> - Delete documents</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Security Best Practices</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Never commit API keys to version control</li>
                        <li>Use environment variables for API keys</li>
                        <li>Rotate API keys regularly</li>
                        <li>Use project-specific keys when possible</li>
                        <li>Set expiration dates for temporary access</li>
                        <li>Revoke unused keys immediately</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Hosting Tab */}
            <TabsContent value="hosting" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Hosting & Deployment
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Krapi Server can be hosted in various ways. See the full hosting guide for detailed instructions.
                  </p>

                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Local Development</h4>
                      <p className="text-sm mb-2">By default, Krapi Server listens on localhost (127.0.0.1):</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Frontend UI: <code>http://localhost:3498</code></li>
                        <li>Backend API: <code>http://localhost:3470</code></li>
                      </ul>
                    </div>

                    <Separator />

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Network Access</h4>
                      <p className="text-sm mb-2">To allow access from other devices:</p>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Go to <strong>Settings</strong> → <strong>Security</strong></li>
                        <li>Set <strong>Network Interface</strong> to <code>0.0.0.0</code></li>
                        <li>Configure <strong>Allowed Origins</strong> with your domain(s)</li>
                        <li className="font-semibold text-warning">⚠️ Ensure proper firewall and security configuration!</li>
                      </ol>
                    </div>

                    <Separator />

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Custom Domain</h4>
                      <p className="text-sm mb-2">To use your own domain:</p>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Point your domain to your server&apos;s IP</li>
                        <li>Configure reverse proxy (Nginx/Caddy)</li>
                        <li>Enable HTTPS with Let&apos;s Encrypt</li>
                        <li>Update <strong>Site URL</strong> in Settings → General</li>
                        <li>Update <strong>Allowed Origins</strong> in Settings → Security</li>
                      </ol>
                    </div>

                    <Separator />

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Cloud Hosting</h4>
                      <p className="text-sm mb-2">Krapi Server can be deployed on:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li><strong>VPS:</strong> DigitalOcean, Linode, Vultr, AWS EC2</li>
                        <li><strong>Platforms:</strong> Railway, Render, Fly.io</li>
                        <li><strong>Note:</strong> Vercel free tier has limitations with SQLite</li>
                      </ul>
                    </div>

                    <div className="pt-4 space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => window.open("https://github.com/GenorTG/Krapi/blob/main/HOSTING.md", "_blank")}
                        className="w-full"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Full Hosting Guide
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open("https://www.npmjs.com/package/@smartsamurai/krapi-sdk", "_blank")}
                          className="flex-1"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          NPM Package
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open("https://github.com/Smart-Samurai", "_blank")}
                          className="flex-1"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          GitHub Org
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open("https://github.com/GenorTG", "_blank")}
                          className="flex-1"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Author
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Quick Start Tab */}
            <TabsContent value="quick-start" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Quick Start Guide</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get started with Krapi Server in minutes.
                  </p>

                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">1. Create an API Key</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Go to <strong>Settings</strong> → <strong>API Keys</strong></li>
                        <li>Click <strong>Create New API Key</strong></li>
                        <li>Give it a name and select scopes</li>
                        <li>Copy the key (shown only once!)</li>
                      </ol>
                    </div>

                    <Separator />

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">2. Install SDK in Your App</h4>
                      <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
                        <code>npm install @smartsamurai/krapi-sdk</code>
                      </pre>
                    </div>

                    <Separator />

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">3. Initialize SDK</h4>
                      <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
                        <code>{`import { krapi } from '@smartsamurai/krapi-sdk';

await krapi.connect({
  endpoint: '${apiUrl}',
  apiKey: 'your-api-key-here'
});`}</code>
                      </pre>
                    </div>

                    <Separator />

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">4. Start Using Krapi</h4>
                      <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
                        <code>{`// Create a project
const project = await krapi.projects.create({
  name: 'My Project'
});

// Create a collection
await krapi.collections.create(project.id, {
  name: 'users',
  schema: {
    name: { type: 'string', required: true },
    email: { type: 'string', required: true }
  }
});

// Add a document
await krapi.collections.documents.create(project.id, 'users', {
  name: 'John Doe',
  email: 'john@example.com'
});`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

