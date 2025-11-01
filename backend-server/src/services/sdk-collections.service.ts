import { CollectionsService, FieldType } from "@krapi/sdk";

export class SDKCollectionsService {
  constructor(private collectionsService: CollectionsService) {}

  async getProjectCollections(
    _projectId: string,
    _options: {
      limit?: number;
      offset?: number;
      search?: string;
      active?: boolean;
    } = {}
  ): Promise<unknown[]> {
    // SDK doesn't have getProjectCollections, this would need to be implemented
    throw new Error("getProjectCollections not implemented in SDK");
  }

  async getCollectionById(_collectionId: string): Promise<unknown | null> {
    // SDK doesn't have getCollectionById, this would need to be implemented
    throw new Error("getCollectionById not implemented in SDK");
  }

  async getCollectionsByProject(projectId: string): Promise<unknown[]> {
    return await this.collectionsService.getCollectionsByProject(projectId);
  }

  async getDocuments(
    projectId: string,
    collectionName: string,
    filter?: {
      search?: string;
      field_filters?: Record<string, unknown>;
      created_after?: string;
      created_before?: string;
      updated_after?: string;
      updated_before?: string;
      created_by?: string;
      updated_by?: string;
    },
    options?: {
      limit?: number;
      offset?: number;
      sort_by?: string;
      sort_order?: "asc" | "desc";
    }
  ): Promise<unknown[]> {
    // SDK expects: getDocuments(projectId, collectionName, filter?, options?)
    return await this.collectionsService.getDocuments(
      projectId,
      collectionName,
      filter,
      options
    );
  }

  async createDocument(
    collectionId: string,
    data: Record<string, unknown>
  ): Promise<unknown> {
    // SDK expects: createDocument(projectId, collectionName, CreateDocumentRequest)
    // We need to convert this to match the expected signature
    const documentData = { data, created_by: "system" };
    return await this.collectionsService.createDocument(
      "",
      collectionId,
      documentData
    );
  }

  async createCollection(
    projectId: string,
    collectionData: {
      name: string;
      description?: string;
      fields: Array<{
        name: string;
        type: string;
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
  ): Promise<unknown> {
    // Convert string type to FieldType enum
    const fieldsWithProperTypes = collectionData.fields.map((field) => ({
      ...field,
      type: field.type as FieldType,
    }));

    return await this.collectionsService.createCollection({
      name: collectionData.name,
      description: collectionData.description,
      fields: fieldsWithProperTypes,
      indexes: collectionData.indexes,
    });
  }

  async updateCollection(
    _collectionId: string,
    _updates: Partial<{
      name: string;
      description?: string;
      fields: Array<{
        name: string;
        type: string;
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
    }>
  ): Promise<unknown> {
    // SDK doesn't have updateCollection, this would need to be implemented
    throw new Error("updateCollection not implemented in SDK");
  }

  async deleteCollection(_collectionId: string): Promise<boolean> {
    // SDK doesn't have deleteCollection, this would need to be implemented
    throw new Error("deleteCollection not implemented in SDK");
  }

  async getCollectionDocuments(
    _collectionId: string,
    _options: {
      limit?: number;
      offset?: number;
      search?: string;
      fields?: string[];
    } = {}
  ): Promise<unknown[]> {
    // SDK doesn't have getCollectionDocuments, this would need to be implemented
    throw new Error("getCollectionDocuments not implemented in SDK");
  }

  async updateDocument(
    projectId: string,
    collectionName: string,
    documentId: string,
    updateData: Record<string, unknown>
  ): Promise<unknown | null> {
    // SDK expects: updateDocument(projectId, collectionName, documentId, UpdateDocumentRequest)
    return await this.collectionsService.updateDocument(
      projectId,
      collectionName,
      documentId,
      { data: updateData }
    );
  }

  async deleteDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<boolean> {
    // SDK expects: deleteDocument(projectId, collectionName, documentId, deletedBy?)
    return await this.collectionsService.deleteDocument(
      projectId,
      collectionName,
      documentId
    );
  }

  async getDocumentById(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<unknown | null> {
    // SDK expects: getDocumentById(projectId, collectionName, documentId)
    return await this.collectionsService.getDocumentById(
      projectId,
      collectionName,
      documentId
    );
  }

  async searchDocuments(
    projectId: string,
    collectionName: string,
    query: string,
    options: {
      limit?: number;
      offset?: number;
      fields?: string[];
    } = {}
  ): Promise<unknown[]> {
    // SDK expects: searchDocuments(projectId, collectionName, searchQuery, options?)
    return await this.collectionsService.searchDocuments(
      projectId,
      collectionName,
      query,
      options
    );
  }

  async batchCreateDocuments(
    projectId: string,
    collectionName: string,
    documents: Record<string, unknown>[]
  ): Promise<unknown[]> {
    // SDK expects: createDocuments(projectId, collectionName, CreateDocumentRequest[])
    const documentRequests = documents.map((doc) => ({ data: doc }));
    return await this.collectionsService.createDocuments(
      projectId,
      collectionName,
      documentRequests
    );
  }

  async batchUpdateDocuments(
    _projectId: string,
    _collectionName: string,
    _updates: Array<{
      id: string;
      data: Record<string, unknown>;
    }>
  ): Promise<unknown[]> {
    // SDK doesn't have batchUpdateDocuments, this would need to be implemented
    throw new Error("batchUpdateDocuments not implemented in SDK");
  }

  async batchDeleteDocuments(
    _projectId: string,
    _collectionName: string,
    _documentIds: string[]
  ): Promise<boolean[]> {
    // SDK doesn't have batchDeleteDocuments, this would need to be implemented
    throw new Error("batchDeleteDocuments not implemented in SDK");
  }

  async getCollectionSchema(_collectionId: string): Promise<unknown> {
    // SDK doesn't have getCollectionSchema, this would need to be implemented
    throw new Error("getCollectionSchema not implemented in SDK");
  }

  async validateDocument(
    _collectionId: string,
    _documentData: Record<string, unknown>
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    // SDK doesn't have validateDocument, this would need to be implemented
    throw new Error("validateDocument not implemented in SDK");
  }

  async getCollectionStats(_collectionId: string): Promise<{
    totalDocuments: number;
    totalSize: number;
    lastUpdated: string;
  }> {
    // SDK doesn't have getCollectionStats, this would need to be implemented
    throw new Error("getCollectionStats not implemented in SDK");
  }
}
