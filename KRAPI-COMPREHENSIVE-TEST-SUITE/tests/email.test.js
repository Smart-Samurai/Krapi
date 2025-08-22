/**
 * Email & Communications Tests
 */

import TestFramework from "../utils/test-framework.js";
import CONFIG from "../config.js";
import axios from "axios";

class EmailTests extends TestFramework {
  constructor(sessionToken, testProject) {
    super();
    this.sessionToken = sessionToken;
    this.testProject = testProject;
    this.sentEmails = [];
  }

  async runAll() {
    return this.describe("📧 Email & Communications", async () => {
      // Test 1: Send Basic Email
      await this.test("Send Basic Email", async () => {
        const emailData = {
          to: CONFIG.TEST_EMAIL.to,
          subject: CONFIG.TEST_EMAIL.subject,
          body: CONFIG.TEST_EMAIL.body,
          project_id: this.testProject.id,
        };

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/send`,
          emailData,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.assertHttpSuccess(response, "Email sending should succeed");
        this.assertExists(
          response.data,
          "email_id",
          "Response should contain email ID"
        );
        this.assertExists(
          response.data,
          "status",
          "Response should contain status"
        );

        this.sentEmails.push(response.data.email_id);
      });

      // Test 2: Send HTML Email
      await this.test("Send HTML Email", async () => {
        const htmlEmailData = {
          to: CONFIG.TEST_EMAIL.to,
          subject: "HTML Test Email",
          body: "<h1>Test HTML Email</h1><p>This is a <strong>test</strong> email.</p>",
          html: true,
          project_id: this.testProject.id,
        };

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/send`,
          htmlEmailData,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.assertHttpSuccess(response, "HTML email sending should succeed");
        this.assertExists(
          response.data,
          "email_id",
          "Response should contain email ID"
        );

        this.sentEmails.push(response.data.email_id);
      });

      // Test 3: Send Email with Attachments
      await this.test("Send Email with Attachments", async () => {
        const emailWithAttachments = {
          to: CONFIG.TEST_EMAIL.to,
          subject: "Email with Attachments",
          body: "This email has attachments",
          project_id: this.testProject.id,
          attachments: [
            {
              filename: "test.txt",
              content: "This is a test attachment",
              content_type: "text/plain",
            },
          ],
        };

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/send`,
          emailWithAttachments,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.assertHttpSuccess(
          response,
          "Email with attachments should succeed"
        );
        this.assertExists(
          response.data,
          "email_id",
          "Response should contain email ID"
        );

        this.sentEmails.push(response.data.email_id);
      });

      // Test 4: Send Bulk Email
      await this.test("Send Bulk Email", async () => {
        const bulkEmailData = {
          recipients: [
            { email: CONFIG.TEST_EMAIL.to, name: "Test User" },
            { email: "test2@example.com", name: "Test User 2" },
          ],
          subject: "Bulk Test Email",
          body: "This is a bulk test email",
          project_id: this.testProject.id,
        };

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/bulk-send`,
          bulkEmailData,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.assertHttpSuccess(response, "Bulk email sending should succeed");
        this.assertExists(
          response.data,
          "batch_id",
          "Response should contain batch ID"
        );
        this.assertExists(
          response.data,
          "sent_count",
          "Response should contain sent count"
        );

        if (response.data.email_ids) {
          response.data.email_ids.forEach((id) => this.sentEmails.push(id));
        }
      });

      // Test 5: Get Email Status
      await this.test("Get Email Status", async () => {
        if (this.sentEmails.length === 0) {
          throw new Error("No emails available for status check");
        }

        const emailId = this.sentEmails[0];
        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/status/${emailId}`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
          }
        );

        this.assertHttpSuccess(
          response,
          "Email status retrieval should succeed"
        );
        this.assertExists(
          response.data,
          "email_id",
          "Response should contain email ID"
        );
        this.assertExists(
          response.data,
          "status",
          "Response should contain status"
        );
      });

      // Test 6: List Sent Emails
      await this.test("List Sent Emails", async () => {
        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/sent`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
            params: {
              project_id: this.testProject.id,
              limit: 10,
            },
          }
        );

        this.assertHttpSuccess(response, "Sent emails listing should succeed");
        this.assertExists(
          response.data,
          "emails",
          "Response should contain emails array"
        );
      });

      // Test 7: Email Templates
      await this.test("Create Email Template", async () => {
        const templateData = {
          name: "Test Template",
          subject: "Welcome {{name}}!",
          body: "Hello {{name}}, welcome to our platform!",
          project_id: this.testProject.id,
          variables: ["name"],
        };

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/templates`,
          templateData,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.assertHttpSuccess(response, "Template creation should succeed");
        this.assertExists(
          response.data,
          "template_id",
          "Response should contain template ID"
        );
        this.assertEqual(
          response.data.name,
          templateData.name,
          "Template name should match"
        );
      });

      // Test 8: Send Email from Template
      await this.test("Send Email from Template", async () => {
        // First get available templates
        const templatesResponse = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/templates`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
            params: { project_id: this.testProject.id },
          }
        );

        if (
          templatesResponse.data.templates &&
          templatesResponse.data.templates.length > 0
        ) {
          const template = templatesResponse.data.templates[0];

          const emailData = {
            template_id: template.template_id,
            to: CONFIG.TEST_EMAIL.to,
            variables: { name: "Test User" },
            project_id: this.testProject.id,
          };

          const response = await axios.post(
            `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/send-template`,
            emailData,
            {
              headers: {
                Authorization: `Bearer ${this.sessionToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          this.assertHttpSuccess(
            response,
            "Template email sending should succeed"
          );
          this.assertExists(
            response.data,
            "email_id",
            "Response should contain email ID"
          );

          this.sentEmails.push(response.data.email_id);
        } else {
          console.log(
            "      ℹ️  No templates available for template email test"
          );
        }
      });

      // Test 9: Email Analytics
      await this.test("Get Email Analytics", async () => {
        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/analytics`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
            params: {
              project_id: this.testProject.id,
              period: "7d",
            },
          }
        );

        this.assertHttpSuccess(
          response,
          "Email analytics retrieval should succeed"
        );
        this.assertExists(
          response.data,
          "total_sent",
          "Response should contain total sent count"
        );
        this.assertExists(
          response.data,
          "delivery_rate",
          "Response should contain delivery rate"
        );
      });

      // Test 10: Email Validation
      await this.test("Validate Email Address", async () => {
        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/validate`,
          {
            email: CONFIG.TEST_EMAIL.to,
          },
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.assertHttpSuccess(response, "Email validation should succeed");
        this.assertExists(
          response.data,
          "valid",
          "Response should contain validation result"
        );
        this.assertExists(
          response.data,
          "email",
          "Response should contain email address"
        );
      });

      // Test 11: Email Bounce Handling
      await this.test("Get Email Bounces", async () => {
        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/bounces`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
            params: {
              project_id: this.testProject.id,
              limit: 10,
            },
          }
        );

        this.assertHttpSuccess(
          response,
          "Email bounces retrieval should succeed"
        );
        this.assertExists(
          response.data,
          "bounces",
          "Response should contain bounces array"
        );
      });

      // Test 12: Email Unsubscribe
      await this.test("Handle Email Unsubscribe", async () => {
        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/email/unsubscribe`,
          {
            email: CONFIG.TEST_EMAIL.to,
            project_id: this.testProject.id,
          },
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.assertHttpSuccess(response, "Email unsubscribe should succeed");
        this.assertExists(
          response.data,
          "success",
          "Response should indicate success"
        );
      });
    });
  }

  getSentEmails() {
    return this.sentEmails;
  }
}

export default EmailTests;
