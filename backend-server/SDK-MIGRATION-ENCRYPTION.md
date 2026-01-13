# SDK Migration Guide: File Encryption and Key Management

## Overview

This document provides complete instructions for the SDK team to implement file encryption and encryption key management natively in the `@smartsamurai/krapi-sdk` package. The current implementation in the backend is temporary and should be migrated to the SDK as the single source of truth.

## Current Implementation Status

### Backend Implementation (Temporary)

The following files contain temporary backend implementations that need to be migrated:

1. **File Encryption Service**: `backend-server/src/services/file-encryption.service.ts`
2. **Secret Encryption Service**: `backend-server/src/services/secret-encryption.service.ts`
3. **Encryption Key Handler**: `backend-server/src/routes/handlers/system/encryption-key.handler.ts`
4. **CLI Scripts**: `backend-server/scripts/encrypt-file.ts`, `backend-server/scripts/decrypt-file.ts`

### Database Schema

The `system_secrets` table stores encrypted secrets:
```sql
CREATE TABLE IF NOT EXISTS system_secrets (
  id TEXT PRIMARY KEY,
  key_name TEXT UNIQUE NOT NULL,
  encrypted_value TEXT NOT NULL,
  encryption_method TEXT DEFAULT 'aes-256-gcm',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  metadata TEXT DEFAULT '{}'
)
```

## Target SDK Implementation

### 1. File Encryption Module

**Target Location**: `@smartsamurai/krapi-sdk/storage/encryption`

**Required Exports**:

```typescript
// Pure encryption/decryption functions
export async function encryptFile(
  fileBuffer: Buffer,
  encryptionKey?: Buffer
): Promise<Buffer>;

export async function decryptFile(
  encryptedBuffer: Buffer,
  encryptionKey?: Buffer
): Promise<Buffer>;

export function isEncrypted(buffer: Buffer): boolean;

// Encryption service class
export class FileEncryptionService {
  constructor(config: {
    encryptionKey?: string; // Optional: 64 hex chars
    enabled?: boolean; // Default: true
    databaseConnection?: DatabaseConnection; // For key storage
  });

  async encrypt(fileBuffer: Buffer): Promise<Buffer>;
  async decrypt(encryptedBuffer: Buffer, forceDecrypt?: boolean): Promise<Buffer>;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  
  // Key management
  async getEncryptionKeyFromDatabase(): Promise<string | null>;
  async storeEncryptionKeyInDatabase(key: string, createdBy?: string): Promise<void>;
  generateEncryptionKey(): string;
}
```

**Implementation Requirements**:

1. **Encryption Algorithm**: AES-256-GCM
   - IV: 16 bytes (random per file)
   - Salt: 32 bytes (random per file)
   - Auth Tag: 16 bytes
   - Key Length: 32 bytes (256 bits)

2. **File Format**: `[IV (16)] + [Salt (32)] + [Tag (16)] + [Encrypted Data]`

3. **Key Management**:
   - Priority: ENV variable > Database > Auto-generate
   - Auto-generated keys must be stored encrypted in database
   - Keys stored in `system_secrets` table with key_name = "file_encryption_key"

4. **Key Derivation** (if password provided):
   - Algorithm: PBKDF2
   - Hash: SHA-256
   - Iterations: 100,000
   - Salt: "krapi-file-encryption-salt"
   - Key Length: 32 bytes

### 2. Secret Encryption Module

**Target Location**: `@smartsamurai/krapi-sdk/security/secrets`

**Required Exports**:

```typescript
export class SecretEncryptionService {
  constructor(config: {
    masterKeySource?: string; // Default: "JWT_SECRET" env var
    masterKeySalt?: string; // Default: "krapi-master-key-salt"
  });

  deriveMasterKey(): Buffer;
  encryptSecret(value: string): string;
  decryptSecret(encryptedValue: string): string;
}
```

**Implementation Requirements**:

1. **Master Key Derivation**:
   - Source: `JWT_SECRET` environment variable
   - Algorithm: PBKDF2
   - Hash: SHA-256
   - Iterations: 100,000
   - Salt: "krapi-master-key-salt"
   - Key Length: 32 bytes

