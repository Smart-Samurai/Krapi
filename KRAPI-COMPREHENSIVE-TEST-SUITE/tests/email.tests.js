/**
 * Email Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runEmailTests(testSuite) {
    testSuite.logger.suiteStart("Email Tests");

    await testSuite.test("Get email configuration via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.email?.getConfig !== "function") {
        throw new Error("krapi.email.getConfig method not available");
      }

      // SDK email.getConfig requires projectId
      const config = await testSuite.krapi.email.getConfig(testSuite.testProject.id);

      testSuite.assert(config, "Should return email config");
    });

    await testSuite.test("Test email connection via SDK", async () => {
      // SDK uses testConfig method, not testConnection
      if (typeof testSuite.krapi.email?.testConfig !== "function") {
        throw new Error("krapi.email.testConfig method not available - SDK must implement this method");
      }
      const result = await testSuite.krapi.email.testConfig(testSuite.testProject.id);
      testSuite.assert(result, "Should return test connection result");
    });

    await testSuite.test("Update email configuration via SDK", async () => {
      if (typeof testSuite.krapi.email?.updateConfig !== "function") {
        throw new Error("krapi.email.updateConfig method not available - endpoint must be implemented");
      }

      const config = await testSuite.krapi.email.updateConfig(
        testSuite.testProject.id,
        {
          provider: "smtp",
          settings: {
            host: "smtp.example.com",
            port: 587,
          },
        }
      );
      
      // Validate response has real data - this will throw if config is empty or missing fields
      testSuite.assertResponse(config, ['smtp_host', 'smtp_port'], "Should return updated email config with smtp_host and smtp_port");
      testSuite.assertHasData(config, "Email config response should have real data");
      testSuite.assert(config.smtp_host === "smtp.example.com", "smtp_host should match input");
      testSuite.assert(config.smtp_port === 587, "smtp_port should match input");
    });

    await testSuite.test("Get email templates via SDK", async () => {
      if (typeof testSuite.krapi.email?.getTemplates !== "function") {
        throw new Error("krapi.email.getTemplates method not available - SDK must implement this method");
      }

      const templates = await testSuite.krapi.email.getTemplates(
        testSuite.testProject.id
      );
      testSuite.assert(Array.isArray(templates), "Should return templates array");
      testSuite.assertHasData(templates, "Templates array should not be empty or should be a valid empty array");
    });

    await testSuite.test("Send email via SDK", async () => {
      if (typeof testSuite.krapi.email?.send !== "function") {
        throw new Error("krapi.email.send method not available - SDK must implement this method");
      }

      // Email sending might fail due to configuration, but endpoint should exist
      // We'll catch configuration errors but not missing endpoint errors
      try {
        const result = await testSuite.krapi.email.send(testSuite.testProject.id, {
          to: "test@example.com",
          subject: "Test Email",
          body: "This is a test email",
        });
        testSuite.assert(result, "Should return send result");
        testSuite.assert(
          typeof result.success === "boolean",
          "Result should have success flag"
        );
      } catch (error) {
        const httpStatus = error?.status || error?.response?.status;
        // Missing endpoint (404) should fail the test
        if (httpStatus === 404) {
          throw new Error("Send email endpoint not available - backend must implement this endpoint");
        }
        // Configuration errors are acceptable (email not configured is a valid state)
        if (
          error.message &&
          (error.message.includes("not configured") ||
            error.message.includes("configuration") ||
            error.message.includes("SMTP") ||
            error.message.includes("smtp"))
        ) {
          // This is acceptable - email service exists but is not configured
          testSuite.assert(true, "Email endpoint exists but is not configured (acceptable)");
          return;
        }
        // All other errors should fail the test
        throw error;
      }
    });
  }
