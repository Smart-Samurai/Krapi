/**
 * Verification script to manually count tests and show breakdown
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function verifyTestCount() {
  const testsDir = join(__dirname, "tests", "frontend-ui");
  const files = await readdir(testsDir);
  const testFiles = files.filter(f => f.endsWith(".js") && f.includes("-ui.tests.js"));
  
  console.log("=".repeat(60));
  console.log("TEST COUNT VERIFICATION");
  console.log("=".repeat(60));
  console.log();
  
  let totalCount = 0;
  const breakdown = [];
  
  for (const file of testFiles.sort()) {
    const filePath = join(testsDir, file);
    const content = await readFile(filePath, "utf-8");
    
    // Count occurrences of "await testSuite.test("
    const matches = content.match(/await\s+testSuite\.test\(/g) || [];
    const count = matches.length;
    totalCount += count;
    
    breakdown.push({ file, count });
    
    // Show test names for verification
    const testNames = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('await testSuite.test(')) {
        // Extract test name from the line
        const match = lines[i].match(/testSuite\.test\(["']([^"']+)["']/);
        if (match) {
          testNames.push(`    - ${match[1]}`);
        }
      }
    }
    
    console.log(`${file}: ${count} tests`);
    if (testNames.length > 0 && testNames.length <= 5) {
      testNames.forEach(name => console.log(name));
    } else if (testNames.length > 5) {
      testNames.slice(0, 3).forEach(name => console.log(name));
      console.log(`    ... and ${testNames.length - 3} more`);
    }
    console.log();
  }
  
  console.log("=".repeat(60));
  console.log(`TOTAL: ${totalCount} tests`);
  console.log("=".repeat(60));
  
  // Show breakdown summary
  console.log("\nBreakdown by file:");
  breakdown.forEach(({ file, count }) => {
    console.log(`  ${file.padEnd(30)} ${count.toString().padStart(3)} tests`);
  });
  
  return totalCount;
}

verifyTestCount().catch(console.error);

