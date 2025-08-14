import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

export default [
  eslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
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
      "@typescript-eslint/no-explicit-any": "warn", // Warn about any usage
      "@typescript-eslint/no-unused-expressions": "off", // Requires type information
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",

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
      "no-console": "warn", // Warn about console statements in SDK
      "no-unused-vars": "off", // Using @typescript-eslint/no-unused-vars instead
      "no-useless-escape": "error",
      "no-undef": "off", // TypeScript handles this
      "no-var": "error",
      "no-warning-comments": "warn",
      "prefer-template": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "no-useless-return": "error",
      "no-useless-constructor": "error",
      "no-duplicate-imports": "error",
    },
  },
];
