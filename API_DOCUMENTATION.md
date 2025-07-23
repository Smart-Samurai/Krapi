# Krapi API Documentation - DEPRECATED

## ⚠️ IMPORTANT: This documentation is DEPRECATED

The old API with multiple endpoints has been replaced with a **Unified API** structure similar to Appwrite.

## 🔄 New API Structure

**Please use the new Unified API documentation instead:**

📖 **[UNIFIED_API_DOCUMENTATION.md](./UNIFIED_API_DOCUMENTATION.md)**

## What Changed?

### ❌ Removed (Old System)

- Multiple separate endpoints (`/admin/users`, `/admin/content`, etc.)
- Complex URL structures
- Inconsistent API patterns
- Old content management system

### ✅ New System (Unified API)

- **Single endpoint**: `http://localhost:3470/krapi/v1/api`
- **Consistent format**: All operations use the same request structure
- **Appwrite-style**: Similar to modern BaaS platforms
- **Clean architecture**: One endpoint for all operations

## Migration Guide

### Old Way (Deprecated)

```bash
# Multiple endpoints
GET /api/admin/users
POST /api/admin/content
GET /api/admin/database/stats
```

### New Way (Unified API)

```bash
# Single endpoint with operation structure
POST /krapi/v1/api
{
  "operation": "admin",
  "resource": "users",
  "action": "list",
  "params": {}
}
```

## Why This Change?

1. **Simpler Frontend**: One endpoint to learn and use
2. **Consistent Format**: All requests follow the same structure
3. **Better Performance**: Fewer route handlers
4. **Modern Architecture**: Similar to Appwrite, Supabase, etc.
5. **Easier Maintenance**: Centralized request handling

---

**For the complete new API documentation, see: [UNIFIED_API_DOCUMENTATION.md](./UNIFIED_API_DOCUMENTATION.md)**
