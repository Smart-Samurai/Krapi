/**
 * MIGRATION PLAN: Replace project_users table with users collection
 * 
 * ARCHITECTURE:
 * - Main KRAPI App: admin_users (app admins) + project_admins (which admins access which projects)
 * - Projects: users collection (isolated, self-contained users within each project)
 * 
 * CHANGES NEEDED:
 * 
 * 1. DatabaseService.project_user methods:
 *    - createProjectUser: ✅ Updated to use users collection
 *    - getProjectUser: Update to query users collection by document ID
 *    - getProjectUserByEmail: Update to query users collection by email field
 *    - getProjectUserByUsername: Update to query users collection by username field
 *    - getProjectUsers: Update to query all documents from users collection
 *    - updateProjectUser: Update to update document in users collection
 *    - deleteProjectUser: Update to delete document from users collection
 * 
 * 2. Remove project_users table:
 *    - Remove from multi-database-manager.service.ts initialization
 *    - Remove from cleanup methods
 *    - Remove from table lists
 * 
 * 3. Update file_permissions:
 *    - file_permissions.user_id should reference users collection document ID
 *    - Update queries to join with users collection instead of project_users table
 * 
 * 4. Update SDK UsersService:
 *    - Change all queries from project_users table to users collection
 * 
 * 5. Update controllers:
 *    - All user controllers should use users collection methods
 * 
 * IMPLEMENTATION STATUS:
 * - ✅ createProjectUser: Updated to use users collection
 * - ⏳ getProjectUser: Needs update
 * - ⏳ getProjectUserByEmail: Needs update
 * - ⏳ getProjectUserByUsername: Needs update
 * - ⏳ getProjectUsers: Needs update
 * - ⏳ updateProjectUser: Needs update
 * - ⏳ deleteProjectUser: Needs update
 * - ⏳ Remove project_users table creation
 * - ⏳ Update file_permissions references

