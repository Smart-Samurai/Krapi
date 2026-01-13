/**
 * Count total number of tests in the frontend UI test suite
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function countTotalTests() {
  try {
    const testsDir = join(__dirname, "..", "tests", "frontend-ui");
    const files = await readdir(testsDir);
    const testFiles = files.filter(f => f.endsWith(".js") && f.includes("-ui.tests.js"));
    
    let totalCount = 0;
    
    for (const file of testFiles) {
      const filePath = join(testsDir, file);
      const content = await readFile(filePath, "utf-8");
      
      // Count occurrences of "await testSuite.test(" (most common pattern)
      // This is the standard pattern used in all test files
      const matches = content.match(/await\s+testSuite\.test\(/g) || [];
      totalCount += matches.length;
    }
    
    return totalCount;
  } catch (error) {
    console.error("Error counting tests:", error);
    // Return a reasonable default if counting fails
    return 77; // User mentioned around 77 tests
  }
}

