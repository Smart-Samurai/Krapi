import axios from "axios";
import { config } from "./config";

// Create axios instance for unified API
const unifiedApi = axios.create({
  baseURL: "http://localhost:3470/krapi/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: config.api.timeout,
  withCredentials: false,
});

// Request interceptor to add auth token
unifiedApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    console.log(
      "Unified API Request:",
      config.url,
      "Token:",
      token ? "present" : "missing"
    );

    // Don't add token for auth endpoints (login, verify)
    if (token && !config.url?.includes("/auth")) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle auth errors
unifiedApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Unified API client interface
interface UnifiedApiRequest {
  operation:
    | "admin"
    | "database"
    | "auth"
    | "storage"
    | "users"
    | "teams"
    | "functions"
    | "messaging"
    | "ai";
  resource: string;
  action: string;
  params?: Record<string, unknown>;
}

// Unified API client
export const unifiedAPI = {
  // Make a unified API request
  request: async (request: UnifiedApiRequest) => {
    const response = await unifiedApi.post("/api", request);
    return response.data;
  },

  // Authentication
  auth: {
    login: async (username: string, password: string) => {
      console.log("🔐 Unified API: Making login request to /auth");
      console.log("🔐 Unified API: Base URL:", unifiedApi.defaults.baseURL);
      console.log(
        "🔐 Unified API: Full URL will be:",
        `${unifiedApi.defaults.baseURL}/auth`
      );
      console.log("🔐 Unified API: Request payload:", {
        method: "login",
        username,
        password,
      });

      try {
        const response = await unifiedApi.post("/auth", {
          method: "login",
          username,
          password,
        });
        console.log("🔐 Unified API: Response received:", response.data);
        return response.data;
      } catch (error: any) {
        console.error("🔐 Unified API: Login request failed:", error);
        console.error("🔐 Unified API: Request URL:", error.config?.url);
        console.error("🔐 Unified API: Request method:", error.config?.method);

        // Log the actual response if available
        if (error.response) {
          console.error(
            "🔐 Unified API: Response status:",
            error.response.status
          );
          console.error("🔐 Unified API: Response data:", error.response.data);
          console.error(
            "🔐 Unified API: Response headers:",
            error.response.headers
          );
        }

        throw error;
      }
    },

    verify: async (apiKey: string) => {
      const response = await unifiedApi.post("/auth", {
        method: "verify",
        apiKey,
      });
      return response.data;
    },
  },

  // Admin operations
  admin: {
    // Projects
    listProjects: async () => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "projects",
        action: "list",
      });
    },

    createProject: async (projectData: {
      name: string;
      description?: string;
      domain?: string;
      settings?: Record<string, unknown>;
    }) => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "projects",
        action: "create",
        params: projectData,
      });
    },

    getProject: async (projectId: string) => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "projects",
        action: "get",
        params: { projectId },
      });
    },

    deleteProject: async (projectId: string) => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "projects",
        action: "delete",
        params: { projectId },
      });
    },

    updateProject: async (
      projectId: string,
      updates: Record<string, unknown>
    ) => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "projects",
        action: "update",
        params: { projectId, ...updates },
      });
    },

    // API Keys
    listApiKeys: async () => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "keys",
        action: "list",
      });
    },

    createApiKey: async (keyData: {
      name: string;
      permissions?: string[];
      expiresAt?: string;
    }) => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "keys",
        action: "create",
        params: keyData,
      });
    },

    deleteApiKey: async (keyId: string) => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "keys",
        action: "delete",
        params: { keyId },
      });
    },

    // Database
    getDatabaseStats: async () => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "database",
        action: "stats",
      });
    },

    getDatabaseInfo: async () => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "database",
        action: "info",
      });
    },

    resetDatabase: async () => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "database",
        action: "reset",
      });
    },

    // Email
    getEmailConfig: async () => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "email",
        action: "config",
      });
    },

    sendEmail: async (emailData: {
      to: string;
      subject: string;
      body: string;
      template?: string;
    }) => {
      return unifiedAPI.request({
        operation: "admin",
        resource: "email",
        action: "send",
        params: emailData,
      });
    },
  },

  // Database operations
  database: {
    // Collections
    listCollections: async () => {
      return unifiedAPI.request({
        operation: "database",
        resource: "collections",
        action: "list",
      });
    },

    createCollection: async (collectionData: {
      name: string;
      schema?: Record<string, unknown>;
    }) => {
      return unifiedAPI.request({
        operation: "database",
        resource: "collections",
        action: "create",
        params: collectionData,
      });
    },

    getCollection: async (collectionId: string) => {
      return unifiedAPI.request({
        operation: "database",
        resource: "collections",
        action: "get",
        params: { collectionId },
      });
    },

    updateCollection: async (
      collectionId: string,
      updates: Record<string, unknown>
    ) => {
      return unifiedAPI.request({
        operation: "database",
        resource: "collections",
        action: "update",
        params: { collectionId, ...updates },
      });
    },

    deleteCollection: async (collectionId: string) => {
      return unifiedAPI.request({
        operation: "database",
        resource: "collections",
        action: "delete",
        params: { collectionId },
      });
    },

    // Documents
    listDocuments: async (
      collectionId: string,
      filters?: Record<string, unknown>
    ) => {
      return unifiedAPI.request({
        operation: "database",
        resource: "documents",
        action: "list",
        params: { collectionId, filters },
      });
    },

    createDocument: async (
      collectionId: string,
      documentData: Record<string, unknown>
    ) => {
      return unifiedAPI.request({
        operation: "database",
        resource: "documents",
        action: "create",
        params: { collectionId, document: documentData },
      });
    },

    getDocument: async (collectionId: string, documentId: string) => {
      return unifiedAPI.request({
        operation: "database",
        resource: "documents",
        action: "get",
        params: { collectionId, documentId },
      });
    },

    updateDocument: async (
      collectionId: string,
      documentId: string,
      updates: Record<string, unknown>
    ) => {
      return unifiedAPI.request({
        operation: "database",
        resource: "documents",
        action: "update",
        params: { collectionId, documentId, updates },
      });
    },

    deleteDocument: async (collectionId: string, documentId: string) => {
      return unifiedAPI.request({
        operation: "database",
        resource: "documents",
        action: "delete",
        params: { collectionId, documentId },
      });
    },
  },

  // Storage operations
  storage: {
    listFiles: async () => {
      return unifiedAPI.request({
        operation: "storage",
        resource: "files",
        action: "list",
      });
    },

    uploadFile: async (file: File, metadata?: Record<string, unknown>) => {
      const formData = new FormData();
      formData.append("file", file);
      if (metadata) {
        formData.append("metadata", JSON.stringify(metadata));
      }

      const response = await unifiedApi.post("/api", {
        operation: "storage",
        resource: "files",
        action: "create",
        params: { formData },
      });
      return response.data;
    },

    getFile: async (fileId: string) => {
      return unifiedAPI.request({
        operation: "storage",
        resource: "files",
        action: "get",
        params: { fileId },
      });
    },

    updateFile: async (fileId: string, updates: Record<string, unknown>) => {
      return unifiedAPI.request({
        operation: "storage",
        resource: "files",
        action: "update",
        params: { fileId, updates },
      });
    },

    deleteFile: async (fileId: string) => {
      return unifiedAPI.request({
        operation: "storage",
        resource: "files",
        action: "delete",
        params: { fileId },
      });
    },

    downloadFile: async (fileId: string) => {
      return unifiedAPI.request({
        operation: "storage",
        resource: "files",
        action: "download",
        params: { fileId },
      });
    },
  },

  // AI operations
  ai: {
    chat: async (
      messages: Array<{ role: string; content: string }>,
      options?: Record<string, unknown>
    ) => {
      return unifiedAPI.request({
        operation: "ai",
        resource: "chat",
        action: "create",
        params: { messages, options },
      });
    },

    listModels: async () => {
      return unifiedAPI.request({
        operation: "ai",
        resource: "models",
        action: "list",
      });
    },

    pullModel: async (model: string) => {
      return unifiedAPI.request({
        operation: "ai",
        resource: "models",
        action: "create",
        params: { model },
      });
    },

    generate: async (prompt: string, options?: Record<string, unknown>) => {
      return unifiedAPI.request({
        operation: "ai",
        resource: "generate",
        action: "create",
        params: { prompt, options },
      });
    },
  },

  // Health check
  health: async () => {
    const response = await unifiedApi.get("/health");
    return response.data;
  },
};

export default unifiedAPI;
