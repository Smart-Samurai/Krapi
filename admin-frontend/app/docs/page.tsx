"use client";

import React from "react";

export default function DocumentationPage() {
  return (
    <div className="prose max-w-4xl mx-auto py-8 px-4">
      <h1>🚀 Krapi CMS Documentation</h1>
      <p>
        <strong>Version:</strong> 0.1a
      </p>
      <p>
        <strong>Generated:</strong> July 2, 2025 14:00 UTC
      </p>
      <p>
        <strong>Base API URL:</strong> https://api.deweloperskie.pl
      </p>

      <h2>Table of Contents</h2>
      <ul>
        <li>
          <a href="#authentication">Authentication</a>
        </li>
        <li>
          <a href="#content-management">Content Management</a>
        </li>
        <li>
          <a href="#route-management">Route Management</a>
        </li>
        <li>
          <a href="#file-management">File Management</a>
        </li>
        <li>
          <a href="#real-time-updates">Real-time Updates (WebSocket)</a>
        </li>
      </ul>

      <h2 id="authentication">🔐 Authentication</h2>
      <p>
        All admin API endpoints require a Bearer JWT token in the{" "}
        <code>Authorization</code> header. Obtain the token with:
      </p>
      <pre>
        <code>{`curl -X POST https://api.deweloperskie.pl/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{ "username": "admin", "password": "your-password" }'`}</code>
      </pre>
      <p>Response example:</p>
      <pre>
        <code>{`{
  "success": true,
  "data": {
    "token": "<JWT_TOKEN>",
    "user": { /* user profile */ }
  }
}`}</code>
      </pre>
      <p>Include the token in subsequent requests:</p>
      <pre>
        <code>{`curl -H 'Authorization: Bearer <JWT_TOKEN>' https://api.deweloperskie.pl/api/admin/content/get`}</code>
      </pre>

      <h2 id="content-management">📄 Content Management</h2>
      <p>
        Manage content entries via the following REST endpoints. All requests
        must include <code>Authorization: Bearer &lt;JWT_TOKEN&gt;</code>:
      </p>
      <ul>
        <li>
          <strong>List content:</strong> GET <code>/api/admin/content/get</code>
          <br />
          <em>curl example:</em>
          <br />
          <code>{`curl -H 'Authorization: Bearer <JWT_TOKEN>' https://api.deweloperskie.pl/api/admin/content/get`}</code>
        </li>
        <li>
          <strong>Get by key:</strong> GET{" "}
          <code>/api/admin/content/get/:key</code>
        </li>
        <li>
          <strong>Create:</strong> POST <code>/api/admin/content/create</code>
          <br />
          <code>{`curl -X POST https://api.deweloperskie.pl/api/admin/content/create \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{ "key": "myKey", "data": {"foo": "bar"}, "route_path": "/path", "content_type": "json" }'`}</code>
        </li>
        <li>
          <strong>Update:</strong> PUT{" "}
          <code>/api/admin/content/modify/:key</code>
        </li>
        <li>
          <strong>Delete:</strong> DELETE{" "}
          <code>/api/admin/content/delete/:key</code>
        </li>
      </ul>
      <p>
        The admin UI provides both raw JSON editors and schema-driven forms.
      </p>

      <h2 id="route-management">🛣️ Route Management</h2>
      <p>Manage dynamic routes that group content:</p>
      <ul>
        <li>
          <strong>List routes:</strong> GET <code>/api/admin/routes</code>
        </li>
        <li>
          <strong>Create route:</strong> POST <code>/api/admin/routes</code>
        </li>
        <li>
          <strong>Update:</strong> PUT <code>/api/admin/routes/:id</code>
        </li>
        <li>
          <strong>Delete:</strong> DELETE <code>/api/admin/routes/:id</code>
        </li>
      </ul>

      <h2 id="file-management">📁 File Management</h2>
      <p>Secure file upload and listing:</p>
      <ul>
        <li>
          <strong>Upload:</strong> POST <code>/api/admin/files/upload</code>
        </li>
        <li>
          <strong>List files:</strong> GET <code>/api/admin/files</code>
        </li>
        <li>
          <strong>Delete:</strong> DELETE{" "}
          <code>/api/admin/files/:filename</code>
        </li>
      </ul>

      <h2 id="real-time-updates">🌐 Real-time Updates (WebSocket)</h2>
      <p>
        Connect to the WebSocket endpoint for live events. Supply the token as a
        query param:
      </p>
      <pre>
        <code>{`const socket = new WebSocket('wss://api.deweloperskie.pl/ws?token=<JWT_TOKEN>');`}</code>
      </pre>
      <p>
        Listen for JSON messages on <code>socket.onmessage</code>. Events
        include:
      </p>
      <ul>
        <li>
          <code>content.created</code> / <code>content.updated</code> /{" "}
          <code>content.deleted</code>
        </li>
        <li>
          <code>route.created</code> / <code>route.updated</code> /{" "}
          <code>route.deleted</code>
        </li>
      </ul>

      <h2 id="environment">⚙️ Environment Variables</h2>
      <p>
        Set these in your <code>.env</code> or CI pipeline:
      </p>
      <pre>
        <code>{`NEXT_PUBLIC_API_BASE_URL=https://api.deweloperskie.pl
NEXT_PUBLIC_WS_URL=wss://api.deweloperskie.pl
JWT_SECRET=your-jwt-secret
`}</code>
      </pre>

      <hr />
      <p className="text-sm text-gray-500">
        For further support, visit README or contact the dev team.
      </p>
    </div>
  );
}
