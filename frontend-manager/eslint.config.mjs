import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
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
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error", // Strict no-any rule
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-var-requires": "error",

      // React-specific rules
      "react-hooks/exhaustive-deps": "error",
      "react/jsx-key": "error",
      "react/no-unescaped-entities": "warn",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error",
      "react/no-array-index-key": "error",
      "react/self-closing-comp": "error",
      "react/jsx-curly-brace-presence": ["error", { props: "never", children: "never" }],

      // Import rules
      "import/no-unresolved": [
        "error",
        {
          ignore: ["^@krapi/", "^@smartsamurai/"], // Allow workspace packages
        },
      ],
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
      "import/no-default-export": "off", // Allow default exports for Next.js pages

      // General rules
      "no-console": "warn", // Warn about console statements in production
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-vars": "off", // Disable in favor of TypeScript version
      "no-warning-comments": "warn", // Allow TODO comments
      "prefer-template": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "no-useless-return": "error",
      "no-useless-constructor": "error",
      "no-duplicate-imports": "error",
    },
  },
];

export default eslintConfig;
