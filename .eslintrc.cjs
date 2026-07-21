module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "coverage/",
    "*.config.js",
    "*.config.cjs",
    "*.config.ts",
  ],
  overrides: [
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
    {
      files: ["packages/web-app/**/*.{ts,tsx}"],
      env: {
        browser: true,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  ],
};
