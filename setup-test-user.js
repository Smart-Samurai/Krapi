const axios = require("axios");

const API_BASE = "http://localhost:3470/api/v2";

async function setupTestUser() {
  console.log("🔧 Setting up test user for Krapi Project API...\n");

  try {
    // 1. First, let's get the list of projects to find the default project
    console.log("1. Getting projects list...");
    const projectsResponse = await axios.get(`${API_BASE}/admin/projects`, {
      headers: {
        Authorization: "Bearer admin-token", // This will fail, but let's see what happens
      },
    });
    console.log("✅ Projects retrieved:", projectsResponse.data);
  } catch (error) {
    console.log(
      "❌ Could not get projects (expected - need admin auth):",
      error.response?.data || error.message
    );
  }

  // 2. Let's try to create a project first
  console.log("\n2. Creating a test project...");
  try {
    const createProjectResponse = await axios.post(
      `${API_BASE}/admin/projects`,
      {
        name: "Test Project",
        description: "A test project for API validation",
        domain: "test.example.com",
      },
      {
        headers: {
          Authorization: "Bearer admin-token", // This will fail, but let's see what happens
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Test project created:", createProjectResponse.data);
  } catch (error) {
    console.log(
      "❌ Could not create project (expected - need admin auth):",
      error.response?.data || error.message
    );
  }

  console.log("\n📝 To properly test the API, you need to:");
  console.log("1. Use the existing admin authentication from the main API");
  console.log("2. Create a project using the admin token");
  console.log("3. Create a test user in that project");
  console.log("4. Test the project-specific endpoints");

  console.log("\n🔑 For now, let's test with the main API admin user:");

  // 3. Try to authenticate with the main API admin user
  console.log("\n3. Testing main API authentication...");
  try {
    const mainAuthResponse = await axios.post(
      "http://localhost:3470/api/auth/login",
      {
        username: "admin",
        password: "admin123",
      }
    );
    console.log(
      "✅ Main API authentication successful:",
      mainAuthResponse.data
    );

    const adminToken = mainAuthResponse.data.token;

    // 4. Now try to create a project with the admin token
    console.log("\n4. Creating a test project with admin token...");
    const createProjectResponse = await axios.post(
      `${API_BASE}/admin/projects`,
      {
        name: "Test Project",
        description: "A test project for API validation",
        domain: "test.example.com",
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Test project created:", createProjectResponse.data);

    const projectId = createProjectResponse.data.data.id;

    // 5. Create an API key for the project first (using admin endpoint)
    console.log("\n5. Creating an API key for the project...");
    const createApiKeyResponse = await axios.post(
      `${API_BASE}/admin/projects/${projectId}/keys`,
      {
        name: "Test API Key",
        permissions: ["*"],
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ API key created:", createApiKeyResponse.data);

    const apiKey = createApiKeyResponse.data.data.key;

    // 6. Create a test user in the project using the API key
    console.log("\n6. Creating a test user in the project...");
    const createUserResponse = await axios.post(
      `${API_BASE}/projects/${projectId}/users`,
      {
        email: "test@example.com",
        name: "Test User",
        phone: "+1234567890",
      },
      {
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Test user created:", createUserResponse.data);

    console.log("\n🎉 Setup complete! You can now test the API with:");
    console.log(`Project ID: ${projectId}`);
    console.log(`API Key: ${createApiKeyResponse.data.data.key}`);
    console.log(`Test User Email: test@example.com`);
  } catch (error) {
    console.log(
      "❌ Error during setup:",
      error.response?.data || error.message
    );
  }
}

setupTestUser().catch(console.error);
