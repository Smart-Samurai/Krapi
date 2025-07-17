// Test script for email functionality
const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3001/api";

async function testEmailEndpoints() {
  console.log("🧪 Testing Email Management Endpoints...\n");

  try {
    // Test 1: Get email settings
    console.log("1. Testing GET /email/settings");
    const settingsResponse = await fetch(`${BASE_URL}/email/settings`);
    const settings = await settingsResponse.json();
    console.log(
      "✅ Settings:",
      settings.success ? "Retrieved successfully" : "Failed"
    );
    console.log("   Settings count:", settings.data?.length || 0);

    // Test 2: Get email templates
    console.log("\n2. Testing GET /email/templates");
    const templatesResponse = await fetch(`${BASE_URL}/email/templates`);
    const templates = await templatesResponse.json();
    console.log(
      "✅ Templates:",
      templates.success ? "Retrieved successfully" : "Failed"
    );
    console.log("   Templates count:", templates.data?.length || 0);

    // Test 3: Get email logs
    console.log("\n3. Testing GET /email/logs");
    const logsResponse = await fetch(`${BASE_URL}/email/logs`);
    const logs = await logsResponse.json();
    console.log("✅ Logs:", logs.success ? "Retrieved successfully" : "Failed");
    console.log("   Logs count:", logs.data?.logs?.length || 0);

    // Test 4: Get email stats
    console.log("\n4. Testing GET /email/stats");
    const statsResponse = await fetch(`${BASE_URL}/email/stats`);
    const stats = await statsResponse.json();
    console.log(
      "✅ Stats:",
      stats.success ? "Retrieved successfully" : "Failed"
    );
    console.log("   Total emails:", stats.data?.total || 0);

    // Test 5: Set email configuration (basic SMTP settings)
    console.log("\n5. Testing POST /email/config");
    const configData = {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      user: "test@example.com",
      password: "test-password",
      from_name: "Krapi CMS",
      from_email: "noreply@example.com",
    };

    const configResponse = await fetch(`${BASE_URL}/email/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(configData),
    });
    const configResult = await configResponse.json();
    console.log(
      "✅ Config:",
      configResult.success ? "Updated successfully" : "Failed"
    );

    console.log("\n🎉 Email system tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run tests
testEmailEndpoints();
