/**
 * Storage Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runStorageTests(testSuite) {
    testSuite.logger.suiteStart("Storage Tests");

    await testSuite.test("Get storage stats via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.storage?.getStatistics !== "function") {
        throw new Error("krapi.storage.getStatistics method not available");
      }

      // This should not throw - if it does, the test will fail
      const stats = await testSuite.krapi.storage.getStatistics(testSuite.testProject.id);

      testSuite.assert(stats, "Should return storage stats");
      testSuite.assert(stats !== null && stats !== undefined, "Stats should not be null or undefined");
    });

    await testSuite.test("List storage files via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.storage?.getFiles !== "function") {
        throw new Error("krapi.storage.getFiles method not available");
      }

      // This should not throw - if it does, the test will fail
      const files = await testSuite.krapi.storage.getFiles(testSuite.testProject.id);

      testSuite.assert(Array.isArray(files), "Should return files array");
      // Ensure we got a valid response (even if empty array)
      testSuite.assert(files !== null && files !== undefined, "Files should not be null or undefined");
    });

    await testSuite.test("Get file URL via SDK", async () => {
      if (typeof testSuite.krapi.storage?.getFileUrl !== "function") {
        throw new Error("krapi.storage.getFileUrl method not available - SDK must implement this method");
      }

      // First, try to get a file if any exist
      let files = await testSuite.krapi.storage.getFiles(testSuite.testProject.id);

      // If no files exist, try to create a test file
      if (!files || files.length === 0) {
        // Check if file creation is available - SDK uses uploadFile method
        if (typeof testSuite.krapi.storage?.uploadFile !== "function") {
          // File creation not available - skip this test with clear message
          throw new Error("No files available and file creation not implemented - cannot test getFileUrl. File creation must be implemented first.");
        }

        // Try to create a test file using SDK uploadFile method
        try {
          const testFileContent = "Test file content for getFileUrl test";
          const testFileName = `test-file-${Date.now()}.txt`;
          
          // Create a File object for uploadFile
          const testFile = new File([testFileContent], testFileName, { type: "text/plain" });
          
          // Use SDK uploadFile method
          const uploadedFile = await testSuite.krapi.storage.uploadFile(
            testSuite.testProject.id,
            testFile
          );
          if (uploadedFile && uploadedFile.id) {
            files = [uploadedFile];
          }
        } catch (createError) {
          // File creation failed - skip test with clear message
          throw new Error(`No files available and file creation failed: ${createError.message}. File creation must be implemented and working for this test to pass.`);
        }
      }

      if (files && files.length > 0 && files[0].id) {
        const result = await testSuite.krapi.storage.getFileUrl(
          testSuite.testProject.id,
          files[0].id,
          {
            expires_in: 3600,
            download: false,
          }
        );
        testSuite.assert(result, "Should return file URL result");
        testSuite.assertHasData(result, "File URL result should have real data");
        testSuite.assert(result.url, "Result should have URL");
        testSuite.assert(typeof result.url === "string", "URL should be a string");
      } else {
        // No files available after attempting creation - this is a test failure
        throw new Error("No files available to test getFileUrl - file creation must be implemented and working");
      }
    });
  }
