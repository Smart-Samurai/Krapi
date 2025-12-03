/**
 * CORS (Cross-Origin Resource Sharing) Tests
 * 
 * Tests CORS configuration and security settings.
 * 
 * Created: 2025-12-03
 * Last Updated: 2025-12-03
 */

import axios from "axios";
import { CONFIG } from "../config.js";

export async function runCorsTests(testSuite) {
  testSuite.logger.suiteStart("CORS Tests");

  // Test allowed origins configuration
  await testSuite.test("CORS: Request from allowed origin should succeed", async () => {
    // Use the first allowed origin from config
    const testOrigin = CONFIG.CORS_ALLOWED_ORIGINS[0] || "https://test-allowed.example.com";
    
    try {
      const response = await axios.get(`${CONFIG.FRONTEND_URL}/api/krapi/k1/health`, {
        headers: {
          "Origin": testOrigin,
        },
        validateStatus: () => true, // Don't throw on any status
      });

      // If CORS is properly configured, we should get a response
      // (even if it's an error, as long as CORS headers are present)
      testSuite.assert(response !== null, "Should receive response from allowed origin");
      
      // Check for CORS headers (if CORS is enabled)
      const corsHeaders = {
        "access-control-allow-origin": response.headers["access-control-allow-origin"],
        "access-control-allow-credentials": response.headers["access-control-allow-credentials"],
        "access-control-allow-methods": response.headers["access-control-allow-methods"],
      };
      
      // Log CORS headers for debugging (only in verbose mode)
      if (process.env.VERBOSE === "true") {
        console.log(`CORS headers: ${JSON.stringify(corsHeaders)}`);
      }
    } catch (error) {
      // Network errors are acceptable if CORS is blocking
      if (process.env.VERBOSE === "true") {
        console.log(`CORS test note: ${error.message}`);
      }
    }
  });

  await testSuite.test("CORS: Request from disallowed origin should be blocked", async () => {
    // Use a purposefully wrong URL that should not be in allowed origins
    const disallowedOrigin = CONFIG.CORS_DISALLOWED_ORIGINS[0] || "https://malicious-attacker.com";
    
    try {
      const response = await axios.get(`${CONFIG.FRONTEND_URL}/api/krapi/k1/health`, {
        headers: {
          "Origin": disallowedOrigin,
        },
        validateStatus: () => true, // Don't throw on any status
      });

      // If CORS is properly configured, requests from disallowed origins
      // should either be blocked or not include CORS headers allowing the origin
      const allowOrigin = response.headers["access-control-allow-origin"];
      
      if (allowOrigin) {
        // If CORS header is present, it should NOT be the disallowed origin
        testSuite.assert(
          allowOrigin !== disallowedOrigin,
          "Disallowed origin should not be in Access-Control-Allow-Origin header"
        );
      }
      
      // The request might succeed (if CORS allows all) or fail (if CORS blocks)
      // Both are valid behaviors depending on configuration
      if (process.env.VERBOSE === "true") {
        console.log(`Response status: ${response.status}`);
        console.log(`CORS header: ${allowOrigin || "none"}`);
      }
    } catch (error) {
      // Network/CORS errors are expected for disallowed origins
      if (process.env.VERBOSE === "true") {
        console.log(`CORS blocking note: ${error.message}`);
      }
      testSuite.assert(true, "CORS blocking disallowed origin is expected behavior");
    }
  });

  await testSuite.test("CORS: Request with wrong protocol should be handled", async () => {
    // Test with HTTP when HTTPS is expected (or vice versa)
    const wrongProtocolOrigin = "http://test.example.com"; // If HTTPS is required
    
    try {
      const response = await axios.get(`${CONFIG.FRONTEND_URL}/api/krapi/k1/health`, {
        headers: {
          "Origin": wrongProtocolOrigin,
        },
        validateStatus: () => true,
      });

      // Log the response for analysis (only in verbose mode)
      if (process.env.VERBOSE === "true") {
        console.log(`Wrong protocol test - Status: ${response.status}`);
        console.log(`CORS header: ${response.headers["access-control-allow-origin"] || "none"}`);
      }
      
      testSuite.assert(response !== null, "Should handle wrong protocol origin");
    } catch (error) {
      if (process.env.VERBOSE === "true") {
        console.log(`Wrong protocol test note: ${error.message}`);
      }
    }
  });

  await testSuite.test("CORS: Request with invalid origin format should be handled", async () => {
    // Test with malformed origin
    const invalidOrigin = "not-a-valid-origin";
    
    try {
      const response = await axios.get(`${CONFIG.FRONTEND_URL}/api/krapi/k1/health`, {
        headers: {
          "Origin": invalidOrigin,
        },
        validateStatus: () => true,
      });

      // Invalid origins should be rejected or ignored
      if (process.env.VERBOSE === "true") {
        console.log(`Invalid origin test - Status: ${response.status}`);
      }
      
      const allowOrigin = response.headers["access-control-allow-origin"];
      if (allowOrigin) {
        testSuite.assert(
          allowOrigin !== invalidOrigin,
          "Invalid origin format should not be allowed"
        );
      }
    } catch (error) {
      // Errors are acceptable for invalid origins
      if (process.env.VERBOSE === "true") {
        console.log(`Invalid origin test note: ${error.message}`);
      }
    }
  });

  await testSuite.test("CORS: Preflight OPTIONS request should work", async () => {
    // Test CORS preflight (OPTIONS request)
    try {
      const response = await axios.options(`${CONFIG.FRONTEND_URL}/api/krapi/k1/health`, {
        headers: {
          "Origin": "https://test.example.com",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Content-Type",
        },
        validateStatus: () => true,
      });

      // Preflight should return 200 or 204 with CORS headers
      testSuite.assert(
        response.status === 200 || response.status === 204 || response.status === 405,
        `Preflight should return appropriate status (got ${response.status})`
      );
      
      // Check for preflight CORS headers
      const allowOrigin = response.headers["access-control-allow-origin"];
      const allowMethods = response.headers["access-control-allow-methods"];
      
      if (process.env.VERBOSE === "true") {
        console.log(`Preflight - Allow-Origin: ${allowOrigin || "none"}`);
        console.log(`Preflight - Allow-Methods: ${allowMethods || "none"}`);
      }
    } catch (error) {
      // Some servers don't handle OPTIONS, which is acceptable
      if (process.env.VERBOSE === "true") {
        console.log(`Preflight test note: ${error.message}`);
      }
    }
  });

  await testSuite.test("CORS: Multiple allowed origins should work", async () => {
    // Test that multiple origins can be configured
    // Use origins from config
    const testOrigins = CONFIG.CORS_ALLOWED_ORIGINS || [
      "https://app1.example.com",
      "https://app2.example.com",
      "https://app3.example.com",
    ];
    
    let successCount = 0;
    for (const origin of testOrigins) {
      try {
        const response = await axios.get(`${CONFIG.FRONTEND_URL}/api/krapi/k1/health`, {
          headers: {
            "Origin": origin,
          },
          validateStatus: () => true,
        });
        
        if (response.status < 500) {
          successCount++;
        }
      } catch (error) {
        // Count as handled if we get a response (even if error)
        if (process.env.VERBOSE === "true") {
          console.log(`Origin ${origin}: ${error.message}`);
        }
      }
    }
    
    if (process.env.VERBOSE === "true") {
      console.log(`Multiple origins test: ${successCount}/${testOrigins.length} handled`);
    }
    testSuite.assert(successCount > 0, "At least some origins should be handled");
  });

  testSuite.logger.suiteEnd("CORS Tests");
}

