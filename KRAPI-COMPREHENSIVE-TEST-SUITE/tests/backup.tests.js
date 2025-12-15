/**
 * Backup Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runBackupTests(testSuite) {
    testSuite.logger.suiteStart("Backup Tests");

    let backupId = null;
    // CRITICAL: Use consistent test password for all backup operations
    // This ensures the Restic repository is initialized with the same password
    // The backend route will use this same password as default if none is provided
    const backupPassword = "test-backup-password-123";

    await testSuite.test("Create project backup via SDK", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for backup test");
      }

      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.backup?.createProject !== "function") {
        throw new Error("krapi.backup.createProject method not available - SDK must implement this method");
      }

      // Use consistent test password - this will initialize the repository if needed
      const backup = await testSuite.krapi.backup.createProject(
        testSuite.testProject.id,
        {
          description: "Test backup",
          password: backupPassword,
        }
      );

      // SDK returns BackupMetadata directly - validate response has real data
      testSuite.assertResponse(backup, ['id', 'snapshot_id', 'type', 'created_at', 'size', 'unique_size', 'file_count'], "Backup should return expected metadata including Restic fields");
      testSuite.assertHasData(backup, "Backup response should have real data");
      testSuite.assert(typeof backup.id === 'string' && backup.id.length > 0, "Backup ID should be a non-empty string");
      testSuite.assert(typeof backup.snapshot_id === 'string' && backup.snapshot_id.length > 0, "Snapshot ID should be a non-empty string");
      testSuite.assert(typeof backup.unique_size === 'number' && backup.unique_size >= 0, "Unique size should be a non-negative number");
      testSuite.assert(typeof backup.file_count === 'number' && backup.file_count >= 0, "File count should be a non-negative number");

      backupId = backup.id;
    });

    await testSuite.test("List project backups via SDK", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for backup test");
      }

      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.backup?.list !== "function") {
        throw new Error("krapi.backup.list method not available - SDK must implement this method");
      }

      const backups = await testSuite.krapi.backup.list(
        testSuite.testProject.id,
        "project"
      );

      // SDK returns BackupMetadata[] directly
      testSuite.assert(Array.isArray(backups), "Should return backups array");
      testSuite.assertHasData(backups, "Backups array should be returned (may be empty but should be valid)");
    });

    await testSuite.test("List all backups via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.backup?.list !== "function") {
        throw new Error("krapi.backup.list method not available - SDK must implement this method");
      }

      const backups = await testSuite.krapi.backup.list();

      // SDK returns BackupMetadata[] directly
      testSuite.assert(Array.isArray(backups), "Should return backups array");
      testSuite.assertHasData(backups, "Backups array should be returned (may be empty but should be valid)");
    });

    await testSuite.test("Create system backup via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.backup?.createSystem !== "function") {
        throw new Error("krapi.backup.createSystem method not available - endpoint must be implemented");
      }

      // Use same test password for consistency
      const backup = await testSuite.krapi.backup.createSystem({
        description: "Test system backup",
        password: backupPassword,
      });

      // Validate response has real data - this will throw if backup is empty or missing fields
      testSuite.assertResponse(backup, ['id', 'snapshot_id', 'type', 'created_at', 'size', 'unique_size', 'file_count'], "Backup should return expected metadata including Restic fields");
      testSuite.assertHasData(backup, "Backup response should have real data");
      testSuite.assert(typeof backup.id === 'string' && backup.id.length > 0, "Backup ID should be a non-empty string");
      testSuite.assert(typeof backup.snapshot_id === 'string' && backup.snapshot_id.length > 0, "Snapshot ID should be a non-empty string");
      testSuite.assert(typeof backup.unique_size === 'number' && backup.unique_size >= 0, "Unique size should be a non-negative number");
      testSuite.assert(typeof backup.file_count === 'number' && backup.file_count >= 0, "File count should be a non-negative number");
    });

    await testSuite.test("Delete backup via SDK", async () => {
      // Skip if no backup was created (depends on previous test)
      if (!backupId) {
        throw new Error("No backup ID available - create backup test must run first and succeed");
      }

      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.backup?.delete !== "function") {
        throw new Error("krapi.backup.delete method not available - SDK must implement this method");
      }

      // SDK deleteBackup signature: deleteBackup(backupId)
      // The backend route will use the default test password ("test-backup-password-123")
      // since the repository is initialized with this password during backup creation
      // Note: The SDK HTTP client doesn't support passing password, so the backend
      // uses the default test password which matches what was used to create the backup
      const result = await testSuite.krapi.backup.delete(backupId);

      testSuite.assert(result, "Should return delete result");
      testSuite.assertHasData(result, "Delete result should have real data");
      testSuite.assert(result.success === true, "Should succeed");
    });
  }
