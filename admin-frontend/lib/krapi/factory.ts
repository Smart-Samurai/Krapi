import KrapiClient, { KrapiConfig } from "./client";
import { KrapiAuth, createKrapiAuth } from "./auth";
import { KrapiAdmin, createKrapiAdmin } from "./admin";
import { KrapiDatabase, createKrapiDatabase } from "./database";
import { KrapiStorage, createKrapiStorage } from "./storage";
import { KrapiUsers, createKrapiUsers } from "./users";
import { KrapiProjects, createKrapiProjects } from "./projects";
import { KrapiEmail, createKrapiEmail } from "./email";

export interface KrapiPackage {
  client: KrapiClient;
  auth: KrapiAuth;
  admin: KrapiAdmin;
  database: KrapiDatabase;
  storage: KrapiStorage;
  users: KrapiUsers;
  projects: KrapiProjects;
  email: KrapiEmail;
}

// Create the complete Krapi package
export function createKrapi(config: KrapiConfig): KrapiPackage {
  const client = new KrapiClient(config);

  return {
    client,
    auth: createKrapiAuth(client),
    admin: createKrapiAdmin(client),
    database: createKrapiDatabase(client),
    storage: createKrapiStorage(client),
    users: createKrapiUsers(client),
    projects: createKrapiProjects(client),
    email: createKrapiEmail(client),
  };
}

// Default configuration
export const defaultConfig: KrapiConfig = {
  endpoint: "http://localhost:3470/krapi/v1",
  timeout: 30000,
};

// Create Krapi with default configuration
export function createDefaultKrapi(): KrapiPackage {
  return createKrapi(defaultConfig);
}

// Create Krapi with custom endpoint
export function createKrapiWithEndpoint(
  endpoint: string,
  apiKey?: string,
  secret?: string
): KrapiPackage {
  return createKrapi({
    endpoint,
    ...(apiKey && { apiKey }),
    ...(secret && { secret }),
    timeout: 30000,
  });
}
