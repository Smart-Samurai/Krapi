/**
 * File Encryption Service
 *
 * Provides AES-256-GCM encryption for uploaded files.
 * Files are encrypted at rest to ensure security.
 *
 * Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Random IV generation for each file
 * - Key derivation from master key
 * - Automatic decryption on read
 * - Auto-generation and database storage of encryption keys
 *
 * TODO: MIGRATE TO SDK
 * This is a temporary backend implementation. This functionality should be moved to
 * @smartsamurai/krapi-sdk as part of the SDK's storage module. Once migrated, the
 * backend should only wire SDK methods to HTTP routes.
 *
 * Target SDK location: @smartsamurai/krapi-sdk/storage/encryption
 *
 * @module services/file-encryption.service
 */

import * as crypto from "crypto";

import { DatabaseService } from "./database.service";
import { SecretEncryptionService } from "./secret-encryption.service";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Generate a new encryption key
 * Creates a cryptographically secure random 256-bit key
 *
 * @returns {string} Hex-encoded encryption key (64 characters)
 */
function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
}

/**
 * Get encryption key from environment, database, or generate new one
 * Priority: ENV > Database > Auto-generate
 * 
 * TODO: MIGRATE TO SDK - This should be handled by SDK's storage encryption module
 */
async function getEncryptionKey(): Promise<Buffer> {
  // 1. Check environment variable first (highest priority)
  const envKey = process.env.FILE_ENCRYPTION_KEY;
  if (envKey) {
    // If key is provided, use it directly (must be 64 hex chars = 32 bytes)
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    // Otherwise derive key from password
    return crypto.pbkdf2Sync(envKey, "krapi-file-encryption-salt", ITERATIONS, KEY_LENGTH, "sha256");
  }

  // 2. Check database for stored key
  try {
    const db = DatabaseService.getInstance();
    const secretEncryption = SecretEncryptionService.getInstance();
    
    const encryptedKey = await db.getSystemSecret("file_encryption_key");
    if (encryptedKey) {
      // Decrypt the key from database
      const decryptedKey = secretEncryption.decryptSecret(encryptedKey);
      return Buffer.from(decryptedKey, "hex");
    }
  } catch (error) {
    // Database not ready or error - will fall back to generation
    console.warn("Could not retrieve encryption key from database:", error instanceof Error ? error.message : "Unknown error");
  }

  // 3. Auto-generate new key and store in database
  if (process.env.NODE_ENV === "production") {
    // In production, we should have a key - but if not, generate and store it
    console.warn(
      "⚠️  WARNING: FILE_ENCRYPTION_KEY not set. Auto-generating and storing in database."
    );
  } else {
    console.warn(
      "⚠️  WARNING: Using auto-generated encryption key for development. Set FILE_ENCRYPTION_KEY in production!"
    );
  }

  const newKey = generateEncryptionKey();
  
  // Store in database (encrypted)
  try {
    const db = DatabaseService.getInstance();
    const secretEncryption = SecretEncryptionService.getInstance();
    
    const encryptedKey = secretEncryption.encryptSecret(newKey);
    await db.setSystemSecret("file_encryption_key", encryptedKey);
    
    console.log("✅ Encryption key auto-generated and stored in database");
  } catch (error) {
    // If database storage fails, we can still use the key for this session
    console.error("Failed to store encryption key in database:", error instanceof Error ? error.message : "Unknown error");
  }

  return Buffer.from(newKey, "hex");
}


/**
 * Encrypt file buffer
 * Pure function - can be used by both service and CLI scripts
 * TODO: MIGRATE TO SDK - These pure functions should be moved to SDK and exported from @smartsamurai/krapi-sdk/utils/encryption
 *
 * @param {Buffer} fileBuffer - File content to encrypt
 * @param {Buffer} [encryptionKey] - Optional encryption key (if not provided, will get from env/DB)
 * @returns {Buffer} Encrypted file buffer (IV + Salt + Encrypted Data + Auth Tag)
 */
export async function encryptFile(fileBuffer: Buffer, encryptionKey?: Buffer): Promise<Buffer> {
  const masterKey = encryptionKey || await getEncryptionKey();

  // Generate random IV and salt for this file
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive key for this file (adds extra security layer)
  const key = crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, "sha256");

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt file
  const encrypted = Buffer.concat([
    cipher.update(fileBuffer),
    cipher.final(),
  ]);

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Return: IV (16) + Salt (32) + Tag (16) + Encrypted Data
  return Buffer.concat([iv, salt, tag, encrypted]);
}

/**
 * Decrypt file buffer
 * Pure function - can be used by both service and CLI scripts
 * TODO: MIGRATE TO SDK - These pure functions should be moved to SDK and exported from @smartsamurai/krapi-sdk/utils/encryption
 *
 * @param {Buffer} encryptedBuffer - Encrypted file buffer
 * @param {Buffer} [encryptionKey] - Optional encryption key (if not provided, will get from env/DB)
 * @returns {Buffer} Decrypted file buffer
 * @throws {Error} If decryption fails (invalid key, corrupted data, etc.)
 */
export async function decryptFile(encryptedBuffer: Buffer, encryptionKey?: Buffer): Promise<Buffer> {
  const masterKey = encryptionKey || await getEncryptionKey();

  // Extract components
  if (encryptedBuffer.length < IV_LENGTH + SALT_LENGTH + TAG_LENGTH) {
    throw new Error("Encrypted file is too short - may be corrupted");
  }

  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const salt = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
  const tag = encryptedBuffer.subarray(
    IV_LENGTH + SALT_LENGTH,
    IV_LENGTH + SALT_LENGTH + TAG_LENGTH
  );
  const encrypted = encryptedBuffer.subarray(IV_LENGTH + SALT_LENGTH + TAG_LENGTH);

  // Derive key (same as encryption)
  const key = crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, "sha256");

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt file
  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted;
  } catch (error) {
    throw new Error(
      `File decryption failed: ${error instanceof Error ? error.message : "Unknown error"}. File may be corrupted or encrypted with a different key.`
    );
  }
}

