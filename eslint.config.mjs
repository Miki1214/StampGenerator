import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.cjs",
      "**/*.config.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["packages/geometry-core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              message:
                "geometry-core must remain DOM-free; do not import React.",
            },
            {
              name: "react-dom",
              message:
                "geometry-core must remain DOM-free; do not import react-dom.",
            },
          ],
          patterns: [
            {
              group: ["react-dom/*", "react/*"],
              message:
                "geometry-core must remain DOM-free; do not import DOM packages.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "document",
          message: "geometry-core must remain DOM-free.",
        },
        {
          name: "window",
          message: "geometry-core must remain DOM-free.",
        },
        {
          name: "navigator",
          message: "geometry-core must remain DOM-free.",
        },
      ],
    },
  },
);
