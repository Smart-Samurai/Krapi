const axios = require("axios");

// Debug the complete MCP flow
async function debugMCPFlow() {
  const baseURL = "http://localhost:3470/api";

  try {
    console.log("🔍 Debugging Complete MCP Flow...\n");

    // 1. Login
    console.log("1. Logging in...");
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: "admin",
      password: "admin123",
    });
    const token = loginResponse.data.token;
    console.log("✅ Login successful");
    console.log("");

    // 2. Get MCP tools to see what's available
    console.log("2. Getting MCP tools...");
    const toolsResponse = await axios.get(`${baseURL}/mcp/tools`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("📊 Available MCP tools:");
    toolsResponse.data.data.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log("");

    // 3. Test direct Ollama call (this works)
    console.log("3. Testing direct Ollama call (should work)...");
    const directOllamaResponse = await axios.post(
      "http://localhost:11434/api/chat",
      {
        model: "llama3.1:8b",
        messages: [
          { role: "user", content: 'Create a new route called "debug-test"' },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_test_route",
              description: "Create a simple test route",
              parameters: {
                type: "object",
                properties: {
                  route_name: {
                    type: "string",
                    description: "Name for the test route",
                  },
                },
                required: ["route_name"],
              },
            },
          },
        ],
        stream: false,
      }
    );

    console.log("📊 Direct Ollama response:");
    if (directOllamaResponse.data.message.tool_calls) {
      console.log(
        "✅ Tool calls detected:",
        directOllamaResponse.data.message.tool_calls
      );
    } else {
      console.log("❌ No tool calls in direct Ollama response");
    }
    console.log("");

    // 4. Test MCP server call (this fails)
    console.log("4. Testing MCP server call (should fail)...");
    const mcpResponse = await axios.post(
      `${baseURL}/ollama/chat`,
      {
        messages: [
          { role: "user", content: 'Create a new route called "debug-test"' },
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

    console.log("📊 MCP server response:");
    if (mcpResponse.data.data.message.tool_calls) {
      console.log(
        "✅ Tool calls detected:",
        mcpResponse.data.data.message.tool_calls
      );
    } else {
      console.log("❌ No tool calls in MCP server response");
      console.log(
        "Response content:",
        mcpResponse.data.data.message.content.substring(0, 200) + "..."
      );
    }
    console.log("");

    // 5. Compare the requests
    console.log("5. Analysis:");
    console.log("Direct Ollama request includes tools ✅");
    console.log(
      "MCP server request should include tools but model doesn't call them ❌"
    );
    console.log("");
    console.log(
      "The issue is that our MCP server is not properly converting or sending tools to Ollama"
    );
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

// Run the debug
debugMCPFlow();
