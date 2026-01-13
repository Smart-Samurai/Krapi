#!/usr/bin/env node
/**
 * Standalone File Decryption CLI Tool
 *
 * Decrypts files using the same decryption functions as the KRAPI application.
 * Can be used manually when the server is down to decrypt files.
 *
 * Usage:
 *   npx ts-node scripts/decrypt-file.ts <encrypted-file> <output-file> [--key <hex-key>]
 *   npx ts-node scripts/decrypt-file.ts encrypted.bin decrypted.txt
 *   npx ts-node scripts/decrypt-file.ts encrypted.bin decrypted.txt --key a1b2c3d4...
 *
 * The decryption key can be provided via:
 *   - --key command line argument (64 hex characters)
 *   - FILE_ENCRYPTION_KEY environment variable
 *   - Interactive prompt (if neither is provided)
 *
 * TODO: MIGRATE TO SDK
 * This CLI tool should eventually be part of @smartsamurai/krapi-sdk CLI tools
 * (e.g., krapi-cli decrypt). Once migrated, this script should be removed.
 *
 * Target SDK location: @smartsamurai/krapi-sdk/cli/decrypt
 *
 * @module scripts/decrypt-file
 */

import * as fs from "fs/promises";
import * as readline from "readline";

// Import decryption functions from the service
// These are pure functions that can be used standalone
import { decryptFile } from "../src/services/file-encryption.service";

/**
 * Get decryption key from various sources
 */
async function getDecryptionKey(): Promise<Buffer> {
  // Check command line arguments
  const args = process.argv.slice(2);
  const keyIndex = args.indexOf("--key");
  if (keyIndex !== -1 && keyIndex + 1 < args.length) {
    const key = args[keyIndex + 1];
    if (key && key.length === 64) {
      return Buffer.from(key, "hex");
    }
    throw new Error("Decryption key must be 64 hex characters (32 bytes)");
  }

  // Check environment variable
  const envKey = process.env.FILE_ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    // If it's not 64 hex chars, derive from password
    const crypto = require("crypto");
    return crypto.pbkdf2Sync(
      envKey,
      "krapi-file-encryption-salt",
      100000,
      32,
      "sha256"
    );
  }

  // Prompt user for key
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question(
      "Enter decryption key (64 hex characters) or press Enter to use default (development only): ",
      async (answer) => {
        rl.close();

        if (!answer || answer.trim() === "") {
          if (process.env.NODE_ENV === "production") {
            reject(
              new Error(
                "Decryption key is required in production. Set FILE_ENCRYPTION_KEY or use --key argument."
              )
            );
            return;
          }
          // Development default (not secure!)
          console.warn(
            "⚠️  WARNING: Using default decryption key for development!"
          );
          const crypto = require("crypto");
          resolve(
            crypto.pbkdf2Sync(
              "krapi-dev-default-key-change-in-production",
              "krapi-file-encryption-salt",
              100000,
              32,
              "sha256"
            )
          );
          return;
        }

        const key = answer.trim();
        if (key.length === 64) {
          resolve(Buffer.from(key, "hex"));
        } else {
          reject(
            new Error("Decryption key must be 64 hex characters (32 bytes)")
          );
        }
      }
    );
  });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);

    // Parse arguments
    if (args.length < 2) {
      console.error("Usage: decrypt-file.ts <encrypted-file> <output-file> [--key <hex-key>]");
      console.error("");
      console.error("Options:");
      console.error("  <encrypted-file>  Path to encrypted file");
      console.error("  <output-file>    Path to save decrypted file");
      console.error("  --key <hex>      Decryption key (64 hex characters)");
      console.error("");
      console.error("The decryption key can also be set via FILE_ENCRYPTION_KEY environment variable.");
      process.exit(1);
    }

    const encryptedFile = args[0];
    const outputFile = args[1];

    if (!encryptedFile || !outputFile) {
      console.error("Error: Both encrypted and output file paths are required");
      process.exit(1);
    }

    // Validate encrypted file exists
    try {
      await fs.access(encryptedFile);
    } catch {
      console.error(`Error: Encrypted file not found: ${encryptedFile}`);
      process.exit(1);
    }

    // Get decryption key
    console.log("🔐 Getting decryption key...");
    const decryptionKey = await getDecryptionKey();

    // Read encrypted file
    console.log(`📖 Reading encrypted file: ${encryptedFile}`);
    const encryptedBuffer = await fs.readFile(encryptedFile);

    // Decrypt file
    console.log("🔓 Decrypting file...");
    try {
      const decryptedBuffer = await decryptFile(encryptedBuffer, decryptionKey);

      // Write decrypted file
      console.log(`💾 Writing decrypted file: ${outputFile}`);
      await fs.writeFile(outputFile, decryptedBuffer);

      console.log("✅ File decrypted successfully!");
      console.log(`   Input:  ${encryptedFile} (${encryptedBuffer.length} bytes)`);
      console.log(`   Output: ${outputFile} (${decryptedBuffer.length} bytes)`);
    } catch (error) {
      console.error("❌ Decryption failed:", error instanceof Error ? error.message : error);
      console.error("");
      console.error("Possible causes:");
      console.error("  - Wrong decryption key");
      console.error("  - File is corrupted");
      console.error("  - File was encrypted with a different key");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
