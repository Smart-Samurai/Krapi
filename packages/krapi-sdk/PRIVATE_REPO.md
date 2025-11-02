# Publishing from Private GitHub Repo

## Question: Do I Need a Public Repo?

**Answer: No!** Your GitHub repo can stay **private**. The npm package works independently.

## How It Works

### What Gets Published to npm

When you publish to npm, **only these files** are uploaded:
- ? `dist/` folder (compiled JavaScript)
- ? `README.md` (documentation)
- ? `package.json` (metadata)

### What Doesn't Get Published

- ? Source code (`src/` folder)
- ? GitHub repo access
- ? Development files

### The Repository Field

The `repository` field in `package.json` is **just metadata**. It tells users where to find the source code, but:

- ? **It's optional** - You can omit it or leave it as-is
- ? **npm package works without it** - Package functionality doesn't depend on it
- ? **Users install from npm** - They don't need GitHub access

## Options for Private Repos

### Option 1: Keep Repository Field (Recommended)

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/krapi.git",
    "directory": "packages/krapi-sdk"
  }
}
```

**What happens**:
- Package publishes successfully ?
- Users can install from npm ?
- Repository link on npm shows, but gives 404 for non-authorized users (that's okay!)
- You can still share the link with authorized collaborators

### Option 2: Remove Repository Field

```json
{
  // No repository field
}
```

**What happens**:
- Package publishes successfully ?
- Users can install from npm ?
- No repository link shown on npm (cleaner if you want to keep it private)

### Option 3: Use Generic URL (Optional)

If you have a public-facing website or docs:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/krapi.git"
  },
  "homepage": "https://krapi.io/docs"  // Public docs URL
}
```

## How Users Install

Users install from **npm**, not GitHub:

```bash
npm install @krapi/sdk
```

This works **regardless** of your GitHub repo visibility because:
1. They're downloading from npm registry
2. They get the compiled code from `dist/`
3. They don't need GitHub access

## Example: Private Repo + Public npm Package

Many companies do this:

- **GitHub repo**: Private (internal code)
- **npm package**: Public (for external developers)

Examples:
- Many enterprise SDKs
- Internal tools that become public packages
- Companies with private source but public SDK

## Summary

? **Your repo can stay private**
? **npm package will work fine**
? **Users install from npm (not GitHub)**
? **Repository field is optional metadata**

The npm package is **completely independent** of your GitHub repo visibility. Publishing to npm only uploads the built files (`dist/` folder), not your source code or GitHub repo access.

---

**Bottom line**: Keep your repo private if you want! The npm package will work perfectly for external developers. They install from npm, not GitHub.
