#!/usr/bin/env node

/**
 * Selector Validation Script
 * 
 * Validates that UI test files use ONLY data-testid selectors.
 * Forbids: CSS classes, text content selectors, XPath, attribute selectors (except data-testid)
 * 
 * Usage: node lib/validate-selectors.js [test-file-path]
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Forbidden selector patterns
const FORBIDDEN_PATTERNS = [
  // CSS class selectors
  {
    pattern: /\.\w+[-\w]*/g,
    description: "CSS class selector (e.g., .className)",
    examples: [".btn-primary", ".error", ".table"]
  },
  {
    pattern: /\[class\*?=/g,
    description: "CSS class attribute selector",
    examples: ['[class*="error"]', '[class="table"]']
  },
  {
    pattern: /\[class\s*\]/g,
    description: "CSS class attribute selector (empty)",
    examples: ["[class]"]
  },
  
  // Text content selectors
  {
    pattern: /:has-text\(/g,
    description: "Text content selector (:has-text)",
    examples: [':has-text("Login")', ':has-text("Create")']
  },
  {
    pattern: /text\s*=/g,
    description: "Text content selector (text=)",
    examples: ['text="Login"', 'text=/pattern/i']
  },
  {
    pattern: /\.getByText\(/g,
    description: "Playwright getByText method",
    examples: ['.getByText("Login")']
  },
  {
    pattern: /\.getByLabel\(/g,
    description: "Playwright getByLabel method",
    examples: ['.getByLabel("Username")']
  },
  {
    pattern: /\.getByRole\(/g,
    description: "Playwright getByRole method (use data-testid instead)",
    examples: ['.getByRole("button")']
  },
  
  // XPath selectors
  {
    pattern: /xpath\s*=/gi,
    description: "XPath selector",
    examples: ['xpath=//div', 'xpath=/button']
  },
  {
    pattern: /\/\/[^\s'"]+/g,
    description: "XPath expression (//)",
    examples: ["//div", "//button[@class='btn']"]
  },
  
  // Attribute selectors (non-testid)
  {
    pattern: /\[type\s*=/g,
    description: "Type attribute selector (use data-testid instead)",
    examples: ['input[type="text"]', 'button[type="submit"]']
  },
  {
    pattern: /\[name\s*=/g,
    description: "Name attribute selector (use data-testid instead)",
    examples: ['input[name="username"]', 'input[name*="email"]']
  },
  {
    pattern: /\[placeholder\s*=/g,
    description: "Placeholder attribute selector (use data-testid instead)",
    examples: ['input[placeholder*="username"]']
  },
  {
    pattern: /\[role\s*=/g,
    description: "Role attribute selector (use data-testid instead)",
    examples: ['[role="dialog"]', '[role="button"]']
  },
  {
    pattern: /\[aria-label\s*=/g,
    description: "Aria-label attribute selector (use data-testid instead)",
    examples: ['[aria-label*="edit"]']
  },
  {
    pattern: /\[href\s*=/g,
    description: "Href attribute selector (use data-testid instead)",
    examples: ['a[href*="activity"]']
  },
  
  // Element type selectors (standalone)
  {
    pattern: /page\.locator\(['"]\s*(button|input|select|table|tbody|tr|td|th|div|span|a)(?!\[data-testid)/g,
    description: "Element type selector without data-testid",
    examples: ['page.locator("button")', 'page.locator("input")']
  },
  
  // Combined fallback selectors (comma-separated with non-testid)
  {
    pattern: /\[data-testid[^'"]*\],\s*[^'"]*(?:\.|\[class|:has-text|text=|\[type|\[name|\[role|\[aria)/g,
    description: "Fallback selector after data-testid (remove fallbacks)",
    examples: ['[data-testid="login"], button:has-text("Login")']
  }
];

// Allowed patterns (exceptions)
const ALLOWED_PATTERNS = [
  /\[data-testid\s*=/g,  // data-testid selectors are allowed
  /page\.locator\(['"]\[data-testid/g,  // page.locator('[data-testid=...]')
  /\.first\(\)/g,  // .first() method
  /\.last\(\)/g,  // .last() method
  /\.nth\(/g,  // .nth() method
  /\.waitFor\(/g,  // .waitFor() method
  /\.isVisible\(/g,  // .isVisible() method
  /\.isEnabled\(/g,  // .isEnabled() method
  /\.click\(/g,  // .click() method
  /\.fill\(/g,  // .fill() method
  /\.textContent\(/g,  // .textContent() method
  /\.inputValue\(/g,  // .inputValue() method
  /\.getAttribute\(/g,  // .getAttribute() method
  /\.evaluate\(/g,  // .evaluate() method
  /\.waitForURL\(/g,  // .waitForURL() method
  /\.waitForTimeout\(/g,  // .waitForTimeout() method
  /\.goto\(/g,  // .goto() method
  /\.url/g,  // .url property
  /\.context\(\)/g,  // .context() method
  /\.clearCookies\(/g,  // .clearCookies() method
  /testSuite\./g,  // testSuite methods
  /CONFIG\./g,  // CONFIG constants
  /\/\/.*/g,  // Comments
  /\/\*[\s\S]*?\*\//g,  // Block comments
];

/**
 * Check if a match is in an allowed context
 */
function isAllowedContext(content, matchIndex) {
  const beforeMatch = content.substring(Math.max(0, matchIndex - 100), matchIndex);
  const afterMatch = content.substring(matchIndex, Math.min(content.length, matchIndex + 100));
  const context = beforeMatch + afterMatch;
  
  // Check if it's in a comment
  const lineStart = content.lastIndexOf('\n', matchIndex);
  const lineContent = content.substring(lineStart, matchIndex);
  if (lineContent.trim().startsWith('//')) {
    return true;
  }
  
  // Check if it's in a block comment
  const lastBlockCommentStart = content.lastIndexOf('/*', matchIndex);
  const lastBlockCommentEnd = content.lastIndexOf('*/', matchIndex);
  if (lastBlockCommentStart > lastBlockCommentEnd && lastBlockCommentStart < matchIndex) {
    return true;
  }
  
  // Check if it's in a string that's part of an allowed pattern
  for (const allowedPattern of ALLOWED_PATTERNS) {
    if (allowedPattern.test(context)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate a single file
 */
function validateFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const violations = [];
  
  for (const { pattern, description, examples } of FORBIDDEN_PATTERNS) {
    const matches = [...content.matchAll(pattern)];
    
    for (const match of matches) {
      const matchIndex = match.index;
      
      // Skip if in allowed context (comment, string in allowed pattern, etc.)
      if (isAllowedContext(content, matchIndex)) {
        continue;
      }
      
      // Get line number
      const beforeMatch = content.substring(0, matchIndex);
      const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
      
      // Get line content
      const lineStart = beforeMatch.lastIndexOf('\n') + 1;
      const lineEnd = content.indexOf('\n', matchIndex);
      const lineContent = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
      
      violations.push({
        file: filePath,
        line: lineNumber,
        column: matchIndex - lineStart + 1,
        description,
        pattern: match[0],
        lineContent: lineContent.trim(),
        examples
      });
    }
  }
  
  return violations;
}

/**
 * Find all test files
 */
function findTestFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules
        if (entry !== 'node_modules') {
          traverse(fullPath);
        }
      } else if (extname(entry) === '.js' && entry.includes('test')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Main validation function
 */
function validate(testFiles = null) {
  const testSuiteRoot = join(__dirname, '..');
  const uiTestsDir = join(testSuiteRoot, 'tests', 'frontend-ui');
  
  const filesToCheck = testFiles || findTestFiles(uiTestsDir);
  
  if (filesToCheck.length === 0) {
    console.log('❌ No test files found to validate');
    process.exit(1);
  }
  
  console.log(`\n🔍 Validating ${filesToCheck.length} test file(s) for forbidden selectors...\n`);
  
  const allViolations = [];
  
  for (const file of filesToCheck) {
    const violations = validateFile(file);
    if (violations.length > 0) {
      allViolations.push(...violations);
    }
  }
  
  if (allViolations.length === 0) {
    console.log('✅ All test files use only data-testid selectors!');
    console.log('✅ Zero violations found.\n');
    return true;
  }
  
  // Group violations by file
  const violationsByFile = {};
  for (const violation of allViolations) {
    if (!violationsByFile[violation.file]) {
      violationsByFile[violation.file] = [];
    }
    violationsByFile[violation.file].push(violation);
  }
  
  // Print violations
  console.log(`❌ Found ${allViolations.length} violation(s) in ${Object.keys(violationsByFile).length} file(s):\n`);
  
  for (const [file, violations] of Object.entries(violationsByFile)) {
    const relativePath = file.replace(testSuiteRoot + '/', '');
    console.log(`\n📄 ${relativePath} (${violations.length} violation(s)):`);
    console.log('─'.repeat(80));
    
    // Group by description
    const byDescription = {};
    for (const violation of violations) {
      if (!byDescription[violation.description]) {
        byDescription[violation.description] = [];
      }
      byDescription[violation.description].push(violation);
    }
    
    for (const [description, descViolations] of Object.entries(byDescription)) {
      console.log(`\n  ❌ ${description}`);
      console.log(`     Examples: ${descViolations[0].examples.join(', ')}`);
      
      // Show first 5 violations of this type
      for (const violation of descViolations.slice(0, 5)) {
        console.log(`     Line ${violation.line}: ${violation.lineContent.substring(0, 70)}${violation.lineContent.length > 70 ? '...' : ''}`);
      }
      
      if (descViolations.length > 5) {
        console.log(`     ... and ${descViolations.length - 5} more`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n❌ Validation failed: ${allViolations.length} violation(s) found`);
  console.log('\n💡 Fix: Replace all forbidden selectors with data-testid selectors only.');
  console.log('   Example: page.locator(\'[data-testid="login-submit"]\')');
  console.log('   NOT: page.locator(\'button:has-text("Login")\')\n');
  
  return false;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testFiles = process.argv.slice(2);
  const isValid = validate(testFiles.length > 0 ? testFiles : null);
  process.exit(isValid ? 0 : 1);
}

export { validate, validateFile, FORBIDDEN_PATTERNS };

