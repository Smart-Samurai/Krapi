import { KrapiWrapper } from "@krapi/sdk";
import type {
  ApiResponse,
  PaginatedResponse,
  AdminUser,
  Project,
  Collection,
  Document,
  ProjectUser,
  Scope,
  ProjectScope,
} from "@krapi/sdk";

// Type assertions to ensure frontend is using SDK types correctly
// This file will fail to compile if SDK types change in incompatible ways

// Test that our API client returns the expected types
async function typeChecks() {
  const sdk = new KrapiWrapper();

  // Auth types
  const loginResponse = await sdk.auth.login("user", "pass");

  const currentUser: ApiResponse<AdminUser> = await sdk.auth.getCurrentUser();

  // Project types
  const projects = await sdk.projects.getAll();
  const project: ApiResponse<Project> = await sdk.projects.get("id");
  const newProject: ApiResponse<Project> = await sdk.projects.create({
    name: "test",
    description: "test",
  });

  // Collection types
  const collections = await sdk.collections.getAll("projectId");
  const collection: ApiResponse<Collection> = await sdk.collections.get(
    "projectId",
    "name"
  );

  // Document types
  const documents = await sdk.documents.getAll("projectId", "collection");
  const document: ApiResponse<Document> = await sdk.documents.get(
    "projectId",
    "collection",
    "id"
  );

  // User types
  const users = await sdk.users.getAll("projectId");
  const user: ApiResponse<ProjectUser> = await sdk.users.get(
    "projectId",
    "userId"
  );

  // Session types
  const sessionResponse = await sdk.auth.createSession("api_key");

  console.log("All type checks passed!");
}

// Export a type that must match the SDK's shape
export type ValidatedSDKTypes = {
  AdminUser: AdminUser;
  Project: Project;
  Collection: Collection;
  Document: Document;
  ProjectUser: ProjectUser;
  Scope: typeof Scope;
  ProjectScope: typeof ProjectScope;
};

console.log("SDK type validation script loaded successfully");
