// Main Krapi package entry point
export * from "./client";
export * from "./types";
export * from "./auth";
export * from "./admin";
export * from "./database";
export * from "./storage";
export * from "./users";
export * from "./projects";
export * from "./email";
export * from "./factory";

// Default exports
export { default as KrapiClient } from "./client";
export {
  createKrapi,
  createDefaultKrapi,
  createKrapiWithEndpoint,
} from "./factory";

// Convenience exports for common use cases
export { KrapiAuth } from "./auth";
export { KrapiAdmin } from "./admin";
export { KrapiDatabase } from "./database";
export { KrapiStorage } from "./storage";
export { KrapiUsers } from "./users";
export { KrapiProjects } from "./projects";
export { KrapiEmail } from "./email";
