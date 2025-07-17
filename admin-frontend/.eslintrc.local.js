/** @type {import('next').NextConfig} */

module.exports = {
  extends: ["next/core-web-vitals", "next/typescript"],
  rules: {
    // Relax some rules for development
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn",
    // Allow TODO comments
    "no-warning-comments": "off",
    // Allow console.log in development
    "no-console": "off",
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
};
