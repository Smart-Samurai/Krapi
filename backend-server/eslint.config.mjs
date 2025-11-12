import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tsconfigRootDir = resolve(__dirname);

export default [
  eslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", "packages/**", "start.js", "scripts/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
      },
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: resolve(__dirname, "tsconfig.json"),
        ecmaVersion: 2020,
        sourceType: "module",
        tsconfigRootDir,
      },
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        require: "readonly",
        Buffer: "readonly",
        global: "readonly",
        Express: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error", // Strict no-any rule
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-var-requires": "error",
      
      // Import rules
      "import/no-unresolved": "off", // Disable path resolution checking for now
      "import/no-cycle": "warn",
      "import/no-unused-modules": "off",
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc" },
        },
      ],
      "import/no-duplicates": "error",
      "import/no-named-as-default": "warn",
      "import/no-named-as-default-member": "warn",
      
      // General rules
      "prefer-const": "error",
      "no-console": "off", // Allow console for backend logging
      "no-unused-vars": "off", // Using @typescript-eslint/no-unused-vars instead
      "no-useless-escape": "error",
      "no-undef": "off", // TypeScript handles this
      "no-var": "error",
      "no-warning-comments": "warn",
      "prefer-template": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
    },
  },
  {
    files: ["**/*.test.ts", "src/__tests__/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: resolve(__dirname, "tsconfig.json"),
        ecmaVersion: 2020,
        sourceType: "module",
        tsconfigRootDir,
      },
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        require: "readonly",
        Buffer: "readonly",
        global: "readonly",
        Express: "readonly",
        // Jest globals
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        beforeAll: "readonly",
        afterEach: "readonly",
        afterAll: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn", // Allow any in tests
      "prefer-const": "error",
      "no-console": "off",
      "no-unused-vars": "off",
      "no-useless-escape": "error",
      "no-undef": "off",
    },
  },
];
