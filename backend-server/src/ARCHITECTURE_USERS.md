/**
 * PERMISSION SYSTEM ARCHITECTURE - CORRECT SEPARATION
 * 
 * There are TWO completely separate user systems:
 * 
 * 1. MAIN KRAPI APP (Main Database)
 *    - admin_users: Admin users who manage the KRAPI app itself
 *    - project_admins: Tracks which admin users can access which projects
 *    - These are GLOBAL and have access to multiple projects
 * 
 * 2. PROJECTS (Project-Specific Databases)
 *    - users collection: Self-contained users within each project
 *    - Projects are ISOLATED - they cannot see admin users or other projects
 *    - Each project has its own user base in the "users" collection
 * 
 * IMPORTANT:
 * - project_users table is DEPRECATED - should use "users" collection instead
 * - project_admins is ONLY for admin users accessing projects (not project users)
 * - Project users exist ONLY within their project and cannot see above themselves
 */

