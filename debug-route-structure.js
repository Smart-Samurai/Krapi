const axios = require("axios");

// Debug route structure
async function debugRouteStructure() {
  const baseURL = "http://localhost:3470/api";

  try {
    console.log("🔍 Debugging Route Structure...\n");

    // 1. Login
    console.log("1. Logging in...");
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: "admin",
      password: "admin123",
    });
    const token = loginResponse.data.token;
    console.log("✅ Login successful");
    console.log("");

    // 2. Get all routes
    console.log("2. Getting all routes...");
    const routesResponse = await axios.get(`${baseURL}/admin/routes`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("📊 Routes response:");
    console.log(JSON.stringify(routesResponse.data, null, 2));
    console.log("");

    // 3. Try to get a specific route by ID
    if (routesResponse.data.success && routesResponse.data.data.length > 0) {
      const firstRoute = routesResponse.data.data[0];
      console.log(`3. Getting route by ID: ${firstRoute.id}`);

      try {
        const routeResponse = await axios.get(
          `${baseURL}/admin/routes/${firstRoute.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("📊 Route by ID response:");
        console.log(JSON.stringify(routeResponse.data, null, 2));
      } catch (error) {
        console.error(
          "❌ Get route by ID failed:",
          error.response?.data || error.message
        );
      }
    }
  } catch (error) {
    console.error("❌ Debug failed:", error.response?.data || error.message);
  }
}

// Run the debug
debugRouteStructure();
