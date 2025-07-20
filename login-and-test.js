const axios = require("axios");

// Login and test MCP functionality
async function loginAndTest() {
  const baseURL = "http://localhost:3470/api";

  try {
    console.log("🔐 Logging in to get auth token...\n");

    // 1. Login to get token
    console.log("1. Attempting login...");
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: "admin",
      password: "admin123",
    });

    if (!loginResponse.data.success) {
      throw new Error(`Login failed: ${loginResponse.data.error}`);
    }

    const token = loginResponse.data.token;
    console.log("✅ Login successful!");
    console.log("🔑 Token received:", token.substring(0, 20) + "...");
    console.log("");

    // 2. Test MCP Info
    console.log("2. Testing MCP Info...");
    const infoResponse = await axios.get(`${baseURL}/mcp/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ MCP Info:", infoResponse.data);
    console.log("");

    // 3. Test MCP Tools List
    console.log("3. Testing MCP Tools List...");
    const toolsResponse = await axios.get(`${baseURL}/mcp/tools`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ MCP Tools:", toolsResponse.data);
    console.log("");

    // 4. Test Direct Tool Call
    console.log("4. Testing Direct Tool Call...");
    const toolCallResponse = await axios.post(
      `${baseURL}/mcp/tools/call`,
      {
        name: "create_test_route",
        arguments: {
          route_name: "cmd-test",
          description: "Test route created via command line",
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Direct Tool Call Response:", toolCallResponse.data);
    console.log("");

    // 5. Test MCP Chat with Tools
    console.log("5. Testing MCP Chat with Tools...");
    const chatResponse = await axios.post(
      `${baseURL}/ollama/chat`,
      {
        messages: [
          { role: "user", content: 'Create a new route called "chat-test"' },
        ],
        model: "llama3.1:8b",
        tools: true,
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ MCP Chat Response:", chatResponse.data);
    console.log("");

    console.log("🎉 All tests completed successfully!");
    console.log(
      "💡 Check the Routes page in the frontend to see the created routes."
    );
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log("\n💡 Login failed. Check your credentials.");
    } else if (error.code === "ECONNREFUSED") {
      console.log(
        "\n💡 Cannot connect to server. Make sure both frontend and backend are running."
      );
      console.log("Frontend should be on port 3469");
      console.log("Backend should be on port 3470");
    }
  }
}

// Run the login and test
loginAndTest();
