/**
 * Cleanup script to delete old test databases
 * 
 * This script:
 * 1. Identifies test projects from the main database
 * 2. Deletes old format databases (project_*.db files)
 * 3. Deletes new format project folders ({projectId}/ folders)
 */

import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";

const mainDbPath = path.join(process.cwd(), "data", "krapi_main.db");
const projectsDbDir = path.join(process.cwd(), "data", "projects");

async function cleanupTestDatabases() {
  console.log("🧹 Starting cleanup of old test databases...\n");

  // Connect to main database to get test project IDs
  let testProjectIds: string[] = [];
  
  if (fs.existsSync(mainDbPath)) {
    try {
      const mainDb = new Database(mainDbPath);
      
      // Get all test projects (by name or settings flag)
      const projects = mainDb
        .prepare("SELECT id, name, settings FROM projects")
        .all() as Array<{ id: string; name: string; settings: string | null }>;

      testProjectIds = projects
        .filter((p) => {
          const name = p.name.toLowerCase();
          let settingsIsTest = false;
          
          if (p.settings) {
            try {
              const settings = JSON.parse(p.settings);
              settingsIsTest = settings.isTestProject === true;
            } catch {
              // Ignore parse errors
            }
          }
          
          return settingsIsTest || name.includes("test");
        })
        .map((p) => p.id);

      mainDb.close();
      
      console.log(`📋 Found ${testProjectIds.length} test project(s):`);
      testProjectIds.forEach((id) => console.log(`   - ${id}`));
      console.log("");
    } catch (error) {
      console.error("⚠️ Error reading main database:", error);
    }
  } else {
    console.log("⚠️ Main database not found, will only clean up old format files");
  }

  // Delete old format databases (project_*.db files)
  if (fs.existsSync(projectsDbDir)) {
    const files = fs.readdirSync(projectsDbDir);
    const oldFormatFiles = files.filter(
      (file) => file.startsWith("project_") && (file.endsWith(".db") || file.endsWith(".db-wal") || file.endsWith(".db-shm"))
    );

    console.log(`🗑️  Deleting ${oldFormatFiles.length} old format database file(s) and auxiliary files...`);
    
    for (const file of oldFormatFiles) {
      const filePath = path.join(projectsDbDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`   ✅ Deleted: ${file}`);
      } catch (error) {
        console.error(`   ❌ Failed to delete ${file}:`, error);
      }
    }
    console.log("");
  }

  // Delete new format project folders for test projects
  if (fs.existsSync(projectsDbDir) && testProjectIds.length > 0) {
    console.log(`🗑️  Deleting ${testProjectIds.length} test project folder(s)...`);
    
    for (const projectId of testProjectIds) {
      const projectFolder = path.join(projectsDbDir, projectId);
      
      if (fs.existsSync(projectFolder)) {
        try {
          // Delete entire project folder recursively
          fs.rmSync(projectFolder, { recursive: true, force: true });
          console.log(`   ✅ Deleted folder: ${projectId}/`);
        } catch (error) {
          console.error(`   ❌ Failed to delete folder ${projectId}:`, error);
        }
      } else {
        console.log(`   ℹ️  Folder not found (already deleted?): ${projectId}/`);
      }
    }
    console.log("");
  }

  // Delete test project records from main database
  if (fs.existsSync(mainDbPath) && testProjectIds.length > 0) {
    try {
      const mainDb = new Database(mainDbPath);
      const deleteStmt = mainDb.prepare("DELETE FROM projects WHERE id = ?");
      
      console.log(`🗑️  Deleting ${testProjectIds.length} test project record(s) from main database...`);
      
      for (const projectId of testProjectIds) {
        try {
          deleteStmt.run(projectId);
          console.log(`   ✅ Deleted project record: ${projectId}`);
        } catch (error) {
          console.error(`   ❌ Failed to delete project record ${projectId}:`, error);
        }
      }
      
      mainDb.close();
      console.log("");
    } catch (error) {
      console.error("⚠️ Error deleting project records from main database:", error);
    }
  }

  // Also delete any orphaned folders (folders without corresponding project in main DB)
  if (fs.existsSync(projectsDbDir)) {
    const folders = fs.readdirSync(projectsDbDir).filter((item) => {
      const itemPath = path.join(projectsDbDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    // If we have test project IDs, check for orphaned folders
    // Otherwise, skip this check to avoid deleting non-test projects
    if (testProjectIds.length > 0) {
      const orphanedFolders = folders.filter(
        (folder) => !testProjectIds.includes(folder)
      );

      if (orphanedFolders.length > 0) {
        console.log(`⚠️  Found ${orphanedFolders.length} project folder(s) not in main DB:`);
        orphanedFolders.forEach((folder) => console.log(`   - ${folder}/`));
        console.log("   (Not deleting - these may be active projects)\n");
      }
    }
  }

  console.log("✅ Cleanup complete!");
}

// Run cleanup
cleanupTestDatabases().catch((error) => {
  console.error("❌ Cleanup failed:", error);
  process.exit(1);
});

