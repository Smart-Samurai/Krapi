/**
 * Encryption Key Handler
 *
 * Handles requests for retrieving the file encryption key.
 * Only accessible to admins with proper scopes.
 *
 * TODO: MIGRATE TO SDK
 * This is a temporary backend implementation. This should eventually call
 * backendSDK.system.getEncryptionKey() when SDK implements it.
 *
 * Target SDK location: @smartsamurai/krapi-sdk/system/encryption-key
 *
 * @module routes/handlers/system/encryption-key.handler
 */

import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { DatabaseService } from "@/services/database.service";
import { FileEncryptionService } from "@/services/file-encryption.service";
import { SecretEncryptionService } from "@/services/secret-encryption.service";
import { ApiResponse } from "@/types";

/**
 * Handler for getting encryption key
 * GET /krapi/k1/system/encryption-key
 */
export class EncryptionKeyHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // eslint-disable-next-line no-warning-comments
      // TODO: This should eventually call backendSDK.system.getEncryptionKey() when SDK implements it

      const db = DatabaseService.getInstance();
      const fileEncryption = FileEncryptionService.getInstance();
      const secretEncryption = SecretEncryptionService.getInstance();

      // Determine key source
      let key: string | null = null;
      let source: "env" | "database" | "auto-generated" = "auto-generated";

      // Check environment variable first
      const envKey = process.env.FILE_ENCRYPTION_KEY;
      if (envKey) {
        if (envKey.length === 64) {
          key = envKey;
          source = "env";
        } else {
          // If it's not 64 hex chars, it's a password - we can't return the actual key
          // but we can indicate it's configured
          res.status(200).json({
            success: true,
            data: {
              key: null, // Don't expose password-derived keys
              configured: true,
              source: "env",
              message:
                "Encryption key is set via FILE_ENCRYPTION_KEY environment variable (password-based)",
            },
          } as ApiResponse);
          return;
        }
      } else {
        // Check database
        const encryptedKey = await db.getSystemSecret("file_encryption_key");
        if (encryptedKey) {
          key = secretEncryption.decryptSecret(encryptedKey);
          source = "database";
        } else {
          // Key doesn't exist - will be auto-generated on first use
          source = "auto-generated";
        }
      }

      // Return key information
      res.status(200).json({
        success: true,
        data: {
          key, // Full key for admin access (as requested)
          configured: key !== null,
          source,
          enabled: fileEncryption.isEnabled(),
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Error getting encryption key:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get encryption key",
      } as ApiResponse);
    }
  }
}