2. **Secret Encryption**:
   - Algorithm: AES-256-GCM
   - IV: 16 bytes (random per secret)
   - Auth Tag: 16 bytes
   - Format: `[IV (16)] + [Tag (16)] + [Encrypted Data]` (hex-encoded)

### 3. System Module - Encryption Key Management

**Target Location**: `@smartsamurai/krapi-sdk/system/encryption-key`

**Required Exports**:

```typescript
export interface EncryptionKeyInfo {
  key: string | null; // Full key (null if password-based)
  configured: boolean;
  source: "env" | "database" | "auto-generated";
  enabled: boolean;
}

export class EncryptionKeyManager {
  constructor(config: {
    databaseConnection: DatabaseConnection;
    secretEncryption: SecretEncryptionService;
    fileEncryption: FileEncryptionService;
  });

  async getEncryptionKey(): Promise<EncryptionKeyInfo>;
  async getEncryptionKeyFromDatabase(): Promise<string | null>;
  async storeEncryptionKeyInDatabase(key: string, createdBy?: string): Promise<void>;
  async generateAndStoreKey(createdBy?: string): Promise<string>;
}
```

**Implementation Requirements**:

1. **Key Retrieval Priority**:
   - Check `FILE_ENCRYPTION_KEY` environment variable first
   - Check database for stored key
   - Auto-generate if missing

2. **Key Storage**:
   - Encrypt key with `SecretEncryptionService` before storing
   - Store in `system_secrets` table with key_name = "file_encryption_key"

3. **API Integration**:
   - Should be accessible via `backendSDK.system.getEncryptionKey()`

### 4. CLI Tools

**Target Location**: `@smartsamurai/krapi-sdk/cli`

**Required Commands**:

```bash
# Encrypt a file
krapi-cli encrypt <input-file> <output-file> [--key <hex-key>]

# Decrypt a file
krapi-cli decrypt <encrypted-file> <output-file> [--key <hex-key>]
```

**Implementation Requirements**:

1. Use the same `encryptFile()` and `decryptFile()` functions from SDK
2. Support key from:
   - Command line argument (`--key`)
   - Environment variable (`FILE_ENCRYPTION_KEY`)
   - Interactive prompt
3. Provide clear error messages for wrong keys or corrupted files

## Migration Steps

### Phase 1: Core Encryption Functions

1. Create `@smartsamurai/krapi-sdk/storage/encryption` module
2. Implement `encryptFile()` and `decryptFile()` pure functions
3. Implement `FileEncryptionService` class
4. Add unit tests for encryption/decryption

### Phase 2: Secret Encryption

1. Create `@smartsamurai/krapi-sdk/security/secrets` module
2. Implement `SecretEncryptionService` class
3. Add unit tests for secret encryption/decryption

### Phase 3: Key Management

1. Create `@smartsamurai/krapi-sdk/system/encryption-key` module
2. Implement `EncryptionKeyManager` class
3. Integrate with database for key storage
4. Add `backendSDK.system.getEncryptionKey()` method

### Phase 4: CLI Tools

1. Create `@smartsamurai/krapi-sdk/cli` package
2. Implement `encrypt` and `decrypt` commands
3. Add documentation and examples

### Phase 5: Backend Migration

1. Update backend to use SDK methods:
   - Replace `FileEncryptionService` with `backendSDK.storage.encryption`
   - Replace `SecretEncryptionService` with `backendSDK.security.secrets`
   - Replace encryption key handler with `backendSDK.system.getEncryptionKey()`
2. Remove temporary backend implementations
3. Update tests to use SDK methods

## API Contract

### BackendSDK Methods

```typescript
// Storage encryption
backendSDK.storage.encryptFile(fileBuffer: Buffer, key?: Buffer): Promise<Buffer>;
backendSDK.storage.decryptFile(encryptedBuffer: Buffer, key?: Buffer): Promise<Buffer>;

// System encryption key
backendSDK.system.getEncryptionKey(): Promise<EncryptionKeyInfo>;

// Secret encryption (internal, but may be exposed)
backendSDK.security.encryptSecret(value: string): string;
backendSDK.security.decryptSecret(encryptedValue: string): string;
```

