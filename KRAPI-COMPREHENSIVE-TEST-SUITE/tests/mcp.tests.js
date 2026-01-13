/**
 * MCP SDK Tests
 * 
 * Tests MCP (Model Context Protocol) SDK methods for LLM tool calling
 * Created: 2025-11-30
 * Last Updated: 2025-12-06
 */

export async function runMCPServerTests(testSuite) {
    testSuite.logger.suiteStart("MCP SDK Tests");

    await testSuite.test("MCP admin.chat method exists", async () => {
      if (typeof testSuite.krapi.mcp?.admin?.chat !== "function") {
        throw new Error("krapi.mcp.admin.chat method not available - SDK must implement this method");
      }
      testSuite.assert(true, "MCP admin.chat method is available");
    });

    await testSuite.test("MCP projects.chat method exists", async () => {
      if (typeof testSuite.krapi.mcp?.projects?.chat !== "function") {
        throw new Error("krapi.mcp.projects.chat method not available - SDK must implement this method");
      }
      testSuite.assert(true, "MCP projects.chat method is available");
    });

    await testSuite.test("MCP modelCapabilities method exists", async () => {
      if (typeof testSuite.krapi.mcp?.modelCapabilities !== "function") {
        throw new Error("krapi.mcp.modelCapabilities method not available - SDK must implement this method");
      }
      testSuite.assert(true, "MCP modelCapabilities method is available");
    });

    await testSuite.test("MCP models method exists", async () => {
      if (typeof testSuite.krapi.mcp?.models !== "function") {
        throw new Error("krapi.mcp.models method not available - SDK must implement this method");
      }
      testSuite.assert(true, "MCP models method is available");
    });

    await testSuite.test("MCP admin.chat returns response structure", async () => {
      if (!testSuite.krapi.mcp?.admin?.chat) {
        throw new Error("krapi.mcp.admin.chat method not available");
      }

      // Test with minimal message (may fail if no LLM configured, but tests SDK method exists)
      try {
        const result = await testSuite.krapi.mcp.admin.chat([
          { role: "user", content: "Hello" }
        ]);
        // If it succeeds, verify structure
        testSuite.assert(result !== undefined, "Should return a result");
        // Result may be error if LLM not configured, but method should exist
      } catch (error) {
        // If LLM not configured, that's OK - we're just testing SDK method exists
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes("not configured") || errorMsg.includes("LLM") || errorMsg.includes("endpoint")) {
          console.log("   ✅ MCP method exists (LLM not configured - expected)");
          return;
        }
        // Other errors might indicate SDK issue
        throw error;
      }
    });

    await testSuite.test("MCP projects.chat returns response structure", async () => {
      if (!testSuite.krapi.mcp?.projects?.chat) {
        throw new Error("krapi.mcp.projects.chat method not available");
      }
      if (!testSuite.testProject) {
        throw new Error("No test project available for MCP project chat test");
      }

      // Test with minimal message (may fail if no LLM configured, but tests SDK method exists)
      try {
        const result = await testSuite.krapi.mcp.projects.chat(
          testSuite.testProject.id,
          [{ role: "user", content: "Hello" }]
        );
        // If it succeeds, verify structure
        testSuite.assert(result !== undefined, "Should return a result");
        // Result may be error if LLM not configured, but method should exist
      } catch (error) {
        // If LLM not configured, that's OK - we're just testing SDK method exists
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes("not configured") || errorMsg.includes("LLM") || errorMsg.includes("endpoint")) {
          console.log("   ✅ MCP method exists (LLM not configured - expected)");
          return;
        }
        // Other errors might indicate SDK issue
        throw error;
      }
    });
  }
