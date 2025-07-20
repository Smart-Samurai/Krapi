const axios = require("axios");

// Check if routes were created
async function checkRoutes() {
  const baseURL = "http://localhost:3470/api";

  try {
    console.log("🔍 Checking routes...\n");

    // 1. Login
    console.log("1. Logging in...");
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: "admin",
      password: "admin123",
    });
    const token = loginResponse.data.token;
    console.log("✅ Login successful");
    console.log("");

    // 2. Get routes
    console.log("2. Getting routes...");
    const routesResponse = await axios.get(`${baseURL}/admin/routes`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("📊 Routes response:");
    console.log(JSON.stringify(routesResponse.data, null, 2));
    console.log("");

    // 3. Check for recent routes
    if (routesResponse.data.success && routesResponse.data.data) {
      const routes = routesResponse.data.data;
      console.log("📋 All routes:");
      routes.forEach((route, index) => {
        console.log(
          `${index + 1}. ${route.path} (${
            route.description || "No description"
          })`
        );
      });

      // Look for routes created in the last few minutes
      const recentRoutes = routes.filter((route) => {
        const createdAt = new Date(route.created_at);
        const now = new Date();
        const diffMinutes = (now - createdAt) / (1000 * 60);
        return diffMinutes < 5; // Routes created in last 5 minutes
      });

      if (recentRoutes.length > 0) {
        console.log("");
        console.log("🆕 Recent routes (last 5 minutes):");
        recentRoutes.forEach((route) => {
          console.log(`- ${route.path} (created: ${route.created_at})`);
        });
      } else {
        console.log("");
        console.log("❌ No recent routes found");
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

// Run the check
checkRoutes();