## Database Schema

The SDK should manage the `system_secrets` table:

```sql
CREATE TABLE IF NOT EXISTS system_secrets (
  id TEXT PRIMARY KEY,
  key_name TEXT UNIQUE NOT NULL,
  encrypted_value TEXT NOT NULL,
  encryption_method TEXT DEFAULT 'aes-256-gcm',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_system_secrets_key_name ON system_secrets(key_name);
```

## Environment Variables

The SDK should respect these environment variables:

- `FILE_ENCRYPTION_KEY`: 64 hex characters (32 bytes) - highest priority
- `FILE_ENCRYPTION_ENABLED`: Enable/disable encryption (default: true)
- `JWT_SECRET`: Used to derive master key for secret encryption

## Testing Requirements

The SDK implementation must include:

1. **Unit Tests**:
   - Encryption/decryption with various key formats
   - Key generation and storage
   - Secret encryption/decryption
   - Error handling (wrong keys, corrupted data)

2. **Integration Tests**:
   - Key auto-generation on first use
   - Key retrieval from database
   - File encryption/decryption end-to-end
   - CLI tools functionality

3. **Compatibility Tests**:
   - Files encrypted with backend implementation can be decrypted with SDK
   - Keys stored by backend can be read by SDK

## Security Considerations

1. **Key Storage**: Keys must always be encrypted before storing in database
2. **Key Access**: Only admins with proper scopes can view keys
3. **Key Rotation**: Future enhancement - would require re-encrypting all files
4. **Master Key**: Derived from `JWT_SECRET` - if compromised, all secrets are compromised

## Backward Compatibility

The SDK implementation must:

1. **Read existing encrypted files**: Files encrypted by backend implementation must be decryptable
2. **Read existing keys**: Keys stored in database by backend must be readable
3. **Support migration**: Provide tools to migrate from backend implementation to SDK

## Example Usage

### In Backend (After Migration)

```typescript
// File encryption
const encrypted = await backendSDK.storage.encryptFile(fileBuffer);
const decrypted = await backendSDK.storage.decryptFile(encrypted);

// Get encryption key
const keyInfo = await backendSDK.system.getEncryptionKey();
console.log(`Key source: ${keyInfo.source}`);
```

### In CLI (After Migration)

```bash
# Encrypt file
krapi-cli encrypt document.pdf document.pdf.encrypted --key $(cat .encryption-key)

# Decrypt file
krapi-cli decrypt document.pdf.encrypted document.pdf --key $(cat .encryption-key)
```

## Files to Reference

For implementation details, refer to:

1. **Encryption Logic**: `backend-server/src/services/file-encryption.service.ts`
2. **Secret Encryption**: `backend-server/src/services/secret-encryption.service.ts`
3. **Key Management**: `backend-server/src/routes/handlers/system/encryption-key.handler.ts`
4. **CLI Implementation**: `backend-server/scripts/encrypt-file.ts`, `backend-server/scripts/decrypt-file.ts`
5. **Database Schema**: `backend-server/src/services/database/schema/database-schema.service.ts` (system_secrets table)

## Questions or Issues

If you encounter any issues during implementation:

1. Check the backend implementation for reference
2. Ensure compatibility with existing encrypted files
3. Test with the comprehensive test suite: `KRAPI-COMPREHENSIVE-TEST-SUITE/tests/storage-encryption.tests.js`
4. Verify CLI tools work with the same encryption functions

## Completion Checklist

- [ ] File encryption module implemented in SDK
- [ ] Secret encryption module implemented in SDK
- [ ] Encryption key management in SDK system module
- [ ] CLI tools implemented in SDK
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Backend migrated to use SDK methods
- [ ] Temporary backend implementations removed
- [ ] Documentation updated
- [ ] Backward compatibility verified

## Notes

- All encryption uses AES-256-GCM for authenticated encryption
- Keys are always stored encrypted in the database
- The master key is derived from `JWT_SECRET` - ensure this is secure
- CLI tools must work standalone (no server required)
- All functionality must work identically in both client and server SDK modes
