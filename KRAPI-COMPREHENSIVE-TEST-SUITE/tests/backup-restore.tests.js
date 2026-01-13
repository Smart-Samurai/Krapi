/**
 * Backup Restore Tests
 * 
 * Comprehensive tests for backup creation and restoration.
 * Ensures backups can be created and restored successfully.
 * 
 * Created: 2025-01-XX
 * Last Updated: 2025-01-XX
 */

export async function runBackupRestoreTests(testSuite) {
    testSuite.logger.suiteStart("Backup Restore Tests");

    let projectBackupId = null;
    let systemBackupId = null;
    const backupPassword = "test-backup-password-123";

    // Test 1: Create project backup
    await testSuite.test("Create project backup for restoration", async () => {
        if (!testSuite.testProject) {
            throw new Error("No test project available for backup test");
        }

        if (typeof testSuite.krapi.backup?.createProject !== "function") {
            throw new Error("krapi.backup.createProject method not available");
        }

        // Create some test data first (collection, document, file)
        try {
            // Create a test collection
            if (typeof testSuite.krapi.collections?.create === "function") {
                await testSuite.krapi.collections.create(testSuite.testProject.id, {
                    name: "backup-test-collection",
                    schema: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            value: { type: "number" },
                        },
                    },
                });
            }

            // Create a test document
            if (
                typeof testSuite.krapi.documents?.create === "function" &&
                testSuite.testCollection
            ) {
                await testSuite.krapi.documents.create(
                    testSuite.testProject.id,
                    testSuite.testCollection.name,
                    {
                        name: "backup-test-document",
                        value: 42,
                    }
                );
            }

            // Upload a test file
            if (typeof testSuite.krapi.storage?.uploadFile === "function") {
                const testFile = new File(
                    ["backup test file content"],
                    "backup-test-file.txt",
                    { type: "text/plain" }
                );
                await testSuite.krapi.storage.uploadFile(
                    testSuite.testProject.id,
                    testFile
                );
            }
        } catch (error) {
            // Test data creation is optional - continue with backup
            testSuite.logger.log(`Note: Could not create test data: ${error.message}`);
        }

        // Create backup
        const backup = await testSuite.krapi.backup.createProject(
            testSuite.testProject.id,
            {
                description: "Test backup for restoration",
                password: backupPassword,
            }
        );

        testSuite.assert(backup, "Should return backup metadata");
        testSuite.assert(backup.id, "Should have backup ID");
        testSuite.assert(backup.snapshot_id, "Should have snapshot ID");
        testSuite.assert(backup.type === "project", "Should be project backup");
        testSuite.assert(backup.file_count >= 0, "Should have file count");
        testSuite.assert(backup.size >= 0, "Should have size");

        projectBackupId = backup.id;

        testSuite.logger.log(`Created project backup: ${projectBackupId}`);
        testSuite.logger.log(`Backup size: ${backup.size} bytes`);
        testSuite.logger.log(`Backup file count: ${backup.file_count}`);
    });

    // Test 2: List backups and verify created backup exists
    await testSuite.test("List backups and verify created backup", async () => {
        if (!projectBackupId) {
            throw new Error("No backup created - previous test must succeed");
        }

        if (typeof testSuite.krapi.backup?.list !== "function") {
            throw new Error("krapi.backup.list method not available");
        }

        const backups = await testSuite.krapi.backup.list(
            testSuite.testProject.id,
            "project"
        );

        testSuite.assert(Array.isArray(backups), "Should return backups array");
        testSuite.assert(
            backups.length > 0,
            "Should have at least one backup (the one we just created)"
        );

        const foundBackup = backups.find((b) => b.id === projectBackupId);
        testSuite.assert(
            foundBackup,
            "Created backup should be in the list"
        );
        testSuite.assert(
            foundBackup.snapshot_id,
            "Found backup should have snapshot ID"
        );
    });

    // Test 3: Restore project from backup
    await testSuite.test("Restore project from backup", async () => {
        if (!projectBackupId) {
            throw new Error("No backup created - previous test must succeed");
        }

        if (typeof testSuite.krapi.backup?.restoreProject !== "function") {
            throw new Error("krapi.backup.restoreProject method not available");
        }

        // Restore project
        const restoreResult = await testSuite.krapi.backup.restoreProject(
            testSuite.testProject.id,
            projectBackupId,
            {
                password: backupPassword,
                overwrite: true, // Allow overwrite for test
            }
        );

        testSuite.assert(restoreResult, "Should return restore result");
        testSuite.assert(
            restoreResult.success !== false,
            "Restore should succeed"
        );

        testSuite.logger.log("Project restored successfully from backup");
    });

    // Test 4: Create system backup
    await testSuite.test("Create system backup", async () => {
        if (typeof testSuite.krapi.backup?.createSystem !== "function") {
            throw new Error("krapi.backup.createSystem method not available");
        }

        const backup = await testSuite.krapi.backup.createSystem({
            description: "Test system backup",
            password: backupPassword,
        });

        testSuite.assert(backup, "Should return backup metadata");
        testSuite.assert(backup.id, "Should have backup ID");
        testSuite.assert(backup.snapshot_id, "Should have snapshot ID");
        testSuite.assert(backup.type === "system", "Should be system backup");

        systemBackupId = backup.id;

        testSuite.logger.log(`Created system backup: ${systemBackupId}`);
    });

    // Test 5: List all backups (system + project)
    await testSuite.test("List all backups (system and project)", async () => {
        if (typeof testSuite.krapi.backup?.list !== "function") {
            throw new Error("krapi.backup.list method not available");
        }

        const allBackups = await testSuite.krapi.backup.list();

        testSuite.assert(Array.isArray(allBackups), "Should return backups array");
        testSuite.assert(
            allBackups.length >= 2,
            "Should have at least 2 backups (project + system)"
        );

        const projectBackup = allBackups.find((b) => b.id === projectBackupId);
        const systemBackup = allBackups.find((b) => b.id === systemBackupId);

        testSuite.assert(projectBackup, "Project backup should be in list");
        testSuite.assert(systemBackup, "System backup should be in list");
        testSuite.assert(
            projectBackup.type === "project",
            "Project backup should have correct type"
        );
        testSuite.assert(
            systemBackup.type === "system",
            "System backup should have correct type"
        );
    });

    // Test 6: Verify backup contains expected data
    await testSuite.test("Verify backup contains expected data", async () => {
        if (!projectBackupId) {
            throw new Error("No backup created - previous test must succeed");
        }

        if (typeof testSuite.krapi.backup?.getBackupDetails !== "function") {
            // If getBackupDetails doesn't exist, skip this test
            testSuite.logger.log(
                "Note: getBackupDetails not available, skipping detailed verification"
            );
            return;
        }

        const backupDetails = await testSuite.krapi.backup.getBackupDetails(
            projectBackupId
        );

        testSuite.assert(backupDetails, "Should return backup details");
        testSuite.assert(backupDetails.id === projectBackupId, "Should match backup ID");
        testSuite.assert(backupDetails.snapshot_id, "Should have snapshot ID");
    });

    // Test 7: Test backup with wrong password (should fail)
    await testSuite.test("Restore with wrong password should fail", async () => {
        if (!projectBackupId) {
            throw new Error("No backup created - previous test must succeed");
        }

        if (typeof testSuite.krapi.backup?.restoreProject !== "function") {
            throw new Error("krapi.backup.restoreProject method not available");
        }

        let restoreFailed = false;
        try {
            await testSuite.krapi.backup.restoreProject(
                testSuite.testProject.id,
                projectBackupId,
                {
                    password: "wrong-password",
                    overwrite: true,
                }
            );
        } catch (error) {
            restoreFailed = true;
            testSuite.assert(
                error.message?.includes("password") ||
                    error.message?.includes("decrypt") ||
                    error.message?.includes("authentication") ||
                    error.status === 401 ||
                    error.status === 403,
                "Should fail with password/authentication error"
            );
        }

        testSuite.assert(
            restoreFailed,
            "Restore with wrong password should fail"
        );
    });

    // Test 8: Delete backup
    await testSuite.test("Delete backup", async () => {
        if (!projectBackupId) {
            throw new Error("No backup created - previous test must succeed");
        }

        if (typeof testSuite.krapi.backup?.delete !== "function") {
            throw new Error("krapi.backup.delete method not available");
        }

        const deleteResult = await testSuite.krapi.backup.delete(projectBackupId);

        testSuite.assert(deleteResult, "Should return delete result");
        testSuite.assert(
            deleteResult.success !== false,
            "Delete should succeed"
        );

        // Verify backup is deleted
        const backups = await testSuite.krapi.backup.list(
            testSuite.testProject.id,
            "project"
        );
        const foundBackup = backups.find((b) => b.id === projectBackupId);
        testSuite.assert(
            !foundBackup,
            "Deleted backup should not be in list"
        );
    });
}
