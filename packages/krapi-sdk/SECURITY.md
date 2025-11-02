# Security Guide for @krapi/sdk

This document outlines security best practices, vulnerabilities to avoid, and security measures in the KRAPI SDK.

## Security Status

? **Current Security Status**: All dependencies are up-to-date with no known vulnerabilities.

Last audit: `npm audit` shows `0 vulnerabilities`

## Security Best Practices Implemented

### 1. Dependency Security

- **Regular Updates**: All dependencies are kept up-to-date
- **Security Audits**: `npm audit` runs before publishing
- **Minimum Versions**: Dependencies use `^` (caret) to allow patch updates but require manual review for breaking changes

### 2. No Hardcoded Secrets

? **No API keys, passwords, or tokens are hardcoded**
- All secrets are passed as configuration parameters
- SDK accepts credentials from users, never stores them
- No environment variable access for secrets in client mode

### 3. Input Validation

? **User input is validated**
- All API requests validate endpoint URLs
- API keys and tokens are validated for format
- No direct SQL injection risks (uses parameterized queries in server mode)

### 4. No Code Execution

? **No eval() or dynamic code execution**
- No use of `eval()`, `Function()`, or `setTimeout` with code strings
- No execution of user-provided code
- All functionality is statically defined

### 5. Secure HTTP Communication

? **Axios configuration is secure**
- Timeout limits prevent hanging requests
- Headers are properly sanitized
- No automatic credential transmission beyond what's explicitly configured

## Security Audit Checklist

Before publishing, verify:

- [ ] `npm audit` shows `0 vulnerabilities`
- [ ] All dependencies are up-to-date (`npm outdated` checked)
- [ ] No hardcoded secrets in code
- [ ] No eval() or dynamic code execution
- [ ] Input validation in place
- [ ] Error messages don't leak sensitive information
- [ ] README includes security best practices for users

## Security Considerations for Users

### API Key Management

**?? IMPORTANT**: Never commit API keys to version control!

**? DO**:
- Use environment variables
- Store keys in secure vaults (AWS Secrets Manager, HashiCorp Vault, etc.)
- Use separate keys for development/production
- Rotate keys regularly

**? DON'T**:
- Hardcode keys in source code
- Commit keys to git
- Share keys in chat/Slack
- Use same keys for multiple projects

### Endpoint Security

**? DO**:
- Use HTTPS for production endpoints
- Validate SSL certificates (default in axios)
- Use secure, authenticated endpoints

**? DON'T**:
- Use HTTP for production
- Disable SSL verification
- Connect to untrusted endpoints

### Session Token Management

**? DO**:
- Store tokens securely (HttpOnly cookies, secure storage)
- Implement token rotation
- Set appropriate expiration times
- Clear tokens on logout

**? DON'T**:
- Store tokens in localStorage without encryption
- Use permanent tokens without expiration
- Transmit tokens over insecure channels

## Dependency Security

### Current Dependencies

1. **axios** (^1.13.1)
   - ? Up-to-date (fixes DoS vulnerability)
   - Used for HTTP requests only
   - No known security issues

2. **bcryptjs** (^3.0.2)
   - ? Used for password hashing (server mode only)
   - No client-side exposure
   - No known security issues

3. **nodemailer** (^7.0.10)
   - ? Up-to-date (fixes email domain confusion vulnerability)
   - Used for email sending (server mode only)
   - Properly configured for secure email

### Regular Security Maintenance

**Before each publish**:
```bash
npm audit
npm outdated
```

**If vulnerabilities found**:
```bash
npm audit fix
npm install
npm audit  # Verify fixed
```

## Code Security Review

### No Sensitive Data Logging

? SDK does not log:
- API keys
- Passwords
- Session tokens
- User credentials
- Sensitive request data

### Error Handling

? Error messages:
- Do not expose internal system details
- Do not leak sensitive information
- Are user-friendly and actionable

### Type Safety

? TypeScript ensures:
- Type checking prevents many errors
- No `any` types for user input
- Proper type definitions for all APIs

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **DO** email: security@krapi.com (or your security email)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will:
- Respond within 48 hours
- Investigate and verify
- Fix and release patch version
- Credit you in security advisory (if desired)

## Security Features

### 1. Request Timeout

All HTTP requests have a timeout (default: 30 seconds) to prevent hanging requests.

### 2. Input Sanitization

- Endpoint URLs are validated
- API keys are validated for format
- Project IDs are validated

### 3. No Automatic Credential Transmission

SDK only sends credentials explicitly provided by the user. No automatic credential discovery or transmission.

### 4. Secure Defaults

- HTTPS recommended for all connections
- Secure headers by default
- No insecure configurations

## User Security Recommendations

### For Development

```typescript
// ? Use environment variables
import { KrapiClient } from '@krapi/sdk/client';

const krapi = new KrapiClient({
  endpoint: process.env.KRAPI_ENDPOINT,
  apiKey: process.env.KRAPI_API_KEY  // From .env, not hardcoded
});
```

### For Production

```typescript
// ? Use secure credential management
import { KrapiClient } from '@krapi/sdk/client';
import { getSecret } from './secure-vault';  // AWS Secrets Manager, etc.

const krapi = new KrapiClient({
  endpoint: process.env.KRAPI_ENDPOINT,
  apiKey: await getSecret('krapi-api-key')  // From secure vault
});
```

## Version History

- **v2.0.0**: Initial secure release
  - Fixed axios DoS vulnerability (updated to 1.13.1)
  - Fixed nodemailer email domain confusion (updated to 7.0.10)
  - No known vulnerabilities

## Compliance

The SDK is designed to:
- Follow OWASP security guidelines
- Use industry-standard encryption
- Comply with data protection regulations
- Support secure credential management

---

**Remember**: Security is a shared responsibility. Keep dependencies updated and follow best practices!
