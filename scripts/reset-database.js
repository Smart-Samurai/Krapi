/**
 * Database Reset Script
 * 
 * Resets all database data by calling the backend API.
 * WARNING: This is a destructive operation that will delete ALL data.
 * 
 * Usage: node scripts/reset-database.js
 */

const http = require("http");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3470";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

/**
 * Login and get session token
 */
async function login() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    });

    const options = {
      hostname: new URL(BACKEND_URL).hostname,
      port: new URL(BACKEND_URL).port || (BACKEND_URL.startsWith("https") ? 443 : 80),
      path: "/krapi/k1/auth/admin/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (result.success && result.session_token) {
            resolve(result.session_token);
          } else {
            reject(new Error(result.error || "Login failed"));
          }
        } catch (error) {
          reject(new Error(`Failed to parse login response: ${error.message}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Login request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Reset database
 */
async function resetDatabase(sessionToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(BACKEND_URL).hostname,
      port: new URL(BACKEND_URL).port || (BACKEND_URL.startsWith("https") ? 443 : 80),
      path: "/krapi/k1/system/reset-database",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            resolve(result.data);
          } else {
            reject(new Error(result.error || "Reset failed"));
          }
        } catch (error) {
          reject(new Error(`Failed to parse reset response: ${error.message}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Reset request failed: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  console.log("🔄 Starting database reset...");
  console.log(`   Backend URL: ${BACKEND_URL}`);
  console.log(`   Admin Username: ${ADMIN_USERNAME}`);

  try {
    // Login
    console.log("\n📝 Logging in...");
    const sessionToken = await login();
    console.log("✅ Login successful");

    // Reset database
    console.log("\n🗑️  Resetting database...");
    const result = await resetDatabase(sessionToken);
    console.log("✅ Database reset successful!");
    console.log("\n📊 Reset Statistics:");
    console.log(`   - Deleted Projects: ${result.deletedProjects || 0}`);
    console.log(`   - Deleted Admin Users: ${result.deletedAdminUsers || 0}`);
    console.log(`   - Deleted Sessions: ${result.deletedSessions || 0}`);
    console.log("\n✅ Default admin user has been reset:");
    console.log(`   Username: admin`);
    console.log(`   Password: admin123`);
    console.log("\n✅ Database reset complete!");
  } catch (error) {
    console.error("\n❌ Database reset failed:");
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

// Run main function
main();













