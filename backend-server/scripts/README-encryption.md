# File Encryption CLI Tools

This directory contains standalone CLI tools for encrypting and decrypting files manually. These tools use the same encryption functions as the KRAPI application, ensuring compatibility.

## Overview

The encryption system uses **AES-256-GCM** (Advanced Encryption Standard with Galois/Counter Mode), which provides:
- Strong encryption (256-bit keys)
- Authentication (prevents tampering)
- Random IV per file (ensures same file encrypted twice produces different output)

## Tools

### `encrypt-file.ts`

Encrypts a file using KRAPI's encryption system.

**Usage:**
```bash
npx ts-node scripts/encrypt-file.ts <input-file> <output-file> [--key <hex-key>]
```

**Examples:**
```bash
# Encrypt with key from environment variable
export FILE_ENCRYPTION_KEY="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
npx ts-node scripts/encrypt-file.ts document.pdf document.pdf.encrypted

# Encrypt with key from command line
npx ts-node scripts/encrypt-file.ts document.pdf document.pdf.encrypted --key a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# Encrypt with interactive prompt
npx ts-node scripts/encrypt-file.ts document.pdf document.pdf.encrypted
# Will prompt for encryption key
```

### `decrypt-file.ts`

Decrypts a file that was encrypted with KRAPI's encryption system.

**Usage:**
```bash
npx ts-node scripts/decrypt-file.ts <encrypted-file> <output-file> [--key <hex-key>]
```

**Examples:**
```bash
# Decrypt with key from environment variable
export FILE_ENCRYPTION_KEY="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
npx ts-node scripts/decrypt-file.ts document.pdf.encrypted document.pdf

# Decrypt with key from command line
npx ts-node scripts/decrypt-file.ts document.pdf.encrypted document.pdf --key a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# Decrypt with interactive prompt
npx ts-node scripts/decrypt-file.ts document.pdf.encrypted document.pdf
# Will prompt for decryption key
```

## Getting the Encryption Key

### From the KRAPI Admin Panel

1. Log in as an admin user
2. Navigate to System Settings
3. Go to the Security section
4. View the File Encryption Key (requires `admin:read` or `MASTER` scope)

### From the API

```bash
# Get encryption key via API (requires admin authentication)
curl -X GET "http://localhost:3470/krapi/k1/system/encryption-key" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "key": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    "configured": true,
    "source": "database",
    "enabled": true
  }
}
```

### From the Database (If Server is Down)

If the server is down and you need to retrieve the key from the database:

1. **Locate the database file:**
   - Default location: `data/krapi_main.db`
   - Or check `DB_PATH` environment variable

2. **Query the system_secrets table:**
   ```bash
   sqlite3 data/krapi_main.db "SELECT encrypted_value FROM system_secrets WHERE key_name = 'file_encryption_key';"
   ```

3. **Decrypt the key:**
   The key is encrypted with a master key derived from `JWT_SECRET`. You'll need to:
   - Have access to the `JWT_SECRET` environment variable
   - Use the `SecretEncryptionService` to decrypt it
   - Or use a script that implements the same decryption logic

**Note:** The master key is derived from `JWT_SECRET` using PBKDF2 with:
- Salt: `"krapi-master-key-salt"`
- Iterations: 100,000
- Algorithm: SHA-256
- Key length: 32 bytes

## Key Format

The encryption key must be:
- **64 hexadecimal characters** (0-9, a-f)
- Represents **32 bytes** (256 bits)
- Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

### Generating a New Key

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Security Best Practices

1. **Never commit encryption keys to version control**
   - Store keys in environment variables
   - Use `.env` files (and add them to `.gitignore`)
   - Use secure secret management systems in production

2. **Backup your encryption key securely**
   - Store in a password manager
   - Use secure backup systems
   - Document key location for disaster recovery

3. **Rotate keys periodically**
   - Generate new keys regularly
   - Re-encrypt all files with new key
   - Securely delete old keys

4. **Protect key access**
   - Only admins should have access to keys
   - Use proper authentication and authorization
   - Log all key access attempts

5. **Use strong keys**
   - Always use cryptographically secure random keys
   - Never use predictable or weak keys
   - Generate keys using proper tools (OpenSSL, etc.)

## Troubleshooting

### "Decryption failed" Error

**Possible causes:**
- Wrong decryption key
- File is corrupted
- File was encrypted with a different key
- File is not encrypted (was created before encryption was enabled)

**Solutions:**
- Verify you're using the correct key
- Check file integrity
- Ensure the file was encrypted with KRAPI's encryption system
- Try with `FILE_ENCRYPTION_ENABLED=false` if file is not encrypted

### "Encryption key must be 64 hex characters" Error

**Solution:**
- Ensure the key is exactly 64 hexadecimal characters
- Remove any spaces or special characters
- Generate a new key if needed: `openssl rand -hex 32`

### "File not found" Error

**Solution:**
- Check file path is correct
- Use absolute paths if relative paths don't work
- Ensure you have read/write permissions

## Future SDK Migration

**Note:** These CLI tools are temporary implementations. They should eventually be migrated to the SDK as part of `@smartsamurai/krapi-sdk/cli` tools:

- `krapi-cli encrypt <file> <output> [--key <key>]`
- `krapi-cli decrypt <file> <output> [--key <key>]`

Once migrated, these scripts will be removed and the SDK CLI tools should be used instead.

## Technical Details

### Encryption Algorithm
- **Algorithm:** AES-256-GCM
- **Key Size:** 256 bits (32 bytes)
- **IV Size:** 128 bits (16 bytes)
- **Salt Size:** 256 bits (32 bytes)
- **Auth Tag Size:** 128 bits (16 bytes)

### File Format
Encrypted files have the following structure:
```
[IV (16 bytes)] + [Salt (32 bytes)] + [Auth Tag (16 bytes)] + [Encrypted Data (variable)]
```

### Key Derivation
If a password is provided instead of a hex key, it's derived using:
- **Algorithm:** PBKDF2
- **Hash:** SHA-256
- **Iterations:** 100,000
- **Salt:** `"krapi-file-encryption-salt"`
- **Key Length:** 32 bytes

## Examples

### Encrypt a Document

```bash
# Set key
export FILE_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Encrypt
npx ts-node scripts/encrypt-file.ts important-document.pdf important-document.pdf.encrypted

# Verify encryption
file important-document.pdf.encrypted
# Should show: data (encrypted binary)
```

### Decrypt a Document

```bash
# Set same key
export FILE_ENCRYPTION_KEY="your-key-here"

# Decrypt
npx ts-node scripts/decrypt-file.ts important-document.pdf.encrypted important-document.pdf

# Verify decryption
file important-document.pdf
# Should show: PDF document
```

### Batch Encryption

```bash
# Encrypt all PDFs in a directory
for file in *.pdf; do
  npx ts-node scripts/encrypt-file.ts "$file" "${file}.encrypted" --key "$FILE_ENCRYPTION_KEY"
done
```

### Batch Decryption

```bash
# Decrypt all encrypted files
for file in *.encrypted; do
  output="${file%.encrypted}"
  npx ts-node scripts/decrypt-file.ts "$file" "$output" --key "$FILE_ENCRYPTION_KEY"
done
```
