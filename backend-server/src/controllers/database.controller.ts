import { Request, Response } from 'express';
import { DatabaseService } from '@/services/database.service';
import { AuthenticatedRequest, ApiResponse, PaginatedResponse, TableSchema, Document, ChangeAction, FieldType } from '@/types';

export class DatabaseController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Get all table schemas for a project
  getTableSchemas = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Verify project exists
      const project = this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        } as ApiResponse);
        return;
      }

      const schemas = await this.db.getProjectTableSchemas(projectId);

      res.status(200).json({
        success: true,
        data: schemas
      } as ApiResponse<TableSchema[]>);
        return;
    } catch (error) {
      console.error('Get table schemas error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch table schemas'
      } as ApiResponse);
        return;
    }
  };

  // Get table schema by name
  getTableSchema = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, tableName } = req.params;

      const schema = await this.db.getTableSchema(projectId, tableName);

      if (!schema) {
        res.status(404).json({
          success: false,
          error: 'Table schema not found'
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: schema
      } as ApiResponse<TableSchema>);
        return;
    } catch (error) {
      console.error('Get table schema error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch table schema'
      } as ApiResponse);
        return;
    }
  };

  // Create table schema
  createTableSchema = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { projectId } = req.params;
      const { name, description, fields, indexes = [] } = req.body;

      // Verify project exists
      const project = this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        } as ApiResponse);
        return;
      }

      // Check if table already exists
      const existing = await this.db.getTableSchema(projectId, name);
      if (existing) {
        res.status(400).json({
          success: false,
          error: 'Table with this name already exists'
        } as ApiResponse);
        return;
      }

      // Validate fields
      const validatedFields = this.validateFields(fields);
      if (!validatedFields) {
        res.status(400).json({
          success: false,
          error: 'Invalid field configuration'
        } as ApiResponse);
        return;
      }

      // Create schema
      const schema = await this.db.createTableSchema(
        projectId,
        name,
        { description, fields: validatedFields, indexes },
        authReq.user?.id || authReq.session?.api_key || 'system'
      );

      // Log action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: 'table_schema',
        entity_id: schema.id,
        action: ChangeAction.CREATE,
        changes: { name, fields: fields.length },
        performed_by: authReq.user?.id || authReq.session?.api_key || 'system',
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        data: schema
      } as ApiResponse<TableSchema>);
        return;
    } catch (error) {
      console.error('Create table schema error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create table schema'
      } as ApiResponse);
        return;
    }
  };

  // Update table schema
  updateTableSchema = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { projectId, tableName } = req.params;
      const updates = req.body;

      // Get existing schema
      const existing = await this.db.getTableSchema(projectId, tableName);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Table schema not found'
        } as ApiResponse);
        return;
      }

      // Validate fields if updating
      if (updates.fields) {
        const validatedFields = this.validateFields(updates.fields);
        if (!validatedFields) {
          res.status(400).json({
            success: false,
            error: 'Invalid field configuration'
          } as ApiResponse);
        return;
        }
        updates.fields = validatedFields;
      }

      // Update schema
      const updated = await this.db.updateTableSchema(projectId, tableName, updates);

      if (!updated) {
        res.status(500).json({
          success: false,
          error: 'Failed to update table schema'
        } as ApiResponse);
        return;
      }

      // Log action
      const changes: any = {};
      Object.keys(updates).forEach(key => {
        if (JSON.stringify(updates[key]) !== JSON.stringify(existing[key as keyof TableSchema])) {
          changes[key] = { old: existing[key as keyof TableSchema], new: updates[key] };
        }
      });

      if (Object.keys(changes).length > 0) {
        await this.db.createChangelogEntry({
          project_id: projectId,
          entity_type: 'table_schema',
          entity_id: existing.id,
          action: ChangeAction.UPDATE,
          changes,
          performed_by: authReq.user?.id || authReq.session?.api_key || 'system',
          session_id: authReq.session?.id,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        data: updated
      } as ApiResponse<TableSchema>);
        return;
    } catch (error) {
      console.error('Update table schema error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update table schema'
      } as ApiResponse);
        return;
    }
  };

  // Delete table schema
  deleteTableSchema = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { projectId, tableName } = req.params;

      // Get existing schema
      const existing = await this.db.getTableSchema(projectId, tableName);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Table schema not found'
        } as ApiResponse);
        return;
      }

      // Check if table has documents
      const { total } = await this.db.getDocumentsByTable(existing.id);
      if (total > 0) {
        res.status(400).json({
          success: false,
          error: `Cannot delete table with ${total} documents. Delete all documents first.`
        } as ApiResponse);
        return;
      }

      // Delete schema
      const deleted = await this.db.deleteTableSchema(projectId, tableName);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete table schema'
        } as ApiResponse);
        return;
      }

      // Log action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: 'table_schema',
        entity_id: existing.id,
        action: ChangeAction.DELETE,
        changes: { name: existing.name },
        performed_by: authReq.user?.id || authReq.session?.api_key || 'system',
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Table schema deleted successfully'
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Delete table schema error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete table schema'
      } as ApiResponse);
        return;
    }
  };

  // Get documents from a table
  getDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, tableName } = req.params;
      const { page = 1, limit = 50, sort, order, filter } = req.query;

      // Get table schema
      const schema = await this.db.getTableSchema(projectId, tableName);
      if (!schema) {
        res.status(404).json({
          success: false,
          error: 'Table not found'
        } as ApiResponse);
        return;
      }

      // Get documents
      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort: sort as string,
        order: order as string,
        filter: filter ? JSON.parse(filter as string) : undefined
      };

      const { documents, total } = await this.db.getDocumentsByTable(schema.id, options);

      res.status(200).json({
        success: true,
        data: documents,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          pages: Math.ceil(total / options.limit)
        }
      } as PaginatedResponse<Document>);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch documents'
      } as ApiResponse);
        return;
    }
  };

  // Get document by ID
  getDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, tableName, documentId } = req.params;

      // Verify table exists
      const schema = await this.db.getTableSchema(projectId, tableName);
      if (!schema) {
        res.status(404).json({
          success: false,
          error: 'Table not found'
        } as ApiResponse);
        return;
      }

      const document = await this.db.getDocument(projectId, tableName, documentId);

      if (!document || document.table_id !== schema.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found'
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: document
      } as ApiResponse<Document>);
        return;
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch document'
      } as ApiResponse);
        return;
    }
  };

  // Create document
  createDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { projectId, tableName } = req.params;
      const { data } = req.body;

      // Get table schema
      const schema = await this.db.getTableSchema(projectId, tableName);
      if (!schema) {
        res.status(404).json({
          success: false,
          error: 'Table not found'
        } as ApiResponse);
        return;
      }

      // Validate document data against schema
      const validation = this.validateDocument(data, schema);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error
        } as ApiResponse);
        return;
      }

      // Create document
      const document = await this.db.createDocument(
        projectId,
        tableName,
        validation.data,
        authReq.user?.id || authReq.session?.api_key || 'system'
      );

      // Log action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: 'document',
        entity_id: document.id,
        action: ChangeAction.CREATE,
        changes: { table: tableName },
        performed_by: authReq.user?.id || authReq.session?.api_key || 'system',
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        data: document
      } as ApiResponse<Document>);
        return;
    } catch (error) {
      console.error('Create document error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create document'
      } as ApiResponse);
        return;
    }
  };

  // Update document
  updateDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { projectId, tableName, documentId } = req.params;
      const { data } = req.body;

      // Get table schema
      const schema = await this.db.getTableSchema(projectId, tableName);
      if (!schema) {
        res.status(404).json({
          success: false,
          error: 'Table not found'
        } as ApiResponse);
        return;
      }

      // Get existing document
      const existing = await this.db.getDocument(projectId, tableName, documentId);
      if (!existing || existing.table_id !== schema.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found'
        } as ApiResponse);
        return;
      }

      // Merge with existing data
      const mergedData = { ...existing.data, ...data };

      // Validate document data against schema
      const validation = this.validateDocument(mergedData, schema);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error
        } as ApiResponse);
        return;
      }

      // Update document
      const updated = await this.db.updateDocument(
        projectId,
        tableName,
        documentId,
        validation.data,
        authReq.user?.id || authReq.session?.api_key || 'system'
      );

      if (!updated) {
        res.status(500).json({
          success: false,
          error: 'Failed to update document'
        } as ApiResponse);
        return;
      }

      // Log action
      const changes: any = {};
      Object.keys(data).forEach(key => {
        if (JSON.stringify(data[key]) !== JSON.stringify(existing.data[key])) {
          changes[key] = { old: existing.data[key], new: data[key] };
        }
      });

      if (Object.keys(changes).length > 0) {
        await this.db.createChangelogEntry({
          project_id: projectId,
          entity_type: 'document',
          entity_id: documentId,
          action: ChangeAction.UPDATE,
          changes,
          performed_by: authReq.user?.id || authReq.session?.api_key || 'system',
          session_id: authReq.session?.id,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        data: updated
      } as ApiResponse<Document>);
        return;
    } catch (error) {
      console.error('Update document error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update document'
      } as ApiResponse);
        return;
    }
  };

  // Delete document
  deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { projectId, tableName, documentId } = req.params;

      // Get table schema
      const schema = await this.db.getTableSchema(projectId, tableName);
      if (!schema) {
        res.status(404).json({
          success: false,
          error: 'Table not found'
        } as ApiResponse);
        return;
      }

      // Get existing document
      const existing = await this.db.getDocument(projectId, tableName, documentId);
      if (!existing || existing.table_id !== schema.id) {
        res.status(404).json({
          success: false,
          error: 'Document not found'
        } as ApiResponse);
        return;
      }

      // Delete document
      const deleted = await this.db.deleteDocument(projectId, tableName, documentId);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete document'
        } as ApiResponse);
        return;
      }

      // Log action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: 'document',
        entity_id: documentId,
        action: ChangeAction.DELETE,
        changes: { table: tableName },
        performed_by: authReq.user?.id || authReq.session?.api_key || 'system',
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Document deleted successfully'
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete document'
      } as ApiResponse);
        return;
    }
  };

  // Helper: Validate fields
  private validateFields(fields: any[]): any[] | null {
    if (!Array.isArray(fields) || fields.length === 0) {
      return null;
    }

    const fieldNames = new Set<string>();
    
    for (const field of fields) {
      if (!field.name || !field.type) {
        return null;
      }

      if (fieldNames.has(field.name)) {
        return null; // Duplicate field name
      }

      fieldNames.add(field.name);

      // Validate field type
      if (!Object.values(FieldType).includes(field.type)) {
        return null;
      }
    }

    return fields;
  }

  // Helper: Validate document against schema
  private validateDocument(data: any, schema: TableSchema): { valid: boolean, data?: any, error?: string } {
    const validatedData: any = {};

    // Check required fields
    for (const field of schema.fields) {
      const value = data[field.name];

      if (field.required && (value === undefined || value === null)) {
        return { valid: false, error: `Field '${field.name}' is required` };
      }

      if (value !== undefined && value !== null) {
        // Type validation
        const typeValidation = this.validateFieldType(value, field.type);
        if (!typeValidation.valid) {
          return { valid: false, error: `Field '${field.name}': ${typeValidation.error}` };
        }

        // Custom validation
        if (field.validation) {
          const customValidation = this.validateFieldCustom(value, field.validation);
          if (!customValidation.valid) {
            return { valid: false, error: `Field '${field.name}': ${customValidation.error}` };
          }
        }

        validatedData[field.name] = typeValidation.value;
      } else if (field.default !== undefined) {
        validatedData[field.name] = field.default;
      }
    }

    // Add system fields
    validatedData.id = data.id || require('uuid').v4();
    validatedData.created_at = data.created_at || new Date().toISOString();
    validatedData.updated_at = new Date().toISOString();

    return { valid: true, data: validatedData };
  }

  // Helper: Validate field type
  private validateFieldType(value: any, type: FieldType): { valid: boolean, value?: any, error?: string } {
    switch (type) {
      case FieldType.STRING:
        if (typeof value !== 'string') {
          return { valid: false, error: 'Must be a string' };
        }
        return { valid: true, value };

      case FieldType.NUMBER: {
        const num = Number(value);
        if (isNaN(num)) {
          return { valid: false, error: 'Must be a number' };
        }
        return { valid: true, value: num };
      }

      case FieldType.BOOLEAN:
        if (typeof value !== 'boolean') {
          return { valid: false, error: 'Must be a boolean' };
        }
        return { valid: true, value };

      case FieldType.DATE:
      case FieldType.DATETIME: {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { valid: false, error: 'Must be a valid date' };
        }
        return { valid: true, value: date.toISOString() };
      }

      case FieldType.JSON:
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return { valid: true, value: parsed };
          } catch {
            return { valid: false, error: 'Must be valid JSON' };
          }
        }
        return { valid: true, value };

      case FieldType.REFERENCE:
      case FieldType.FILE:
        if (typeof value !== 'string') {
          return { valid: false, error: 'Must be a string ID' };
        }
        return { valid: true, value };

      default:
        return { valid: false, error: 'Unknown field type' };
    }
  }

  // Helper: Validate field custom rules
  private validateFieldCustom(value: any, validation: any): { valid: boolean, error?: string } {
    if (validation.min !== undefined && value < validation.min) {
      return { valid: false, error: `Must be at least ${validation.min}` };
    }

    if (validation.max !== undefined && value > validation.max) {
      return { valid: false, error: `Must be at most ${validation.max}` };
    }

    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return { valid: false, error: 'Does not match required pattern' };
      }
    }

    if (validation.enum && !validation.enum.includes(value)) {
      return { valid: false, error: `Must be one of: ${validation.enum.join(', ')}` };
    }

    return { valid: true };
  }
}

export default new DatabaseController();