#!/usr/bin/env node
/**
 * Standalone File Encryption CLI Tool
 *
 * Encrypts files using the same encryption functions as the KRAPI application.
 * Can be used manually when the server is down to encrypt files.
 *
 * Usage:
 *   npx ts-node scripts/encrypt-file.ts <input-file> <output-file> [--key <hex-key>]
 *   npx ts-node scripts/encrypt-file.ts input.txt encrypted.bin
 *   npx ts-node scripts/encrypt-file.ts input.txt encrypted.bin --key a1b2c3d4...
 *
 * The encryption key can be provided via:
 *   - --key command line argument (64 hex characters)
 *   - FILE_ENCRYPTION_KEY environment variable
 *   - Interactive prompt (if neither is provided)
 *
 * TODO: MIGRATE TO SDK
 * This CLI tool should eventually be part of @smartsamurai/krapi-sdk CLI tools
 * (e.g., krapi-cli encrypt). Once migrated, this script should be removed.
 *
 * Target SDK location: @smartsamurai/krapi-sdk/cli/encrypt
 *
 * @module scripts/encrypt-file
 */

import * as fs from "fs/promises";
import * as readline from "readline";

// Import encryption functions from the service
// These are pure functions that can be used standalone
import { encryptFile } from "../src/services/file-encryption.service";

/**
 * Get encryption key from various sources
 */
async function getEncryptionKey(): Promise<Buffer> {
  // Check command line arguments
  const args = process.argv.slice(2);
  const keyIndex = args.indexOf("--key");
  if (keyIndex !== -1 && keyIndex + 1 < args.length) {
    const key = args[keyIndex + 1];
    if (key && key.length === 64) {
      return Buffer.from(key, "hex");
    }
    throw new Error("Encryption key must be 64 hex characters (32 bytes)");
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
      "Enter encryption key (64 hex characters) or press Enter to use default (development only): ",
      async (answer) => {
        rl.close();

        if (!answer || answer.trim() === "") {
          if (process.env.NODE_ENV === "production") {
            reject(
              new Error(
                "Encryption key is required in production. Set FILE_ENCRYPTION_KEY or use --key argument."
              )
            );
            return;
          }
          // Development default (not secure!)
          console.warn(
            "⚠️  WARNING: Using default encryption key for development!"
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
            new Error("Encryption key must be 64 hex characters (32 bytes)")
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
      console.error("Usage: encrypt-file.ts <input-file> <output-file> [--key <hex-key>]");
      console.error("");
      console.error("Options:");
      console.error("  <input-file>    Path to file to encrypt");
      console.error("  <output-file>  Path to save encrypted file");
      console.error("  --key <hex>    Encryption key (64 hex characters)");
      console.error("");
      console.error("The encryption key can also be set via FILE_ENCRYPTION_KEY environment variable.");
      process.exit(1);
    }

    const inputFile = args[0];
    const outputFile = args[1];

    if (!inputFile || !outputFile) {
      console.error("Error: Both input and output file paths are required");
      process.exit(1);
    }

    // Validate input file exists
    try {
      await fs.access(inputFile);
    } catch {
      console.error(`Error: Input file not found: ${inputFile}`);
      process.exit(1);
    }

    // Get encryption key
    console.log("🔐 Getting encryption key...");
    const encryptionKey = await getEncryptionKey();

    // Read input file
    console.log(`📖 Reading file: ${inputFile}`);
    const fileBuffer = await fs.readFile(inputFile);

    // Encrypt file
    console.log("🔒 Encrypting file...");
    const encryptedBuffer = await encryptFile(fileBuffer, encryptionKey);

    // Write encrypted file
    console.log(`💾 Writing encrypted file: ${outputFile}`);
    await fs.writeFile(outputFile, encryptedBuffer);

    console.log("✅ File encrypted successfully!");
    console.log(`   Input:  ${inputFile} (${fileBuffer.length} bytes)`);
    console.log(`   Output: ${outputFile} (${encryptedBuffer.length} bytes)`);
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
