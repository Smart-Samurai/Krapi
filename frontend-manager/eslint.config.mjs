import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**/*",
      "node_modules/**/*",
      "dist/**/*",
      "build/**/*",
      "coverage/**/*",
      "*.config.js",
      "*.config.ts",
      "next.config.*",
      "postcss.config.*",
      "tailwind.config.*",
    ],
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off", // Allow any types for now
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-var-requires": "off",

      // React-specific rules
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-key": "error",
      "react/no-unescaped-entities": "warn",

      // Import rules
      "import/no-unresolved": "error",
      "import/no-cycle": "warn",
      "import/no-unused-modules": "off",
      "import/order": "off",
      "import/no-named-as-default-member": "off",
      "import/no-duplicates": "off",
      "import/no-named-as-default": "off",

      // General rules
      "no-console": "off", // Allow console statements for debugging
      "prefer-const": "warn",
      "no-var": "error",
      "no-unused-vars": "off", // Disable in favor of TypeScript version
      "no-warning-comments": "off", // Allow TODO comments
    },
  },
];

export default eslintConfig;
