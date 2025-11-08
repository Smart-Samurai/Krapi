import { CollectionsService, FieldType } from "@krapi/sdk";

/**
 * SDK Collections Service Wrapper
 * 
 * Wrapper service that delegates to the SDK CollectionsService.
 * Provides a consistent interface for backend services to access collection operations.
 * 
 * @class SDKCollectionsService
 * @example
 * const collectionsService = new CollectionsService(dbConnection);
 * const sdkCollectionsService = new SDKCollectionsService(collectionsService);
 * const collections = await sdkCollectionsService.getCollectionsByProject('project-id');
 */
export class SDKCollectionsService {
  /**
   * Create a new SDKCollectionsService instance
   * 
   * @param {CollectionsService} collectionsService - SDK CollectionsService instance
   */
  constructor(private collectionsService: CollectionsService) {}

  /**
   * Get all collections for a project
   * 
   * @param {string} _projectId - Project ID
   * @param {Object} [_options] - Query options
   * @param {number} [_options.limit] - Maximum number of collections
   * @param {number} [_options.offset] - Number of collections to skip
   * @param {string} [_options.search] - Search term
   * @param {boolean} [_options.active] - Filter by active status
   * @returns {Promise<unknown[]>} Array of collections
   * @throws {Error} Not implemented in SDK
   * 
   * @example
   * const collections = await sdkCollectionsService.getProjectCollections('project-id');
   */
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

  /**
   * Get collection by ID
   * 
   * @param {string} _collectionId - Collection ID
   * @returns {Promise<unknown | null>} Collection or null if not found
   * @throws {Error} Not implemented in SDK
   * 
   * @example
   * const collection = await sdkCollectionsService.getCollectionById('collection-id');
   */
  async getCollectionById(_collectionId: string): Promise<unknown | null> {
    // SDK doesn't have getCollectionById, this would need to be implemented
    throw new Error("getCollectionById not implemented in SDK");
  }

  /**
   * Get collections by project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<unknown[]>} Array of collections
   * 
   * @example
   * const collections = await sdkCollectionsService.getCollectionsByProject('project-id');
   */
  async getCollectionsByProject(projectId: string): Promise<unknown[]> {
    return await this.collectionsService.getCollectionsByProject(projectId);
  }

  /**
   * Get documents from a collection
   * 
   * @param {string} projectId - Project ID
   * @param {string} collectionName - Collection name
   * @param {Object} [filter] - Document filters
   * @param {string} [filter.search] - Search term
   * @param {Record<string, unknown>} [filter.field_filters] - Field-specific filters
   * @param {string} [filter.created_after] - Filter by creation date (ISO string)
   * @param {string} [filter.created_before] - Filter by creation date (ISO string)
   * @param {string} [filter.updated_after] - Filter by update date (ISO string)
   * @param {string} [filter.updated_before] - Filter by update date (ISO string)
   * @param {string} [filter.created_by] - Filter by creator user ID
   * @param {string} [filter.updated_by] - Filter by updater user ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of documents
   * @param {number} [options.offset] - Number of documents to skip
   * @param {string} [options.sort_by] - Field to sort by
   * @param {"asc" | "desc"} [options.sort_order] - Sort order
   * @returns {Promise<unknown[]>} Array of documents
   * 
   * @example
   * const documents = await sdkCollectionsService.getDocuments(
   *   'project-id',
   *   'users',
   *   { search: 'john' },
   *   { limit: 10, sort_by: 'created_at', sort_order: 'desc' }
   * );
   */
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

  /**
   * Create a document in a collection
   * 
   * @param {string} collectionId - Collection ID/name
   * @param {Record<string, unknown>} data - Document data
   * @returns {Promise<unknown>} Created document
   * 
   * @example
   * const document = await sdkCollectionsService.createDocument('users', {
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   */
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

  /**
   * Create a new collection
   * 
   * @param {string} projectId - Project ID
   * @param {Object} collectionData - Collection data
   * @param {string} collectionData.name - Collection name
   * @param {string} [collectionData.description] - Collection description
   * @param {Array} collectionData.fields - Collection fields
   * @param {string} collectionData.fields[].name - Field name
   * @param {string} collectionData.fields[].type - Field type
   * @param {boolean} [collectionData.fields[].required] - Whether field is required
   * @param {boolean} [collectionData.fields[].unique] - Whether field is unique
   * @param {boolean} [collectionData.fields[].indexed] - Whether field is indexed
   * @param {unknown} [collectionData.fields[].default] - Default value
   * @param {string} [collectionData.fields[].description] - Field description
   * @param {Array} [collectionData.indexes] - Collection indexes
   * @param {string} collectionData.indexes[].name - Index name
   * @param {string[]} collectionData.indexes[].fields - Index fields
   * @param {boolean} [collectionData.indexes[].unique] - Whether index is unique
   * @returns {Promise<unknown>} Created collection
   * 
   * @example
   * const collection = await sdkCollectionsService.createCollection('project-id', {
   *   name: 'users',
   *   fields: [
   *     { name: 'email', type: 'string', required: true, unique: true }
   *   ]
   * });
   */
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
