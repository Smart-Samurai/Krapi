const axios = require("axios");

// Debug the actual response structure
async function debugResponse() {
  const baseURL = "http://localhost:3470/api";

  try {
    console.log("🔍 Debugging Response Structure...\n");

    // 1. Login
    console.log("1. Logging in...");
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: "admin",
      password: "admin123",
    });
    const token = loginResponse.data.token;
    console.log("✅ Login successful");
    console.log("");

    // 2. Test MCP chat
    console.log("2. Testing MCP chat...");

    const requestData = {
      messages: [
        {
          role: "system",
          content:
            "You have access to tools. When asked to create a route, use the create_test_route tool.",
        },
        {
          role: "user",
          content:
            'Create a new route called "debug-test" using the available tools.',
        },
      ],
      model: "llama3.1:8b",
      tools: true,
      temperature: 0.1,
      max_tokens: 2000,
    };

    const mcpResponse = await axios.post(
      `${baseURL}/ollama/chat`,
      requestData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("📥 Full MCP server response:");
    console.log(JSON.stringify(mcpResponse.data, null, 2));
    console.log("");

    // 3. Check response structure
    console.log("3. Response structure analysis:");
    console.log("Success:", mcpResponse.data.success);
    console.log("Has data:", !!mcpResponse.data.data);

    if (mcpResponse.data.data) {
      console.log("Data keys:", Object.keys(mcpResponse.data.data));
      console.log("Has message:", !!mcpResponse.data.data.message);

      if (mcpResponse.data.data.message) {
        console.log(
          "Message keys:",
          Object.keys(mcpResponse.data.data.message)
        );
        console.log("Has content:", !!mcpResponse.data.data.message.content);
        console.log(
          "Has tool_calls:",
          !!mcpResponse.data.data.message.tool_calls
        );

        if (mcpResponse.data.data.message.tool_calls) {
          console.log("🎉 Tool calls found!");
          console.log("Tool calls:", mcpResponse.data.data.message.tool_calls);
        }
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);

    if (error.response) {
      console.log("📊 Error response data:");
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the debug
debugResponse();
