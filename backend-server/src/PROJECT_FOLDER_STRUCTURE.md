/**
 * PROJECT FOLDER STRUCTURE - PER-PROJECT ORGANIZATION
 * 
 * Each project now has its own dedicated folder containing:
 * - Database file (database.db)
 * - Files subfolder (files/)
 * 
 * STRUCTURE:
 * 
 * data/
 *   krapi_main.db                    # Main KRAPI app database
 *   projects/                       # All project-specific data
 *     {projectId1}/                 # Project 1 folder
 *       database.db                 # Project 1 database
 *       files/                      # Project 1 uploaded files
 *         file1.jpg
 *         file2.pdf
 *         ...
 *     {projectId2}/                 # Project 2 folder
 *       database.db                 # Project 2 database
 *       files/                      # Project 2 uploaded files
 *         ...
 * 
 * BENEFITS:
 * - Complete isolation: Each project's data is self-contained
 * - Easy backup: Just copy the project folder
 * - Easy deletion: Delete the entire folder
 * - Better organization: Clear separation between projects
 * - No cross-contamination: Files and databases are segregated
 * 
 * IMPLEMENTATION:
 * - Database: MultiDatabaseManager creates project folders automatically
 * - Files: StorageController stores files in project-specific folders
 * - Deletion: deleteProject() removes entire project folder
 */

