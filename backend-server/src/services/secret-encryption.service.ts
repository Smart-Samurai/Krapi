/**
 * Secret Encryption Service
 *
 * Provides encryption/decryption for system secrets stored in the database.
 * Uses a master key derived from JWT_SECRET to encrypt secrets at rest.
 *
 * Features:
 * - AES-256-GCM encryption for secrets
 * - Master key derivation from JWT_SECRET
 * - Secure secret storage in database
 *
 * TODO: MIGRATE TO SDK
 * This is a temporary backend implementation. This functionality should be moved to
 * @smartsamurai/krapi-sdk as part of the SDK's security module. Once migrated, the
 * backend should only wire SDK methods to HTTP routes.
 *
 * Target SDK location: @smartsamurai/krapi-sdk/security/secrets
 *
 * @module services/secret-encryption.service
 */

import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations
const MASTER_KEY_SALT = "krapi-master-key-salt"; // Consistent salt for master key derivation

/**
 * Derive master key from JWT_SECRET environment variable
 * This master key is used to encrypt/decrypt system secrets stored in the database
 *
 * @returns {Buffer} Master key buffer (32 bytes)
 * @throws {Error} If JWT_SECRET is not set in production
 */
function deriveMasterKey(): Buffer {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET environment variable must be set in production for secret encryption"
      );
    }
    // Development fallback (not secure!)
    console.warn(
      "⚠️  WARNING: JWT_SECRET not set. Using default master key for development. Set JWT_SECRET in production!"
    );
    return crypto.pbkdf2Sync(
      "krapi-dev-default-jwt-secret-change-in-production",
      MASTER_KEY_SALT,
      ITERATIONS,
      KEY_LENGTH,
      "sha256"
    );
  }

  // Derive master key from JWT_SECRET using PBKDF2
  return crypto.pbkdf2Sync(jwtSecret, MASTER_KEY_SALT, ITERATIONS, KEY_LENGTH, "sha256");
}

/**
 * Secret Encryption Service
 * Provides high-level secret encryption/decryption operations
 */
export class SecretEncryptionService {
  private static instance: SecretEncryptionService;

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): SecretEncryptionService {
    if (!SecretEncryptionService.instance) {
      SecretEncryptionService.instance = new SecretEncryptionService();
    }
    return SecretEncryptionService.instance;
  }

  /**
   * Derive master key from JWT_SECRET
   * Exposed for testing purposes
   *
   * @returns {Buffer} Master key buffer
   */
  deriveMasterKey(): Buffer {
    return deriveMasterKey();
  }

  /**
   * Encrypt a secret value
   * Uses AES-256-GCM with a random IV for each encryption
   *
   * @param {string} value - Plain text secret to encrypt
   * @returns {string} Encrypted value (hex-encoded: IV + Tag + Encrypted Data)
   * @throws {Error} If encryption fails
   */
  encryptSecret(value: string): string {
    const masterKey = deriveMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);

    // Encrypt value
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);

    // Get authentication tag
    const tag = cipher.getAuthTag();

    // Return: IV (16) + Tag (16) + Encrypted Data (all hex-encoded)
    const result = Buffer.concat([iv, tag, encrypted]);
    return result.toString("hex");
  }

  /**
   * Decrypt a secret value
   *
   * @param {string} encryptedValue - Encrypted value (hex-encoded)
   * @returns {string} Decrypted plain text secret
   * @throws {Error} If decryption fails (invalid key, corrupted data, etc.)
   */
  decryptSecret(encryptedValue: string): string {
    const masterKey = deriveMasterKey();

    // Convert from hex
    const encryptedBuffer = Buffer.from(encryptedValue, "hex");

    // Extract components
    if (encryptedBuffer.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error("Encrypted secret is too short - may be corrupted");
    }

    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(tag);

    // Decrypt value
    try {
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
    } catch (error) {
      throw new Error(
        `Secret decryption failed: ${error instanceof Error ? error.message : "Unknown error"}. Secret may be corrupted or encrypted with a different key.`
      );
    }
  }
}
