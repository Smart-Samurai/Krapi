# Publishing @krapi/sdk to NPM

This guide explains how to publish the KRAPI SDK to npm so external developers can install and use it.

## Prerequisites

1. **npm account**: You need an npm account (create one at https://www.npmjs.com/signup)
2. **npm organization** (for scoped packages): Since this package is `@krapi/sdk`, you need to either:
   - Create an npm organization named `krapi` at https://www.npmjs.com/org/create
   - OR change the package name to `krapi-sdk` (unscoped) in `package.json`
3. **Login to npm**: Run `npm login` in your terminal

## Before Publishing

### Step 1: Update package.json

Update `packages/krapi-sdk/package.json` with real information:

- Update the `repository.url` with your actual GitHub repository URL
- Update the `homepage` URL
- Update the `author` field with your name and email
- Ensure the `version` is correct (following semantic versioning)

### Step 2: Security Check

**?? IMPORTANT**: Always check for security vulnerabilities before publishing!

```bash
cd packages/krapi-sdk
npm run security-check
```

This will:
- Run `npm audit` to check for vulnerabilities (must show 0)
- Check for outdated dependencies

**If vulnerabilities found**:
```bash
npm audit fix
npm install
npm run security-check  # Verify fixed
```

### Step 3: Build the Package

```bash
npm run build
```

This will:
- Compile TypeScript to JavaScript
- Generate type definitions
- Create ESM and CJS builds

### Step 4: Verify the Package Contents

```bash
npm pack --dry-run
```

This will show what files will be included in the published package. Should include:
- ? `dist/` folder (all built files)
- ? `README.md`
- ? `package.json`
- ? Type definitions (`.d.ts` files)
- ? `src/` (should NOT be included)
- ? `node_modules/` (should NOT be included)
- ? Development files (should NOT be included)

## Publishing to NPM

### First Time Publishing

1. **Create npm organization** (if using scoped package):
   - Go to https://www.npmjs.com/org/create
   - Create organization named `krapi`
   - Add team members who can publish

2. **Login to npm**:
   ```bash
   npm login
   ```
   
   Enter:
   - Username: Your npm username
   - Password: Your npm password (hidden)
   - Email: Your verified email

3. **Final Security Check**:
   ```bash
   npm run security-check
   ```
   
   **Must show**: `found 0 vulnerabilities` ?

4. **Publish the package**:
   ```bash
   npm publish
   ```
   
   Or for scoped packages (to ensure public access):
   ```bash
   npm publish --access public
   ```
   
   This will:
   - Run `prepublishOnly` script (security check + build + type check)
   - Create tarball (.tgz file)
   - Upload to npm registry
   - Package will be available at https://www.npmjs.com/package/@krapi/sdk

### Publishing Updates

For updates after the first publish:

1. **Update version** in `package.json`:
   - Patch: `npm version patch` (e.g., 2.0.0 ? 2.0.1)
   - Minor: `npm version minor` (e.g., 2.0.0 ? 2.1.0)
   - Major: `npm version major` (e.g., 2.0.0 ? 3.0.0)

2. **Publish**:
   ```bash
   npm publish
   ```

## Alternative: Unscoped Package Name

If you don't want to create an npm organization, you can change the package name:

1. Edit `package.json`:
   ```json
   {
     "name": "krapi-sdk",
     ...
   }
   ```

2. Remove or update the `publishConfig.access` field:
   ```json
   {
     "publishConfig": {
       "registry": "https://registry.npmjs.org/"
     }
   }
   ```

3. Then publish normally:
   ```bash
   npm publish
   ```

## Verification

After publishing, verify the package:

1. **Check npm registry**:
   - Visit https://www.npmjs.com/package/@krapi/sdk (or `/package/krapi-sdk` if unscoped)

2. **Test installation**:
   ```bash
   # In a new project
   npm install @krapi/sdk
   # or
   npm install krapi-sdk  # if unscoped
   ```

3. **Test import**:
   ```typescript
   import { KrapiClient } from '@krapi/sdk/client';
   // Should work!
   ```

## Package Contents

The published package includes:
- ? `dist/` - All compiled JavaScript and TypeScript definitions
- ? `README.md` - Documentation for npm users
- ? `package.json` - Package metadata
- ? `src/` - Source files (excluded via .npmignore)
- ? `node_modules/` - Dependencies (users install separately)
- ? Development files (tsconfig, eslint, etc.)

## Troubleshooting

### "You do not have permission to publish"
- Make sure you're logged in: `npm whoami`
- For scoped packages, you need to be a member of the `@krapi` organization
- Try `npm publish --access public` for scoped packages

### "Package name already exists"
- The package name is taken
- Either use a different name or contact the current maintainer
- For scoped packages, make sure you own the organization

### Build fails during publish
- Make sure all dependencies are installed: `npm install`
- Check that TypeScript compiles: `npm run type-check`
- Verify build works: `npm run build`
- Check for security vulnerabilities: `npm run security-check`

### Security vulnerabilities found
- Run: `npm audit fix`
- Install: `npm install`
- Verify: `npm run security-check`
- Update dependencies manually if needed

## CI/CD Publishing

You can automate publishing using GitHub Actions or similar:

```yaml
# .github/workflows/publish-sdk.yml
name: Publish SDK to NPM
on:
  release:
    types: [created]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: cd packages/krapi-sdk && npm install
      - run: cd packages/krapi-sdk && npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## Important Notes

- **Version numbers**: Use semantic versioning (major.minor.patch)
- **Breaking changes**: Increment major version
- **New features**: Increment minor version
- **Bug fixes**: Increment patch version
- **Never unpublish**: If you publish a broken version, publish a patch fix instead
