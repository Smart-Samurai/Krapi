# Step-by-Step Guide: Publishing @krapi/sdk to NPM

This is a comprehensive, beginner-friendly guide to publishing the KRAPI SDK to npm.

## Prerequisites Checklist

Before you start, make sure you have:

- [ ] A computer with Node.js installed (v18 or higher)
- [ ] npm CLI installed (comes with Node.js)
- [ ] A text editor (VS Code, etc.)
- [ ] Internet connection
- [ ] An npm account (if not, create one at https://www.npmjs.com/signup)

## Step 1: Create an npm Account

1. Go to https://www.npmjs.com/signup
2. Fill in your details:
   - Username (this will be your npm username)
   - Email address
   - Password
3. Verify your email address
4. **Important**: Save your username and password securely!

## Step 2: Create npm Organization (For @krapi/sdk)

Since `@krapi/sdk` is a **scoped package** (starts with `@`), you need an npm organization:

1. Go to https://www.npmjs.com/org/create
2. Click "Create Organization"
3. Choose a plan:
   - **Free** (for public packages) - Recommended for now
   - Or paid plans for private packages
4. Enter organization name: `krapi`
   - This MUST match the scope in `@krapi/sdk`
   - Must be lowercase, no spaces
5. Complete the setup

**Alternative**: If you don't want to create an organization, skip to Step 7 to use an unscoped package name.

## Step 3: Verify Your Email Address

1. Check your email inbox for a verification email from npm
2. Click the verification link
3. This ensures your account can publish packages

## Step 4: Login to npm via Terminal

Open your terminal (Command Prompt on Windows, Terminal on Mac/Linux) and run:

```bash
npm login
```

You'll be prompted for:
1. **Username**: Your npm username
2. **Password**: Your npm password (will be hidden)
3. **Email**: Your verified email address

Example output:
```
npm notice Log in on https://registry.npmjs.org/
Username: your-username
Password: ********
Email: (this IS public) your-email@example.com
Logged in as your-username on https://registry.npmjs.org/.
```

**Verify you're logged in**:
```bash
npm whoami
```
Should display your username.

## Step 5: Navigate to SDK Directory

In your terminal, navigate to the SDK package:

```bash
cd /path/to/your/krapi-repo/packages/krapi-sdk
```

Or if you're already in the repo root:
```bash
cd packages/krapi-sdk
```

## Step 6: Update Package.json (Important!)

Before publishing, you **must** update `package.json` with real information:

1. Open `packages/krapi-sdk/package.json` in your editor
2. Update these fields:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR-USERNAME/krapi.git",  // ? Update this!
    "directory": "packages/krapi-sdk"
  },
  "homepage": "https://github.com/YOUR-USERNAME/krapi#readme",  // ? Update this!
  "author": "Your Name <your-email@example.com>"  // ? Update this!
}
```

3. **Save the file**

## Step 7: Build the Package

Before publishing, you need to build the package:

```bash
npm run build
```

This should complete without errors. You should see:
```
? Build success
```

**Verify build succeeded**:
```bash
ls dist/
```
Should show compiled JavaScript files.

## Step 8: Verify Package Contents

Check what will be published (dry run):

```bash
npm pack --dry-run
```

You should see:
- `package.json`
- `README.md`
- `dist/` folder with all compiled files
- **NO** `src/`, `node_modules/`, or development files

## Step 9: Verify Package Name is Available

Check if the package name is taken:

```bash
npm view @krapi/sdk
```

If you see `404 Not Found`, the name is available! ?

If you see package info, the name is taken. You'll need to:
- Use a different organization name
- Or use an unscoped name (see Step 10)

## Step 10 (Optional): Use Unscoped Package Name

If you don't want to use `@krapi/sdk` (scoped), you can use `krapi-sdk`:

1. Edit `package.json`:
   ```json
   {
     "name": "krapi-sdk",  // ? Remove @krapi/ prefix
     ...
     "publishConfig": {
       "registry": "https://registry.npmjs.org/"
     }
   }
   ```
   Remove `"access": "public"` from `publishConfig` (not needed for unscoped).

2. Check if name is available:
   ```bash
   npm view krapi-sdk
   ```

## Step 11: Final Security Check

Run security audit one more time:

```bash
npm audit
```

Should show: `found 0 vulnerabilities` ?

## Step 12: Publish to npm

**This is it!** Run:

```bash
npm publish
```

**For scoped packages** (`@krapi/sdk`), you might need to explicitly publish as public:
```bash
npm publish --access public
```

**What happens**:
1. npm runs `prepublishOnly` script (builds the package)
2. Creates a tarball (.tgz file)
3. Uploads to npm registry
4. Package is live on npm!

**Success output**:
```
npm notice Publishing to https://registry.npmjs.org/ with tag latest and public access
+ @krapi/sdk@2.0.0
```

## Step 13: Verify Package is Published

1. **Check on npm website**:
   - Visit https://www.npmjs.com/package/@krapi/sdk
   - (Or https://www.npmjs.com/package/krapi-sdk if unscoped)
   - You should see your package! ??

2. **Test installation**:
   Create a new test project:
   ```bash
   mkdir test-krapi-install
   cd test-krapi-install
   npm init -y
   npm install @krapi/sdk
   ```
   
   Should install successfully!

3. **Test import**:
   Create `test.js`:
   ```javascript
   const { KrapiClient } = require('@krapi/sdk/client');
   console.log('SDK imported successfully!');
   ```
   
   Run:
   ```bash
   node test.js
   ```
   
   Should print: `SDK imported successfully!`

## Step 14: Update Package Version for Future Releases

When you need to publish updates:

1. **Update version** in `package.json`:
   ```bash
   npm version patch  # 2.0.0 ? 2.0.1 (bug fixes)
   npm version minor  # 2.0.0 ? 2.1.0 (new features)
   npm version major  # 2.0.0 ? 3.0.0 (breaking changes)
   ```
   
   This automatically:
   - Updates version in `package.json`
   - Creates a git commit
   - Creates a git tag

2. **Publish again**:
   ```bash
   npm publish
   ```

## Troubleshooting

### Error: "You do not have permission to publish"
- Make sure you're logged in: `npm whoami`
- For scoped packages, ensure you're a member of the `@krapi` organization
- Try: `npm publish --access public`

### Error: "Package name already exists"
- The package name is taken by someone else
- Either use a different name or contact the maintainer
- Try an unscoped name or different organization

### Error: "You must verify your email address"
- Check your email and click the verification link
- Or resend verification: https://www.npmjs.com/settings/USERNAME/emails

### Error: "Build failed"
- Run `npm install` first
- Check for TypeScript errors: `npm run type-check`
- Review build output for specific errors

### Error: "Organization does not exist"
- Make sure you created the `krapi` organization
- Or use unscoped package name instead

## Common Issues

**Q: Do I need to be a member of @krapi organization?**
A: Yes, for scoped packages. The package owner or organization admin needs to add you.

**Q: Can I publish a test package first?**
A: Yes! Use `npm publish --tag beta` to publish as beta version that won't be the default.

**Q: How do I unpublish a package?**
A: **Don't!** Once published, packages should not be unpublished. Instead, publish a patch fix.

**Q: What if I publish by mistake?**
A: Publish a new version with a fix. npm discourages unpublishing as it breaks other people's builds.

## Next Steps After Publishing

1. **Share the package**:
   - Update your GitHub README with installation instructions
   - Share on social media, developer communities
   - Add to awesome lists if applicable

2. **Set up CI/CD**:
   - Automate publishing with GitHub Actions
   - Auto-publish on version tags

3. **Monitor**:
   - Check npm package stats
   - Monitor for issues on GitHub
   - Respond to user questions

## Summary Checklist

- [ ] Created npm account
- [ ] Created `@krapi` organization (or using unscoped name)
- [ ] Verified email address
- [ ] Logged in via `npm login`
- [ ] Updated `package.json` with real info
- [ ] Built package successfully
- [ ] Verified package contents
- [ ] Checked for security vulnerabilities (0 found)
- [ ] Published to npm
- [ ] Verified package is live on npmjs.com
- [ ] Tested installation in new project

---

**Congratulations!** ?? Your SDK is now published on npm and available for developers worldwide!
