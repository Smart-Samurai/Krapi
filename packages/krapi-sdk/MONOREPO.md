# SDK in Monorepo - FAQ

## Do I Need a Separate GitHub Repo for the SDK?

**No!** The SDK can stay in your main KRAPI monorepo.

## How It Works

The SDK is configured to work from a monorepo using the `directory` field in `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/krapi.git",
    "directory": "packages/krapi-sdk"  // ? This tells npm it's in a subdirectory
  }
}
```

## Repository Structure

```
your-krapi-repo/
??? packages/
?   ??? krapi-sdk/          ? SDK is here
?       ??? package.json    ? Points to parent repo
?       ??? src/
?       ??? dist/
??? backend-server/
??? frontend-manager/
??? package.json
```

## Publishing from Monorepo

When you publish to npm:

1. **npm reads the `repository` field**: Points to your main GitHub repo
2. **npm reads the `directory` field**: Knows the SDK is in `packages/krapi-sdk`
3. **npm publishes**: Only the SDK package (not the whole monorepo)

## Benefits of Monorepo Approach

? **Single source of truth**: All code in one place
? **Easier development**: Changes to backend/SDK sync automatically
? **Version management**: SDK version can match main repo version
? **No separate repo needed**: Simpler to maintain

## Examples of Monorepos with Published Packages

Many popular projects publish packages from monorepos:

- **Babel**: `@babel/core`, `@babel/preset-env` all from one repo
- **React**: `react`, `react-dom` from one repo
- **TypeScript**: Multiple packages from one repo
- **Next.js**: Multiple packages from one repo

## When Would You Need a Separate Repo?

You might want a separate repo if:

- You want independent versioning (SDK version ? main repo version)
- Different teams maintain SDK vs main repo
- You want to open source SDK but keep main repo private
- SDK has completely different release cycle

**For most cases, keeping it in the monorepo is recommended!**

## Updating package.json for Your Repo

When you publish, update the `repository.url` in `packages/krapi-sdk/package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR-USERNAME/krapi.git",  // ? Your actual repo URL
    "directory": "packages/krapi-sdk"  // ? Keep this as-is
  }
}
```

That's it! npm will know the SDK is in your main repo.

## Verification

After publishing, you can verify on npm:

1. Go to https://www.npmjs.com/package/@krapi/sdk
2. Click the "repository" link
3. It should link to your main GitHub repo (not a separate SDK repo)

---

**Summary**: Keep the SDK in your monorepo. Update the `repository.url` to point to your actual GitHub repo, and keep the `directory` field pointing to `packages/krapi-sdk`. That's all you need!
