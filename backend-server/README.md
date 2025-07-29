# KRAPI Backend Server

## Server Configuration

**Default Port:** 3470

## Default Admin Credentials

- **Username:** admin
- **Email:** admin@krapi.com
- **Password:** admin123

## API Routes

All API endpoints are prefixed with `/krapi/k1/`

### Authentication
- `POST /krapi/k1/auth/admin/login` - Admin login
- `POST /krapi/k1/auth/logout` - Logout
- `GET /krapi/k1/auth/me` - Get current user

### Admin Management
- `GET /krapi/k1/admin/users` - List admin users
- `POST /krapi/k1/admin/users` - Create admin user
- `PUT /krapi/k1/admin/users/:id` - Update admin user
- `DELETE /krapi/k1/admin/users/:id` - Delete admin user

### Projects
- `GET /krapi/k1/projects` - List projects
- `POST /krapi/k1/projects` - Create project
- `PUT /krapi/k1/projects/:id` - Update project
- `DELETE /krapi/k1/projects/:id` - Delete project

### Database Operations
- `GET /krapi/k1/database/:projectId/schemas` - List table schemas
- `POST /krapi/k1/database/:projectId/schemas` - Create table schema
- `GET /krapi/k1/database/:projectId/:tableName/documents` - List documents
- `POST /krapi/k1/database/:projectId/:tableName/documents` - Create document
- `PUT /krapi/k1/database/:projectId/:tableName/documents/:documentId` - Update document
- `DELETE /krapi/k1/database/:projectId/:tableName/documents/:documentId` - Delete document

### File Storage
- `GET /krapi/k1/storage/:projectId/files` - List files
- `POST /krapi/k1/storage/:projectId/files` - Upload file
- `GET /krapi/k1/storage/:projectId/files/:fileId/download` - Download file
- `DELETE /krapi/k1/storage/:projectId/files/:fileId` - Delete file

### Health Check
- `GET /krapi/k1/health` - Server health status