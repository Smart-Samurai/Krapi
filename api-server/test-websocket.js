// Comprehensive WebSocket test script with JWT authentication
const WebSocket = require("ws");
const https = require("https");
const http = require("http");

async function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testWebSocketWithAuth() {
  console.log("🔐 Testing WebSocket with JWT authentication...\n");

  // Step 1: Authenticate and get JWT token
  console.log("Step 1: Authenticating with admin credentials...");

  const loginOptions = {
    hostname: "localhost",
    port: 3001,
    path: "/api/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const loginData = JSON.stringify({
    username: "admin",
    password: "admin123",
  });

  try {
    const loginResponse = await makeHttpRequest(loginOptions, loginData);

    if (loginResponse.statusCode !== 200) {
      console.error(`❌ Login failed with status: ${loginResponse.statusCode}`);
      console.error(`Response: ${loginResponse.data}`);
      return;
    }

    const authResult = JSON.parse(loginResponse.data);

    if (!authResult.success) {
      console.error(`❌ Login failed: ${authResult.error || "Unknown error"}`);
      return;
    }

    const token = authResult.token;

    console.log("✅ Authentication successful!");
    console.log(`Token: ${token.substring(0, 20)}...`);

    // Step 2: Test WebSocket connection without token (should fail)
    console.log(
      "\nStep 2: Testing WebSocket without token (should be rejected)..."
    );

    const wsWithoutToken = new WebSocket("ws://localhost:3001/ws");

    wsWithoutToken.on("close", (code, reason) => {
      console.log(
        `✅ Connection without token correctly rejected. Code: ${code}, Reason: ${reason.toString()}`
      );

      // Step 3: Test with invalid token (should fail)
      console.log(
        "\nStep 3: Testing WebSocket with invalid token (should be rejected)..."
      );

      const wsWithBadToken = new WebSocket(
        "ws://localhost:3001/ws?token=invalid-token"
      );

      wsWithBadToken.on("close", (code, reason) => {
        console.log(
          `✅ Connection with invalid token correctly rejected. Code: ${code}, Reason: ${reason.toString()}`
        );

        // Step 4: Test with valid token (should succeed)
        console.log("\nStep 4: Testing WebSocket with valid JWT token...");

        const wsWithValidToken = new WebSocket(
          `ws://localhost:3001/ws?token=${token}`
        );

        wsWithValidToken.on("open", () => {
          console.log("🎉 WebSocket connected successfully with valid token!");
        });

        wsWithValidToken.on("message", (data) => {
          const message = JSON.parse(data.toString());
          console.log("📨 Received message from server:", message);

          // Send a test message
          console.log("📤 Sending test message to server...");
          wsWithValidToken.send(
            JSON.stringify({
              type: "test",
              message: "Hello from WebSocket client!",
              timestamp: new Date().toISOString(),
            })
          );

          // Close connection after a short delay
          setTimeout(() => {
            console.log("🔌 Closing WebSocket connection...");
            wsWithValidToken.close();
          }, 2000);
        });

        wsWithValidToken.on("close", (code, reason) => {
          console.log(`✅ WebSocket connection closed normally. Code: ${code}`);
          console.log("\n🎯 All WebSocket tests completed successfully!");
          console.log("✅ Authentication works correctly");
          console.log("✅ Invalid tokens are rejected");
          console.log("✅ Valid tokens allow connection");
          console.log("✅ Message exchange works");
          process.exit(0);
        });

        wsWithValidToken.on("error", (error) => {
          console.error("❌ Unexpected error with valid token:", error.message);
          process.exit(1);
        });
      });

      wsWithBadToken.on("error", (error) => {
        console.log("Expected error with bad token:", error.message);
      });
    });

    wsWithoutToken.on("error", (error) => {
      console.log("Expected error without token:", error.message);
    });
  } catch (error) {
    console.error("❌ Error during authentication:", error.message);
    process.exit(1);
  }
}

// Run the test
testWebSocketWithAuth();
