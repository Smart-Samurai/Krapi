import { Request, Response } from "express";
import Ajv from "ajv";
import database from "../services/database";
import { ApiResponse, ContentSchema } from "../types";

const ajv = new Ajv({ strict: false });

// Validate if the provided schema is a valid JSON Schema
function validateJsonSchema(schema: unknown): {
  valid: boolean;
  errors?: string[];
} {
  try {
    // First check if it's an object
    if (
      typeof schema !== "object" ||
      schema === null ||
      Array.isArray(schema)
    ) {
      return { valid: false, errors: ["Schema must be an object"] };
    }

    const schemaObj = schema as Record<string, unknown>;

    // Check for required JSON Schema properties
    if (!schemaObj.type && !schemaObj.properties && !schemaObj.$ref) {
      return {
        valid: false,
        errors: ["Schema must have at least one of: type, properties, or $ref"],
      };
    }

    // Try to compile the schema with AJV to check if it's valid
    try {
      ajv.compile(schema);
      return { valid: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown schema validation error";
      return {
        valid: false,
        errors: [`Invalid JSON Schema: ${errorMessage}`],
      };
    }
  } catch {
    return {
      valid: false,
      errors: ["Schema must be valid JSON"],
    };
  }
}

export class SchemasController {
  // Get all schemas
  static getAllSchemas(req: Request, res: Response): void {
    try {
      const schemas = database.getAllSchemas();

      const response: ApiResponse<ContentSchema[]> = {
        success: true,
        data: schemas,
        message: `Retrieved ${schemas.length} schemas`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get all schemas error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve schemas",
      };
      res.status(500).json(response);
    }
  }

  // Get schema by ID
  static getSchemaById(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      const schema = database.getSchemaById(id);

      if (!schema) {
        const response: ApiResponse = {
          success: false,
          error: `Schema with ID ${id} not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<ContentSchema> = {
        success: true,
        data: schema,
        message: `Retrieved schema '${schema.name}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get schema by ID error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve schema",
      };
      res.status(500).json(response);
    }
  }

  // Get schema by name
  static getSchemaByName(req: Request, res: Response): void {
    try {
      const { name } = req.params;
      const schema = database.getSchemaByName(name);

      if (!schema) {
        const response: ApiResponse = {
          success: false,
          error: `Schema '${name}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<ContentSchema> = {
        success: true,
        data: schema,
        message: `Retrieved schema '${schema.name}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get schema by name error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve schema",
      };
      res.status(500).json(response);
    }
  }

  // Create new schema
  static createSchema(req: Request, res: Response): void {
    try {
      const { name, description, schema, version } = req.body;

      if (!name || !schema) {
        const response: ApiResponse = {
          success: false,
          error: "Name and schema are required",
        };
        res.status(400).json(response);
        return;
      }

      // Validate that schema is a proper JSON Schema
      const validation = validateJsonSchema(schema);
      if (!validation.valid) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid schema format: ${validation.errors?.join(", ")}`,
        };
        res.status(400).json(response);
        return;
      }

      const newSchema = database.createSchema({
        name,
        description,
        schema,
        version: version || "1.0.0",
      });

      const response: ApiResponse<ContentSchema> = {
        success: true,
        data: newSchema,
        message: `Schema '${name}' created successfully`,
      };

      res.status(201).json(response);
    } catch (error: unknown) {
      console.error("Create schema error:", error);

      if (
        error instanceof Error &&
        error.message &&
        error.message.includes("UNIQUE constraint")
      ) {
        const response: ApiResponse = {
          success: false,
          error: "A schema with this name already exists",
        };
        res.status(409).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          error: "Failed to create schema",
        };
        res.status(500).json(response);
      }
    }
  }

  // Update schema
  static updateSchema(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      if (updates.schema) {
        // Validate that schema is a proper JSON Schema
        const validation = validateJsonSchema(updates.schema);
        if (!validation.valid) {
          const response: ApiResponse = {
            success: false,
            error: `Invalid schema format: ${validation.errors?.join(", ")}`,
          };
          res.status(400).json(response);
          return;
        }
      }

      const updatedSchema = database.updateSchema(id, updates);

      if (!updatedSchema) {
        const response: ApiResponse = {
          success: false,
          error: `Schema with ID ${id} not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<ContentSchema> = {
        success: true,
        data: updatedSchema,
        message: `Schema '${updatedSchema.name}' updated successfully`,
      };

      res.json(response);
    } catch (error: unknown) {
      console.error("Update schema error:", error);

      if (
        error instanceof Error &&
        error.message &&
        error.message.includes("UNIQUE constraint")
      ) {
        const response: ApiResponse = {
          success: false,
          error: "A schema with this name already exists",
        };
        res.status(409).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          error: "Failed to update schema",
        };
        res.status(500).json(response);
      }
    }
  }

  // Delete schema
  static deleteSchema(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);

      // Check if schema is being used by any content
      const usedByContent = database.isSchemaInUse(id);
      if (usedByContent) {
        const response: ApiResponse = {
          success: false,
          error:
            "Cannot delete schema as it is currently being used by content items",
        };
        res.status(409).json(response);
        return;
      }

      const deleted = database.deleteSchema(id);

      if (!deleted) {
        const response: ApiResponse = {
          success: false,
          error: `Schema with ID ${id} not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: "Schema deleted successfully",
      };

      res.json(response);
    } catch (error) {
      console.error("Delete schema error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete schema",
      };
      res.status(500).json(response);
    }
  }

  // Get public schema (for external API consumers)
  static getPublicSchema(req: Request, res: Response): void {
    try {
      const { name } = req.params;
      const schema = database.getSchemaByName(name);

      if (!schema) {
        const response: ApiResponse = {
          success: false,
          error: `Schema '${name}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      // For public API, return just the schema structure
      const response: ApiResponse = {
        success: true,
        data: schema.schema,
        message: `Retrieved schema '${schema.name}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get public schema error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve schema",
      };
      res.status(500).json(response);
    }
  }
}
