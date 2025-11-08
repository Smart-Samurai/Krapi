/**
 * Default Collections Utility for SDK
 * 
 * Defines default collections that should be created for every new project.
 * These collections provide common functionality that all projects need.
 * 
 * @module utils/default-collections
 * @example
 * import { getDefaultUsersCollection } from './utils/default-collections';
 * const usersCollection = getDefaultUsersCollection();
 * await collectionsService.createCollection(projectId, usersCollection);
 */
import { FieldType } from "../core";

/**
 * Default Collection Interface
 * 
 * @interface DefaultCollection
 * @property {string} name - Collection name
 * @property {string} description - Collection description
 * @property {Array} fields - Collection field definitions
 * @property {Array} [indexes] - Collection index definitions
 */
export interface DefaultCollection {
  name: string;
  description: string;
  fields: Array<{
    name: string;
    type: FieldType;
    required?: boolean;
    unique?: boolean;
    indexed?: boolean;
    default?: unknown;
    description?: string;
  }>;
  indexes?: Array<{
    name: string;
    fields: string[];
    unique?: boolean;
  }>;
}

/**
 * Get the default "users" collection schema
 * 
 * This collection provides user management functionality with:
 * - Unique username and user ID
 * - Secure password storage (should be hashed by the application)
 * - Optional contact information (email, phone)
 * - Confirmation state tracking
 * - Personal information fields
 * 
 * @returns {DefaultCollection} Default users collection schema
 * 
 * @example
 * const usersCollection = getDefaultUsersCollection();
 * await collectionsService.createCollection(projectId, usersCollection);
 */
export function getDefaultUsersCollection(): DefaultCollection {
  return {
    name: "users",
    description: "User accounts and profiles with authentication and profile data",
    fields: [
      {
        name: "username",
        type: FieldType.string,
        required: true,
        unique: true,
        indexed: true,
        description: "Unique username for the user",
      },
      {
        name: "user_unique_id",
        type: FieldType.uniqueID,
        required: true,
        unique: true,
        indexed: true,
        description: "Unique identifier for the user",
      },
      {
        name: "password",
        type: FieldType.string,
        required: true,
        indexed: false,
        description: "Hashed password (should be hashed before storage)",
      },
      {
        name: "email",
        type: FieldType.email,
        required: false,
        unique: false,
        indexed: true,
        description: "User email address",
      },
      {
        name: "phone",
        type: FieldType.phone,
        required: false,
        unique: false,
        indexed: false,
        description: "User phone number",
      },
      {
        name: "confirmation_state",
        type: FieldType.string,
        required: false,
        unique: false,
        indexed: true,
        default: "not_confirmed",
        description: "Confirmation state: 'not_confirmed' or 'confirmed'",
      },
      {
        name: "address",
        type: FieldType.text,
        required: false,
        unique: false,
        indexed: false,
        description: "User address",
      },
      {
        name: "name",
        type: FieldType.string,
        required: false,
        unique: false,
        indexed: false,
        description: "User first name",
      },
      {
        name: "last_name",
        type: FieldType.string,
        required: false,
        unique: false,
        indexed: false,
        description: "User last name",
      },
      {
        name: "created_at",
        type: FieldType.timestamp,
        required: false,
        unique: false,
        indexed: false,
        description: "Account creation timestamp",
      },
      {
        name: "updated_at",
        type: FieldType.timestamp,
        required: false,
        unique: false,
        indexed: false,
        description: "Last update timestamp",
      },
    ],
    indexes: [
      {
        name: "idx_users_username",
        fields: ["username"],
        unique: true,
      },
      {
        name: "idx_users_email",
        fields: ["email"],
        unique: false,
      },
      {
        name: "idx_users_confirmation",
        fields: ["confirmation_state"],
        unique: false,
      },
    ],
  };
}

/**
 * Get all default collections that should be created for a new project
 * 
 * @returns Array of default collection schemas
 */
export function getDefaultCollections(): DefaultCollection[] {
  return [
    getDefaultUsersCollection(),
    // Add more default collections here as needed
    // Example: getDefaultProductsCollection(), getDefaultOrdersCollection(), etc.
  ];
}

