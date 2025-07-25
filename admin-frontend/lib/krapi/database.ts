import KrapiClient, { KrapiResponse } from "./client";
import { Collection, Document } from "./types";

export class KrapiDatabase {
  private client: KrapiClient;

  constructor(client: KrapiClient) {
    this.client = client;
  }

  // Collections
  async listCollections(): Promise<KrapiResponse<Collection[]>> {
    return this.client.request("database", "collections", "list");
  }

  async getCollection(
    collectionId: string
  ): Promise<KrapiResponse<Collection>> {
    return this.client.request("database", "collections", "get", {
      collectionId,
    });
  }

  async createCollection(collectionData: {
    name: string;
    description?: string;
    schema: Record<string, any>;
    permissions?: Record<string, any>;
  }): Promise<KrapiResponse<Collection>> {
    return this.client.request(
      "database",
      "collections",
      "create",
      collectionData
    );
  }

  async updateCollection(
    collectionId: string,
    updates: Partial<Collection>
  ): Promise<KrapiResponse<Collection>> {
    return this.client.request("database", "collections", "update", {
      collectionId,
      ...updates,
    });
  }

  async deleteCollection(collectionId: string): Promise<KrapiResponse> {
    return this.client.request("database", "collections", "delete", {
      collectionId,
    });
  }

  // Documents
  async listDocuments(
    collectionId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<KrapiResponse<Document[]>> {
    return this.client.request("database", "documents", "list", {
      collectionId,
      limit,
      offset,
    });
  }

  async getDocument(documentId: string): Promise<KrapiResponse<Document>> {
    return this.client.request("database", "documents", "get", { documentId });
  }

  async createDocument(documentData: {
    collectionId: string;
    data: Record<string, any>;
  }): Promise<KrapiResponse<Document>> {
    return this.client.request("database", "documents", "create", documentData);
  }

  async updateDocument(
    documentId: string,
    updates: Partial<Document>
  ): Promise<KrapiResponse<Document>> {
    return this.client.request("database", "documents", "update", {
      documentId,
      ...updates,
    });
  }

  async deleteDocument(documentId: string): Promise<KrapiResponse> {
    return this.client.request("database", "documents", "delete", {
      documentId,
    });
  }
}

// Create database instance from client
export function createKrapiDatabase(client: KrapiClient): KrapiDatabase {
  return new KrapiDatabase(client);
}