/**
 * Check if buffer is encrypted
 * Encrypted files start with IV (16 bytes) + Salt (32 bytes) = 48 bytes minimum
 * and have a specific structure
 *
 * @param {Buffer} buffer - Buffer to check
 * @returns {boolean} True if buffer appears to be encrypted
 */
export function isEncrypted(buffer: Buffer): boolean {
  // Encrypted files must be at least IV + Salt + Tag + some data
  if (buffer.length < IV_LENGTH + SALT_LENGTH + TAG_LENGTH + 1) {
    return false;
  }

  // Check if it looks like encrypted data (heuristic)
  // Encrypted data should have high entropy
  // For now, we'll check file extension or metadata
  // In practice, we should store encryption status in database
  return false; // Default: assume not encrypted for backward compatibility
}

/**
 * File Encryption Service
 * Provides high-level file encryption/decryption operations
 * TODO: MIGRATE TO SDK - File encryption should be moved to @smartsamurai/krapi-sdk as part of the SDK's storage module. The SDK should handle all encryption/decryption logic.
 */
export class FileEncryptionService {
  private static instance: FileEncryptionService;
  private encryptionEnabled: boolean;
  private cachedKey: Buffer | null = null;
  private keyPromise: Promise<Buffer> | null = null;

  private constructor() {
    // Enable encryption by default (can be disabled via env var for migration)
    this.encryptionEnabled =
      process.env.FILE_ENCRYPTION_ENABLED !== "false" &&
      process.env.NODE_ENV !== "test"; // Disable in tests unless explicitly enabled
  }

  static getInstance(): FileEncryptionService {
    if (!FileEncryptionService.instance) {
      FileEncryptionService.instance = new FileEncryptionService();
    }
    return FileEncryptionService.instance;
  }

  /**
   * Get encryption key (cached for performance)
   * 
   * @returns {Promise<Buffer>} Encryption key buffer
   */
  private async getKey(): Promise<Buffer> {
    if (this.cachedKey) {
      return this.cachedKey;
    }

    // Prevent multiple simultaneous key fetches
    if (this.keyPromise) {
      return this.keyPromise;
    }

    this.keyPromise = getEncryptionKey().then((key) => {
      this.cachedKey = key;
      this.keyPromise = null;
      return key;
    });

    return this.keyPromise;
  }

  /**
   * Get encryption key from database
   * 
   * @returns {Promise<string | null>} Encryption key (hex) or null if not found
   */
  async getEncryptionKeyFromDatabase(): Promise<string | null> {
    try {
      const db = DatabaseService.getInstance();
      const secretEncryption = SecretEncryptionService.getInstance();
      
      const encryptedKey = await db.getSystemSecret("file_encryption_key");
      if (!encryptedKey) {
        return null;
      }

      return secretEncryption.decryptSecret(encryptedKey);
    } catch (error) {
      console.error("Error getting encryption key from database:", error);
      return null;
    }
  }

  /**
   * Store encryption key in database (encrypted)
   * 
   * @param {string} key - Encryption key (hex string)
   * @param {string} [createdBy] - User ID who created the key
   * @returns {Promise<void>}
   */
  async storeEncryptionKeyInDatabase(key: string, createdBy?: string): Promise<void> {
    try {
      const db = DatabaseService.getInstance();
      const secretEncryption = SecretEncryptionService.getInstance();
      
      const encryptedKey = secretEncryption.encryptSecret(key);
      await db.setSystemSecret("file_encryption_key", encryptedKey, createdBy);
      
      // Clear cache to force reload
      this.cachedKey = null;
    } catch (error) {
      console.error("Error storing encryption key in database:", error);
      throw error;
    }
  }

  /**
   * Generate a new encryption key
   * 
   * @returns {string} Hex-encoded encryption key (64 characters)
   */
  generateEncryptionKey(): string {
    return generateEncryptionKey();
  }

  /**
   * Encrypt file if encryption is enabled
   *
   * @param {Buffer} fileBuffer - File content
   * @returns {Promise<Buffer>} Encrypted or original buffer
   */
  async encrypt(fileBuffer: Buffer): Promise<Buffer> {
    if (!this.encryptionEnabled) {
      return fileBuffer;
    }
    const key = await this.getKey();
    return encryptFile(fileBuffer, key);
  }

  /**
   * Decrypt file if it's encrypted
   *
   * @param {Buffer} encryptedBuffer - Encrypted file content
   * @param {boolean} forceDecrypt - Force decryption even if encryption is disabled
   * @returns {Promise<Buffer>} Decrypted buffer
   */
  async decrypt(encryptedBuffer: Buffer, forceDecrypt = false): Promise<Buffer> {
    if (!this.encryptionEnabled && !forceDecrypt) {
      return encryptedBuffer;
    }

    // Try to decrypt - if it fails, return original (for backward compatibility)
    try {
      const key = await this.getKey();
      return decryptFile(encryptedBuffer, key);
    } catch (error) {
      // If decryption fails and encryption is disabled, assume file is not encrypted
      if (!this.encryptionEnabled) {
        return encryptedBuffer;
      }
      // If encryption is enabled, decryption failure is an error
      throw error;
    }
  }

  /**
   * Check if encryption is enabled
   */
  isEnabled(): boolean {
    return this.encryptionEnabled;
  }

  /**
   * Enable/disable encryption (for migration purposes)
   */
  setEnabled(enabled: boolean): void {
    this.encryptionEnabled = enabled;
  }
}
