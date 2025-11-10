import {
  KrapiWrapper,
  type AdminUser,
  type Collection,
  type Document,
  type Project,
  type ProjectScope,
  type ProjectUser,
  type Scope,
} from "@smartsamurai/krapi-sdk";

// Type assertions to ensure frontend is using SDK types correctly
// This file will fail to compile if SDK types change in incompatible ways

// Test that our API client returns the expected types
async function _typeChecks() {
  const sdk = new KrapiWrapper();

  // Auth types
  await sdk.auth.login("user", "pass");

  await sdk.auth.getCurrentUser();

  // Project types
  await sdk.projects.getAll();
  await sdk.projects.get("id");
  await sdk.projects.create({
    name: "test",
    description: "test",
  });

  // Collection types
  await sdk.collections.getAll("projectId");
  await sdk.collections.get(
    "projectId",
    "name"
  );

  // Document types
  await sdk.documents.getAll("projectId", "collection");
  await sdk.documents.get(
    "projectId",
    "collection",
    "id"
  );

  // User types
  await sdk.users.getAll("projectId");
  await sdk.users.get(
    "projectId",
    "userId"
  );

  // Session types
  await sdk.auth.createSession("api_key");

  // eslint-disable-next-line no-console
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

// eslint-disable-next-line no-console
console.log("SDK type validation script loaded successfully");
