# SDK Methods Audit

## Methods Used in Frontend but Missing/Different in SDK

### 1. Fixed Issues
- ✅ `krapiClient.admin.getProject(projectId)` → Changed to `krapiClient.projects.getById(projectId)`
- ✅ `krapi.database.listCollections({ projectId })` → Changed to `krapi.database.getSchemas(projectId)`

### 2. Remaining Issues

#### Storage Methods
- ❌ `krapi.storage.listFiles({ projectId })` - SDK has `getFiles(projectId)` instead
- ❌ `krapi.storage.getFileUrl(fileId)` - This method doesn't exist in SDK

### 3. Verified Working Methods

#### Auth Methods
- ✅ `krapi.auth.adminLogin(email, password)`
- ✅ `krapi.auth.getCurrentUser()`
- ✅ `krapi.auth.logout()`
- ✅ `krapi.auth.changePassword(currentPassword, newPassword)`

#### Admin Methods
- ✅ `krapi.admin.getUsers(options)`

#### Projects Methods
- ✅ `krapi.projects.getAll()`
- ✅ `krapi.projects.getById(id)`
- ✅ `krapi.projects.create(data)`
- ✅ `krapi.projects.delete(id)`

#### Database Methods
- ✅ `krapi.database.getSchemas(projectId)`
- ✅ `krapi.database.createSchema(projectId, schema)`
- ✅ `krapi.database.deleteSchema(projectId, tableName)`

#### Storage Methods
- ✅ `krapi.storage.getFiles(projectId)`
- ✅ `krapi.storage.uploadFile(projectId, file)`
- ✅ `krapi.storage.deleteFile(projectId, fileId)`
- ✅ `krapi.storage.downloadFile(projectId, fileId)`
- ✅ `krapi.storage.getStats(projectId)`

## Next Steps

1. Fix the `listFiles` usage to use `getFiles` instead
2. Either:
   - Add `getFileUrl` method to SDK, or
   - Construct the file URL in the frontend using the base URL and file ID