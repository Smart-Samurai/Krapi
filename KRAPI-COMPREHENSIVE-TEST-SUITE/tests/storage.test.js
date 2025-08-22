/**
 * Storage & File Management Tests
 */

import TestFramework from "../utils/test-framework.js";
import CONFIG from "../config.js";
import axios from "axios";
import FormData from "form-data";

class StorageTests extends TestFramework {
  constructor(sessionToken, testProject) {
    super();
    this.sessionToken = sessionToken;
    this.testProject = testProject;
    this.uploadedFiles = [];
  }

  async runAll() {
    return this.describe("💾 Storage & File Management", async () => {
      // Test 1: File Upload - Basic Text File
      await this.test("Upload Basic Text File", async () => {
        const testContent = "This is a test file for KRAPI storage testing";
        const testFile = Buffer.from(testContent);

        const formData = new FormData();
        formData.append("file", testFile, {
          filename: "test-file.txt",
          contentType: "text/plain",
        });
        formData.append("project_id", this.testProject.id);
        formData.append("folder", "test-files");

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/storage/upload`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${this.sessionToken}`,
            },
          }
        );

        this.assertHttpSuccess(response, "File upload should succeed");
        this.assertExists(
          response.data,
          "file_id",
          "Response should contain file ID"
        );
        this.assertEqual(
          response.data.filename,
          "test-file.txt",
          "Filename should match"
        );

        this.uploadedFiles.push(response.data.file_id);
      });

      // Test 2: File Download
      await this.test("Download File", async () => {
        if (this.uploadedFiles.length === 0) {
          throw new Error("No test files available for download test");
        }

        const fileId = this.uploadedFiles[0];
        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/storage/download/${fileId}`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
            responseType: "arraybuffer",
          }
        );

        this.assertHttpSuccess(response, "File download should succeed");
        this.assertGreaterThan(
          response.data.length,
          0,
          "Downloaded content should not be empty"
        );
      });

      // Test 3: File Metadata
      await this.test("Get File Metadata", async () => {
        if (this.uploadedFiles.length === 0) {
          throw new Error("No uploaded files available for metadata test");
        }

        const fileId = this.uploadedFiles[0];
        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/storage/metadata/${fileId}`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
          }
        );

        this.assertHttpSuccess(
          response,
          "File metadata retrieval should succeed"
        );
        this.assertExists(
          response.data,
          "file_id",
          "Response should contain file ID"
        );
        this.assertExists(
          response.data,
          "filename",
          "Response should contain filename"
        );
      });

      // Test 4: List Files
      await this.test("List Files in Project", async () => {
        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/storage/project/${this.testProject.id}`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
          }
        );

        this.assertHttpSuccess(response, "File listing should succeed");
        this.assertExists(
          response.data,
          "files",
          "Response should contain files array"
        );
      });

      // Test 5: File Deletion
      await this.test("Delete File", async () => {
        if (this.uploadedFiles.length === 0) {
          throw new Error("No uploaded files available for deletion test");
        }

        const fileId = this.uploadedFiles.pop();
        const response = await axios.delete(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/storage/${fileId}`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
          }
        );

        this.assertHttpSuccess(response, "File deletion should succeed");
      });
    });
  }

  getUploadedFiles() {
    return this.uploadedFiles;
  }
}

export default StorageTests;
