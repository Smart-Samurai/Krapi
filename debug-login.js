const axios = require("axios");

// Debug login response
async function debugLogin() {
  const baseURL = "http://localhost:3470/api";

  try {
    console.log("🔐 Debugging login response...\n");

    // 1. Login to see response structure
    console.log("1. Attempting login...");
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: "admin",
      password: "admin123",
    });

    console.log("📊 Full login response:");
    console.log(JSON.stringify(loginResponse.data, null, 2));
    console.log("");

    // Check if login was successful
    if (loginResponse.data.success) {
      console.log("✅ Login successful!");

      // Try different possible token locations
      const possibleTokenPaths = [
        "data.token",
        "data.access_token",
        "token",
        "access_token",
      ];

      for (const path of possibleTokenPaths) {
        const value = path
          .split(".")
          .reduce((obj, key) => obj?.[key], loginResponse.data);
        if (value) {
          console.log(
            `🔑 Found token at ${path}:`,
            value.substring(0, 20) + "..."
          );
        }
      }
    } else {
      console.log("❌ Login failed:", loginResponse.data.error);
    }
  } catch (error) {
    console.error("❌ Request failed:", error.response?.data || error.message);

    if (error.response) {
      console.log("📊 Error response data:");
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the debug
debugLogin();
